import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Expense from '../models/Expense.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import mongoose from 'mongoose';

const buildDateMatch = (startDate, endDate, field = 'saleDate') => {
  const match = {};
  if (startDate) match[field] = { ...match[field], $gte: new Date(startDate) };
  if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); match[field] = { ...match[field], $lte: e }; }
  return match;
};

// @desc Sales summary report
export const salesSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const businessId = req.user.businessId;
    const dateMatch = buildDateMatch(startDate, endDate);

    const summary = await Sale.aggregate([
      { $match: { businessId, status: 'completed', ...dateMatch } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$grandTotal' },
          salesCount: { $sum: 1 },
          totalTax: { $sum: '$taxTotal' },
          totalDiscount: { $sum: '$discountTotal' },
          avgSale: { $avg: '$grandTotal' },
        },
      },
    ]);

    // By payment method
    const byPayment = await Sale.aggregate([
      { $match: { businessId, status: 'completed', ...dateMatch } },
      { $unwind: '$payments' },
      { $group: { _id: '$payments.method', total: { $sum: '$payments.amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    // By day
    const daily = await Sale.aggregate([
      { $match: { businessId, status: 'completed', ...dateMatch } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } }, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Returns and voids
    const returns = await Sale.countDocuments({ businessId, status: 'returned', ...dateMatch });
    const voids = await Sale.countDocuments({ businessId, status: 'voided', ...dateMatch });

    res.json({ success: true, data: { summary: summary[0] || {}, byPayment, daily, returns, voids } });
  } catch (error) { next(error); }
};

// @desc Sales by product
export const salesByProduct = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const businessId = req.user.businessId;
    const dateMatch = buildDateMatch(startDate, endDate);

    const data = await Sale.aggregate([
      { $match: { businessId, status: 'completed', ...dateMatch } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          totalQty: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.lineTotal' },
          totalCost: { $sum: { $multiply: ['$items.costPrice', '$items.quantity'] } },
        },
      },
      { $addFields: { profit: { $subtract: ['$totalRevenue', '$totalCost'] } } },
      { $sort: { totalRevenue: -1 } },
    ]);

    res.json({ success: true, data });
  } catch (error) { next(error); }
};

// @desc Sales by category
export const salesByCategory = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const businessId = req.user.businessId;
    const dateMatch = buildDateMatch(startDate, endDate);

    const data = await Sale.aggregate([
      { $match: { businessId, status: 'completed', ...dateMatch } },
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.productId', foreignField: '_id', as: 'product' } },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'categories', localField: 'product.category', foreignField: '_id', as: 'cat' } },
      { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$cat.name', total: { $sum: '$items.lineTotal' }, count: { $sum: '$items.quantity' } } },
      { $sort: { total: -1 } },
    ]);

    res.json({ success: true, data });
  } catch (error) { next(error); }
};

// @desc Sales by cashier
export const salesByCashier = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const dateMatch = buildDateMatch(startDate, endDate);

    const data = await Sale.aggregate([
      { $match: { businessId: req.user.businessId, status: 'completed', ...dateMatch } },
      {
        $group: {
          _id: '$cashierId', cashierName: { $first: '$cashierName' },
          totalSales: { $sum: '$grandTotal' }, salesCount: { $sum: 1 },
          avgSale: { $avg: '$grandTotal' },
        },
      },
      { $sort: { totalSales: -1 } },
    ]);

    res.json({ success: true, data });
  } catch (error) { next(error); }
};

// @desc Sales by customer
export const salesByCustomer = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const dateMatch = buildDateMatch(startDate, endDate);

    const data = await Sale.aggregate([
      { $match: { businessId: req.user.businessId, status: 'completed', ...dateMatch } },
      {
        $group: {
          _id: '$customerId', customerName: { $first: '$customerName' },
          totalSpent: { $sum: '$grandTotal' }, visits: { $sum: 1 },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 50 },
    ]);

    res.json({ success: true, data });
  } catch (error) { next(error); }
};

// @desc Sales by hour
export const salesByHour = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const dateMatch = buildDateMatch(startDate, endDate);

    const data = await Sale.aggregate([
      { $match: { businessId: req.user.businessId, status: 'completed', ...dateMatch } },
      { $group: { _id: { $hour: '$saleDate' }, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({ success: true, data: data.map(d => ({ hour: d._id, total: d.total, count: d.count })) });
  } catch (error) { next(error); }
};

// @desc Profit & Loss report
export const profitLoss = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const businessId = req.user.businessId;
    const dateMatch = buildDateMatch(startDate, endDate);

    // Revenue
    const revenue = await Sale.aggregate([
      { $match: { businessId, status: 'completed', ...dateMatch } },
      { $group: { _id: null, total: { $sum: '$grandTotal' }, tax: { $sum: '$taxTotal' } } },
    ]);

    // COGS
    const cogs = await Sale.aggregate([
      { $match: { businessId, status: 'completed', ...dateMatch } },
      { $unwind: '$items' },
      { $group: { _id: null, total: { $sum: { $multiply: ['$items.costPrice', '$items.quantity'] } } } },
    ]);

    // Expenses
    const expenseDateMatch = buildDateMatch(startDate, endDate, 'date');
    const expenses = await Expense.aggregate([
      { $match: { businessId, ...expenseDateMatch } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]);
    const totalExpenses = expenses.reduce((s, e) => s + e.total, 0);

    // Returns
    const returns = await Sale.aggregate([
      { $match: { businessId, status: 'returned', ...dateMatch } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } },
    ]);

    const totalRevenue = (revenue[0]?.total || 0) - (returns[0]?.total || 0);
    const totalCOGS = cogs[0]?.total || 0;
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses;
    const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0;
    const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

    // Monthly breakdown
    const monthly = await Sale.aggregate([
      { $match: { businessId, status: 'completed', ...dateMatch } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$saleDate' } },
          revenue: { $sum: '$grandTotal' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: {
        totalRevenue, totalCOGS, grossProfit, grossMargin, totalExpenses,
        netProfit, netMargin, expenseBreakdown: expenses,
        returns: returns[0]?.total || 0, monthly,
      },
    });
  } catch (error) { next(error); }
};

// @desc Inventory report
export const inventoryReport = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;

    const products = await Product.find({ businessId, isActive: true })
      .populate('category', 'name')
      .select('productName sku category costPrice salePrice currentStock lowStockThreshold unit isStockTracked')
      .sort({ productName: 1 });

    const totalItems = products.length;
    const totalStock = products.reduce((s, p) => s + p.currentStock, 0);
    const totalValueCost = products.reduce((s, p) => s + (p.currentStock * p.costPrice), 0);
    const totalValueSale = products.reduce((s, p) => s + (p.currentStock * p.salePrice), 0);
    const lowStockItems = products.filter(p => p.isStockTracked && p.currentStock <= p.lowStockThreshold);
    const outOfStock = products.filter(p => p.isStockTracked && p.currentStock <= 0);

    res.json({
      success: true,
      data: {
        products, totalItems, totalStock, totalValueCost, totalValueSale,
        potentialProfit: totalValueSale - totalValueCost,
        lowStockCount: lowStockItems.length, outOfStockCount: outOfStock.length,
      },
    });
  } catch (error) { next(error); }
};

// @desc Tax report
export const taxReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const dateMatch = buildDateMatch(startDate, endDate);

    const data = await Sale.aggregate([
      { $match: { businessId: req.user.businessId, status: 'completed', ...dateMatch } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.tax',
          taxRate: { $first: '$items.tax' },
          totalTaxable: { $sum: '$items.lineTotal' },
          totalTax: { $sum: '$items.taxAmount' },
          itemCount: { $sum: 1 },
        },
      },
      { $sort: { taxRate: -1 } },
    ]);

    const totalTaxCollected = data.reduce((s, d) => s + d.totalTax, 0);
    res.json({ success: true, data: { breakdown: data, totalTaxCollected } });
  } catch (error) { next(error); }
};

// @desc Accounts receivable report
export const accountsReceivable = async (req, res, next) => {
  try {
    const customers = await Customer.find({
      businessId: req.user.businessId, currentBalance: { $gt: 0 }, isActive: true,
    }).sort({ currentBalance: -1 }).select('customerName phone currentBalance creditLimit lastPurchaseDate');

    const totalReceivable = customers.reduce((s, c) => s + c.currentBalance, 0);
    res.json({ success: true, data: { customers, totalReceivable, count: customers.length } });
  } catch (error) { next(error); }
};

// @desc Accounts payable report
export const accountsPayable = async (req, res, next) => {
  try {
    const Supplier = (await import('../models/Supplier.js')).default;
    const suppliers = await Supplier.find({
      businessId: req.user.businessId, totalAmountDue: { $gt: 0 }, status: 'active',
    }).sort({ totalAmountDue: -1 }).select('supplierName companyName phone totalAmountDue');

    const totalPayable = suppliers.reduce((s, s2) => s + s2.totalAmountDue, 0);
    res.json({ success: true, data: { suppliers, totalPayable, count: suppliers.length } });
  } catch (error) { next(error); }
};

// @desc Purchase summary report
export const purchaseSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const dateMatch = buildDateMatch(startDate, endDate, 'orderDate');

    const data = await PurchaseOrder.aggregate([
      { $match: { businessId: req.user.businessId, status: { $ne: 'cancelled' }, ...dateMatch } },
      {
        $group: {
          _id: null, totalPurchases: { $sum: '$grandTotal' }, orderCount: { $sum: 1 },
          totalPaid: { $sum: '$amountPaid' }, totalDue: { $sum: '$balanceDue' },
        },
      },
    ]);

    const bySupplier = await PurchaseOrder.aggregate([
      { $match: { businessId: req.user.businessId, status: { $ne: 'cancelled' }, ...dateMatch } },
      { $lookup: { from: 'suppliers', localField: 'supplierId', foreignField: '_id', as: 'supplier' } },
      { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$supplierId', supplierName: { $first: '$supplier.supplierName' }, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    res.json({ success: true, data: { summary: data[0] || {}, bySupplier } });
  } catch (error) { next(error); }
};
