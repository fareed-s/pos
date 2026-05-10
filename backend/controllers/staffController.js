import User from '../models/User.js';
import { logActivity } from '../middleware/activityLog.js';
import { DEFAULT_PERMISSIONS, PERMISSION_MODULES } from '../config/constants.js';

const VALID_MODULES = new Set(PERMISSION_MODULES.map(m => m.key));

// Sanitize permissions input — strip unknown modules and coerce to booleans.
const sanitizePermissions = (input) => {
  if (!input || typeof input !== 'object') return null;
  const out = {};
  for (const [key, val] of Object.entries(input)) {
    if (!VALID_MODULES.has(key)) continue;
    out[key] = {
      add: !!val?.add,
      edit: !!val?.edit,
      delete: !!val?.delete,
    };
  }
  return out;
};

// @desc Get all staff
export const getStaff = async (req, res, next) => {
  try {
    const staff = await User.find({
      businessId: req.user.businessId,
      role: { $in: ['manager', 'cashier'] },
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: staff });
  } catch (error) {
    next(error);
  }
};

// @desc Create staff
export const createStaff = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, maxDiscountPercent, permissions, isActive } = req.body;
    const businessId = req.user.businessId;

    const existing = await User.findOne({ email: email.toLowerCase(), businessId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already exists in this business' });
    }

    const cleanPerms = sanitizePermissions(permissions) || DEFAULT_PERMISSIONS[role] || {};

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role,
      phone,
      businessId,
      maxDiscountPercent: maxDiscountPercent ?? (role === 'cashier' ? 10 : 50),
      isActive: isActive !== undefined ? isActive : true,
      permissions: cleanPerms,
    });

    logActivity(req.user._id, req.user.name, 'create', 'staff', businessId, user._id, `Created ${role}: ${name}`);

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc Update staff
export const updateStaff = async (req, res, next) => {
  try {
    const { name, email, role, phone, isActive, maxDiscountPercent, permissions } = req.body;

    const update = {};
    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = String(email).toLowerCase();
    if (role !== undefined) update.role = role;
    if (phone !== undefined) update.phone = phone;
    if (isActive !== undefined) update.isActive = isActive;
    if (maxDiscountPercent !== undefined) update.maxDiscountPercent = maxDiscountPercent;
    if (permissions !== undefined) {
      const cleanPerms = sanitizePermissions(permissions);
      if (cleanPerms) update.permissions = cleanPerms;
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, businessId: req.user.businessId, role: { $in: ['manager', 'cashier'] } },
      update,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    logActivity(req.user._id, req.user.name, 'update', 'staff', req.user.businessId, user._id, `Updated ${user.role}: ${user.name}`);

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc Reset staff password
export const resetStaffPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const user = await User.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
      role: { $in: ['manager', 'cashier'] },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc Delete staff (deactivate)
export const deleteStaff = async (req, res, next) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, businessId: req.user.businessId, role: { $in: ['manager', 'cashier'] } },
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    res.json({ success: true, message: 'Staff deactivated' });
  } catch (error) {
    next(error);
  }
};

// @desc Expose the master list of modules so the frontend renders a stable matrix.
// @route GET /api/staff/modules
export const getPermissionModules = async (_req, res) => {
  res.json({
    success: true,
    data: {
      modules: PERMISSION_MODULES,
      defaults: DEFAULT_PERMISSIONS,
    },
  });
};
