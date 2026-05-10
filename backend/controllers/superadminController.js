import Business from '../models/Business.js';
import User from '../models/User.js';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import { Settings, Subscription, Location } from '../models/OtherModels.js';
import { ExpenseCategory } from '../models/Expense.js';
import { PLAN_LIMITS, EXPENSE_CATEGORIES_DEFAULT, expiryAlertDays } from '../config/constants.js';
import { generatePassword } from '../utils/helpers.js';
import { logActivity } from '../middleware/activityLog.js';

// ───────────────────────────── helpers ─────────────────────────────

const computeEndDate = (durationDays) => {
  const days = Math.max(1, Number(durationDays) || 7);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  end.setDate(end.getDate() + days);
  return end;
};

const planLimitsFor = (plan, durationDays) => {
  const base = PLAN_LIMITS[plan] || PLAN_LIMITS.custom;
  return {
    durationDays: Number(durationDays) || base.durationDays,
    maxProducts: base.maxProducts,
    maxStaff: base.maxStaff,
    maxLocations: base.maxLocations,
  };
};

// ───────────────────────────── stats ─────────────────────────────

// @desc Get global stats
// @route GET /api/superadmin/stats
export const getGlobalStats = async (req, res, next) => {
  try {
    const totalBusinesses = await Business.countDocuments();
    const activeBusinesses = await Business.countDocuments({ isApproved: true, isActive: true });
    const pendingApprovals = await Business.countDocuments({ isApproved: false, isActive: true });
    const totalUsers = await User.countDocuments({ role: { $ne: 'superadmin' } });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySales = await Sale.aggregate([
      { $match: { saleDate: { $gte: today }, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
    ]);

    const totalProducts = await Product.countDocuments();

    const planStats = await Subscription.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$plan', count: { $sum: 1 } } },
    ]);

    const now = new Date();
    const expiredCount = await Subscription.countDocuments({ endDate: { $lt: now } });

    res.json({
      success: true,
      data: {
        totalBusinesses,
        activeBusinesses,
        pendingApprovals,
        totalUsers,
        totalProducts,
        expiredCount,
        todaySales: todaySales[0] || { total: 0, count: 0 },
        planStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ───────────────────────────── list / get ─────────────────────────────

// @desc Get all businesses
// @route GET /api/superadmin/businesses
export const getAllBusinesses = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const query = {};

    if (status === 'pending') query.isApproved = false;
    else if (status === 'approved') query.isApproved = true;
    else if (status === 'inactive') query.isActive = false;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { ownerName: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Business.countDocuments(query);
    const businesses = await Business.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const businessIds = businesses.map(b => b._id);
    const subs = await Subscription.find({ businessId: { $in: businessIds } });
    const subMap = {};
    subs.forEach(s => { subMap[s.businessId.toString()] = s.toJSON(); });

    const adminUsers = await User.find({ businessId: { $in: businessIds }, role: 'businessadmin' })
      .select('name email phone avatar businessId');
    const adminMap = {};
    adminUsers.forEach(u => { adminMap[u.businessId.toString()] = u; });

    const enriched = businesses.map(b => ({
      ...b.toObject(),
      subscription: subMap[b._id.toString()] || null,
      admin: adminMap[b._id.toString()] || null,
    }));

    res.json({
      success: true,
      data: enriched,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// ───────────────────────────── create / update / delete ─────────────────────────────

// @desc Create a business + admin user in one call (super admin only).
// @route POST /api/superadmin/businesses
export const createBusiness = async (req, res, next) => {
  try {
    const {
      // store / owner
      businessName, ownerName, email, phone, businessType, address,
      // credentials
      password, autoGeneratePassword,
      // package
      plan = 'trial',
      durationDays,
      price = 0,
      currency = 'PKR',
      notes,
    } = req.body;

    if (!businessName || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Business name, email and phone are required' });
    }
    if (!PLAN_LIMITS[plan]) {
      return res.status(400).json({ success: false, message: `Invalid plan: ${plan}` });
    }

    const lowerEmail = String(email).trim().toLowerCase();

    const existsBusiness = await Business.findOne({ email: lowerEmail });
    if (existsBusiness) {
      return res.status(400).json({ success: false, message: 'A business with this email already exists' });
    }
    const existsUser = await User.findOne({ email: lowerEmail });
    if (existsUser) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists' });
    }

    const finalPassword = autoGeneratePassword || !password ? generatePassword(12) : String(password);
    if (finalPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const limits = planLimitsFor(plan, durationDays);
    const endDate = computeEndDate(limits.durationDays);

    // 1. Business (pre-approved — super admin creates these directly)
    const business = await Business.create({
      name: businessName,
      email: lowerEmail,
      phone,
      ownerName: ownerName || businessName,
      businessType: businessType || 'retail',
      address: address || {},
      isApproved: true,
      isActive: true,
      approvedAt: new Date(),
      approvedBy: req.user._id,
    });

    // 2. Admin user
    const user = await User.create({
      name: ownerName || businessName,
      email: lowerEmail,
      password: finalPassword,
      role: 'businessadmin',
      businessId: business._id,
      phone,
    });

    // 3. Settings
    await Settings.create({ businessId: business._id });

    // 4. Subscription with custom price + duration
    const subscription = await Subscription.create({
      businessId: business._id,
      plan,
      price: Number(price) || 0,
      currency,
      durationDays: limits.durationDays,
      endDate,
      maxProducts: limits.maxProducts,
      maxStaff: limits.maxStaff,
      maxLocations: limits.maxLocations,
      notes: notes || '',
      isActive: true,
    });

    // 5. Default location + expense categories
    await Location.create({ name: 'Main Store', businessId: business._id, isDefault: true });
    await ExpenseCategory.insertMany(
      EXPENSE_CATEGORIES_DEFAULT.map(name => ({ name, isDefault: true, businessId: business._id }))
    );

    res.status(201).json({
      success: true,
      message: 'Business created',
      data: {
        business,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone },
        subscription: subscription.toJSON(),
        // Plain-text password is returned exactly once for the super admin to copy/share.
        credentials: {
          username: user.email,
          password: finalPassword,
          plan,
          durationDays: limits.durationDays,
          endDate,
          price: Number(price) || 0,
          currency,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Update business profile fields
// @route PUT /api/superadmin/businesses/:id
export const updateBusiness = async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'ownerName', 'businessType', 'address', 'website'];
    const update = {};
    for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

    const business = await Business.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });

    // Mirror changes onto the linked admin user where it makes sense
    if (req.body.ownerName || req.body.phone) {
      await User.updateOne(
        { businessId: business._id, role: 'businessadmin' },
        { ...(req.body.ownerName ? { name: req.body.ownerName } : {}), ...(req.body.phone ? { phone: req.body.phone } : {}) }
      );
    }

    res.json({ success: true, data: business });
  } catch (error) {
    next(error);
  }
};

// @desc Hard-delete a business and every artifact tied to it.
// @route DELETE /api/superadmin/businesses/:id
export const deleteBusiness = async (req, res, next) => {
  try {
    const id = req.params.id;
    const business = await Business.findById(id);
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });

    // Wipe everything tenant-scoped. We deliberately call remove on the well-known models,
    // additional cleanup is a nice-to-have but not blocking the SaaS contract.
    await Promise.all([
      User.deleteMany({ businessId: id }),
      Settings.deleteMany({ businessId: id }),
      Subscription.deleteMany({ businessId: id }),
      Location.deleteMany({ businessId: id }),
      ExpenseCategory.deleteMany({ businessId: id }),
    ]);
    await business.deleteOne();

    res.json({ success: true, message: 'Business deleted' });
  } catch (error) {
    next(error);
  }
};

// ───────────────────────────── status toggles ─────────────────────────────

// @desc Approve business
export const approveBusiness = async (req, res, next) => {
  try {
    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { isApproved: true, approvedAt: new Date(), approvedBy: req.user._id, isActive: true },
      { new: true }
    );
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    res.json({ success: true, message: 'Business approved', data: business });
  } catch (error) { next(error); }
};

// @desc Reject business
export const rejectBusiness = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { isActive: false, rejectionReason: reason || 'Rejected by admin' },
      { new: true }
    );
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    res.json({ success: true, message: 'Business rejected', data: business });
  } catch (error) { next(error); }
};

// @desc Toggle business active status (activate / suspend)
export const toggleBusiness = async (req, res, next) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    business.isActive = !business.isActive;
    await business.save();
    res.json({ success: true, data: business, message: business.isActive ? 'Business activated' : 'Business suspended' });
  } catch (error) { next(error); }
};

// ───────────────────────────── subscription / package ─────────────────────────────

// @desc Assign / change package with custom price + duration
// @route PUT /api/superadmin/businesses/:id/plan
export const updatePlan = async (req, res, next) => {
  try {
    const { plan, durationDays, price, currency, notes } = req.body;
    if (!PLAN_LIMITS[plan]) {
      return res.status(400).json({ success: false, message: `Invalid plan: ${plan}` });
    }

    const limits = planLimitsFor(plan, durationDays);
    const endDate = computeEndDate(limits.durationDays);

    const subscription = await Subscription.findOneAndUpdate(
      { businessId: req.params.id },
      {
        plan,
        price: Number(price) || 0,
        currency: currency || 'PKR',
        durationDays: limits.durationDays,
        startDate: new Date(),
        endDate,
        maxProducts: limits.maxProducts,
        maxStaff: limits.maxStaff,
        maxLocations: limits.maxLocations,
        isActive: true,
        ...(notes !== undefined ? { notes } : {}),
      },
      { new: true, upsert: true }
    );

    res.json({ success: true, message: 'Plan updated', data: subscription.toJSON() });
  } catch (error) { next(error); }
};

// @desc Upcoming expiries (alerts page)
// @route GET /api/superadmin/expiries
export const getUpcomingExpiries = async (req, res, next) => {
  try {
    const now = new Date();
    const subs = await Subscription.find({}).sort({ endDate: 1 });

    const businessIds = subs.map(s => s.businessId);
    const businesses = await Business.find({ _id: { $in: businessIds } }).select('name email phone ownerName');
    const bMap = {};
    businesses.forEach(b => { bMap[b._id.toString()] = b; });

    const expiringSoon = [];
    const expired = [];

    for (const s of subs) {
      const business = bMap[s.businessId.toString()];
      if (!business) continue;
      const ms = s.endDate.getTime() - now.getTime();
      const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
      const window = expiryAlertDays(s.plan);
      const entry = {
        business: { _id: business._id, name: business.name, email: business.email, phone: business.phone, ownerName: business.ownerName },
        subscription: s.toJSON(),
        daysRemaining: days,
      };
      if (days < 0) expired.push(entry);
      else if (days <= window) expiringSoon.push(entry);
    }

    res.json({ success: true, data: { expiringSoon, expired } });
  } catch (error) { next(error); }
};

// ───────────────────────────── password reset ─────────────────────────────

// @desc Reset admin password (auto-generated by default)
// @route PUT /api/superadmin/businesses/:id/reset-password
export const resetAdminPassword = async (req, res, next) => {
  try {
    const { newPassword, autoGenerate = true } = req.body;
    const admin = await User.findOne({ businessId: req.params.id, role: 'businessadmin' }).select('+password');
    if (!admin) return res.status(404).json({ success: false, message: 'Business admin not found' });

    const finalPassword = autoGenerate || !newPassword ? generatePassword(12) : String(newPassword);
    if (finalPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    admin.password = finalPassword;
    await admin.save();

    const business = await Business.findById(req.params.id);
    res.json({
      success: true,
      message: 'Password reset',
      data: {
        business: business ? { _id: business._id, name: business.name } : null,
        // Plain-text password is returned exactly once so the super admin can share it.
        credentials: {
          username: admin.email,
          password: finalPassword,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
