import Expense, { ExpenseCategory } from '../models/Expense.js';
import { logActivity } from '../middleware/activityLog.js';

// @desc Get all expenses
export const getExpenses = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, startDate, endDate, paymentMethod } = req.query;
    const query = { businessId: req.user.businessId };
    if (category) query.category = category;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); query.date.$lte = e; }
    }

    const total = await Expense.countDocuments(query);
    const expenses = await Expense.find(query)
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totals = await Expense.aggregate([
      { $match: query },
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
    ]);

    const byCategory = await Expense.aggregate([
      { $match: query },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    res.json({
      success: true, data: expenses,
      totals: { totalAmount: totals[0]?.totalAmount || 0, byCategory },
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) { next(error); }
};

// @desc Create expense
export const createExpense = async (req, res, next) => {
  try {
    const data = { ...req.body, createdBy: req.user._id, businessId: req.user.businessId };
    const expense = await Expense.create(data);
    logActivity(req.user._id, req.user.name, 'create', 'expenses', req.user.businessId, expense._id, `Expense: ${expense.category} - ${expense.amount}`);
    res.status(201).json({ success: true, data: expense });
  } catch (error) { next(error); }
};

// @desc Update expense
export const updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, businessId: req.user.businessId }, req.body, { new: true, runValidators: true }
    );
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, data: expense });
  } catch (error) { next(error); }
};

// @desc Delete expense
export const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, businessId: req.user.businessId });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) { next(error); }
};

// @desc Get expense categories
export const getExpenseCategories = async (req, res, next) => {
  try {
    const categories = await ExpenseCategory.find({ businessId: req.user.businessId }).sort({ name: 1 });
    res.json({ success: true, data: categories });
  } catch (error) { next(error); }
};

// @desc Create expense category
export const createExpenseCategory = async (req, res, next) => {
  try {
    const cat = await ExpenseCategory.create({ ...req.body, businessId: req.user.businessId });
    res.status(201).json({ success: true, data: cat });
  } catch (error) { next(error); }
};
