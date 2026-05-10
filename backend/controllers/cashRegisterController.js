import CashRegister, { CashTransaction } from '../models/CashRegister.js';
import Sale from '../models/Sale.js';
import { logActivity } from '../middleware/activityLog.js';

// @desc Open cash register
export const openRegister = async (req, res, next) => {
  try {
    const { openingBalance } = req.body;
    const businessId = req.user.businessId;

    const existing = await CashRegister.findOne({ businessId, cashierId: req.user._id, status: 'open' });
    if (existing) return res.status(400).json({ success: false, message: 'Register already open. Close it first.' });

    const register = await CashRegister.create({
      openingBalance: openingBalance || 0,
      cashierId: req.user._id,
      cashierName: req.user.name,
      businessId,
    });

    logActivity(req.user._id, req.user.name, 'open_register', 'cash_register', businessId, register._id, `Opening balance: ${openingBalance}`);
    res.status(201).json({ success: true, data: register });
  } catch (error) { next(error); }
};

// @desc Get current open register
export const getCurrentRegister = async (req, res, next) => {
  try {
    const register = await CashRegister.findOne({ businessId: req.user.businessId, cashierId: req.user._id, status: 'open' });
    if (!register) return res.json({ success: true, data: null });

    // Get transactions for this register
    const transactions = await CashTransaction.find({ registerId: register._id }).sort({ createdAt: -1 });

    // Cash sales since this register was opened (not the whole calendar day —
    // a previous closed register on the same day must not be double-counted)
    const cashSales = await Sale.aggregate([
      {
        $match: {
          businessId: register.businessId, cashierId: req.user._id,
          saleDate: { $gte: register.createdAt }, status: 'completed',
        }
      },
      { $unwind: '$payments' },
      { $match: { 'payments.method': 'cash' } },
      { $group: { _id: null, total: { $sum: '$payments.amount' } } },
    ]);

    const totalCashSales = cashSales[0]?.total || 0;
    const totalCashIn = transactions.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0);
    const totalCashOut = transactions.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0);
    const expectedBalance = register.openingBalance + totalCashSales + totalCashIn - totalCashOut;

    res.json({
      success: true,
      data: {
        register, transactions, totalCashSales, totalCashIn, totalCashOut, expectedBalance,
      },
    });
  } catch (error) { next(error); }
};

// @desc Record cash in/out transaction
export const recordTransaction = async (req, res, next) => {
  try {
    const { type, reason } = req.body;
    const amount = Number(req.body.amount);

    if (!['in', 'out'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be "in" or "out"' });
    }
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
    }

    const register = await CashRegister.findOne({ businessId: req.user.businessId, cashierId: req.user._id, status: 'open' });
    if (!register) return res.status(400).json({ success: false, message: 'No open register. Open register first.' });

    const transaction = await CashTransaction.create({
      registerId: register._id, type, amount, reason,
      performedBy: req.user._id, performedByName: req.user.name,
      businessId: req.user.businessId,
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (error) { next(error); }
};

// @desc Close cash register
export const closeRegister = async (req, res, next) => {
  try {
    const { closingBalance, notes } = req.body;
    const businessId = req.user.businessId;

    const register = await CashRegister.findOne({ businessId, cashierId: req.user._id, status: 'open' });
    if (!register) return res.status(400).json({ success: false, message: 'No open register' });

    const transactions = await CashTransaction.find({ registerId: register._id });

    const cashSales = await Sale.aggregate([
      { $match: { businessId, cashierId: req.user._id, saleDate: { $gte: register.createdAt }, status: 'completed' } },
      { $unwind: '$payments' },
      { $match: { 'payments.method': 'cash' } },
      { $group: { _id: null, total: { $sum: '$payments.amount' } } },
    ]);

    const totalCashSales = cashSales[0]?.total || 0;
    const totalCashIn = transactions.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0);
    const totalCashOut = transactions.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0);
    const expectedBalance = register.openingBalance + totalCashSales + totalCashIn - totalCashOut;

    register.closingBalance = closingBalance;
    register.expectedBalance = expectedBalance;
    register.difference = closingBalance - expectedBalance;
    register.totalSales = totalCashSales;
    register.totalCashIn = totalCashIn;
    register.totalCashOut = totalCashOut;
    register.status = 'closed';
    register.closedAt = new Date();
    register.notes = notes || '';
    await register.save();

    logActivity(req.user._id, req.user.name, 'close_register', 'cash_register', businessId, register._id,
      `Closing: ${closingBalance}, Expected: ${expectedBalance}, Diff: ${register.difference}`);

    res.json({ success: true, data: register });
  } catch (error) { next(error); }
};

// @desc Get register history
export const getRegisterHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    const query = { businessId: req.user.businessId, status: 'closed' };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); query.date.$lte = e; }
    }

    const total = await CashRegister.countDocuments(query);
    const registers = await CashRegister.find(query)
      .sort({ closedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, data: registers, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};
