import Wastage from '../models/Wastage.js';
import ProductionLog from '../models/ProductionLog.js';
import CashHandover from '../models/CashHandover.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Sale from '../models/Sale.js';
import Expense from '../models/Expense.js';
import StockAdjustment from '../models/StockAdjustment.js';
import { CustomerPayment } from '../models/OtherModels.js';
import { logActivity } from '../middleware/activityLog.js';

// ===================== WASTAGE =====================

export const getWastages = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, reason } = req.query;
    const query = { businessId: req.user.businessId };
    if (reason) query.reason = reason;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59, 999); query.date.$lte = e; }
    }

    const total = await Wastage.countDocuments(query);
    const wastages = await Wastage.find(query).sort({ date: -1 }).skip((page - 1) * limit).limit(parseInt(limit));

    const totals = await Wastage.aggregate([
      { $match: query },
      { $group: { _id: null, totalLoss: { $sum: '$totalLoss' }, totalItems: { $sum: '$quantity' } } },
    ]);

    const byReason = await Wastage.aggregate([
      { $match: query },
      { $group: { _id: '$reason', loss: { $sum: '$totalLoss' }, count: { $sum: '$quantity' } } },
      { $sort: { loss: -1 } },
    ]);

    res.json({
      success: true, data: wastages,
      totals: { ...(totals[0] || { totalLoss: 0, totalItems: 0 }), byReason },
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) { next(error); }
};

export const createWastage = async (req, res, next) => {
  try {
    const { productId, quantity, reason, notes, date } = req.body;
    const businessId = req.user.businessId;

    const product = await Product.findOne({ _id: productId, businessId });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const totalLoss = product.costPrice * quantity;

    // Deduct stock
    if (product.isStockTracked) {
      const prevStock = product.currentStock;
      product.currentStock = Math.max(0, product.currentStock - quantity);
      await product.save();

      await StockAdjustment.create({
        productId: product._id, productName: product.productName,
        type: 'subtract', quantity, previousStock: prevStock, newStock: product.currentStock,
        reason: 'damaged', notes: `Wastage: ${reason} - ${notes || ''}`,
        adjustedBy: req.user._id, adjustedByName: req.user.name, businessId,
      });
    }

    const wastage = await Wastage.create({
      productId, productName: product.productName, quantity, reason,
      costPrice: product.costPrice, totalLoss, notes: notes || '',
      date: date || new Date(),
      recordedBy: req.user._id, recordedByName: req.user.name, businessId,
    });

    logActivity(req.user._id, req.user.name, 'create', 'wastage', businessId, wastage._id, `Wastage: ${product.productName} x${quantity} - ${reason}`);
    res.status(201).json({ success: true, data: wastage });
  } catch (error) { next(error); }
};

// ===================== PRODUCTION LOG =====================

export const getProductionLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    const query = { businessId: req.user.businessId };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59, 999); query.date.$lte = e; }
    }

    const total = await ProductionLog.countDocuments(query);
    const logs = await ProductionLog.find(query).sort({ date: -1 }).skip((page - 1) * limit).limit(parseInt(limit));

    res.json({ success: true, data: logs, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

export const createProductionLog = async (req, res, next) => {
  try {
    const { items, notes, date } = req.body;
    const businessId = req.user.businessId;

    if (!items || items.length === 0) return res.status(400).json({ success: false, message: 'Add items' });

    let totalItemsProduced = 0;
    let totalProductionCost = 0;
    const logItems = [];

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, businessId });
      if (!product) continue;

      const costPerUnit = item.costPerUnit || product.costPrice;
      const totalCost = costPerUnit * item.quantity;
      totalItemsProduced += item.quantity;
      totalProductionCost += totalCost;

      logItems.push({
        productId: product._id, productName: product.productName,
        quantity: item.quantity, costPerUnit, totalCost,
      });

      // Add to stock
      if (product.isStockTracked) {
        const prevStock = product.currentStock;
        product.currentStock += item.quantity;
        await product.save();

        await StockAdjustment.create({
          productId: product._id, productName: product.productName,
          type: 'add', quantity: item.quantity,
          previousStock: prevStock, newStock: product.currentStock,
          reason: 'other', notes: `Production: ${item.quantity} units produced`,
          adjustedBy: req.user._id, adjustedByName: req.user.name, businessId,
        });
      }
    }

    const log = await ProductionLog.create({
      date: date || new Date(), items: logItems,
      totalItemsProduced, totalProductionCost, notes: notes || '',
      createdBy: req.user._id, createdByName: req.user.name, businessId,
    });

    logActivity(req.user._id, req.user.name, 'create', 'production', businessId, log._id, `Production: ${totalItemsProduced} items, Cost: ${totalProductionCost}`);
    res.status(201).json({ success: true, data: log });
  } catch (error) { next(error); }
};

// ===================== CASH HANDOVER =====================

export const getCashHandovers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    const query = { businessId: req.user.businessId };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59, 999); query.date.$lte = e; }
    }

    const total = await CashHandover.countDocuments(query);
    const handovers = await CashHandover.find(query).sort({ date: -1 }).skip((page - 1) * limit).limit(parseInt(limit));

    const totalHandedOver = await CashHandover.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.json({
      success: true, data: handovers,
      totalHandedOver: totalHandedOver[0]?.total || 0,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) { next(error); }
};

export const createCashHandover = async (req, res, next) => {
  try {
    const { amount, receivedBy, notes, denomination } = req.body;

    const handover = await CashHandover.create({
      amount, handedBy: req.user._id, handedByName: req.user.name,
      receivedBy: receivedBy || 'Owner', notes: notes || '',
      denomination: denomination || {},
      businessId: req.user.businessId,
    });

    logActivity(req.user._id, req.user.name, 'create', 'cash_handover', req.user.businessId, handover._id, `Cash handover: Rs. ${amount} to ${receivedBy || 'Owner'}`);
    res.status(201).json({ success: true, data: handover });
  } catch (error) { next(error); }
};

// ===================== BULK PRICE UPDATE =====================

export const bulkUpdatePrices = async (req, res, next) => {
  try {
    const { updates } = req.body; // [{ productId, costPrice, salePrice, wholesalePrice }]
    const businessId = req.user.businessId;

    if (!updates || updates.length === 0) return res.status(400).json({ success: false, message: 'No updates' });

    let updated = 0;
    for (const u of updates) {
      const update = {};
      if (u.costPrice !== undefined && u.costPrice !== null) update.costPrice = u.costPrice;
      if (u.salePrice !== undefined && u.salePrice !== null) update.salePrice = u.salePrice;
      if (u.wholesalePrice !== undefined && u.wholesalePrice !== null) update.wholesalePrice = u.wholesalePrice;

      if (Object.keys(update).length > 0) {
        if (update.costPrice !== undefined && update.salePrice !== undefined) {
          update.profitMargin = update.salePrice - update.costPrice;
        }
        await Product.findOneAndUpdate({ _id: u.productId, businessId }, update);
        updated++;
      }
    }

    logActivity(req.user._id, req.user.name, 'bulk_update', 'products', businessId, null, `Bulk price update: ${updated} products`);
    res.json({ success: true, message: `${updated} products updated` });
  } catch (error) { next(error); }
};

// ===================== DAILY SUMMARY =====================

export const getDailySummary = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Sales
    const sales = await Sale.aggregate([
      { $match: { businessId, saleDate: { $gte: targetDate, $lt: nextDay }, status: 'completed' } },
      {
        $group: {
          _id: null, totalSales: { $sum: '$grandTotal' }, salesCount: { $sum: 1 },
          totalTax: { $sum: '$taxTotal' }, totalDiscount: { $sum: '$discountTotal' },
        },
      },
    ]);

    // COGS
    const cogs = await Sale.aggregate([
      { $match: { businessId, saleDate: { $gte: targetDate, $lt: nextDay }, status: 'completed' } },
      { $unwind: '$items' },
      { $group: { _id: null, total: { $sum: { $multiply: ['$items.costPrice', '$items.quantity'] } } } },
    ]);

    // Payment breakdown
    const payments = await Sale.aggregate([
      { $match: { businessId, saleDate: { $gte: targetDate, $lt: nextDay }, status: 'completed' } },
      { $unwind: '$payments' },
      { $group: { _id: '$payments.method', total: { $sum: '$payments.amount' } } },
    ]);

    // Expenses
    const expenses = await Expense.aggregate([
      { $match: { businessId, date: { $gte: targetDate, $lt: nextDay } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Wastage
    const wastage = await Wastage.aggregate([
      { $match: { businessId, date: { $gte: targetDate, $lt: nextDay } } },
      { $group: { _id: null, totalLoss: { $sum: '$totalLoss' }, totalItems: { $sum: '$quantity' } } },
    ]);

    // Cash handovers
    const handovers = await CashHandover.aggregate([
      { $match: { businessId, date: { $gte: targetDate, $lt: nextDay } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Credit given today
    const creditGiven = await Sale.aggregate([
      { $match: { businessId, saleDate: { $gte: targetDate, $lt: nextDay }, status: 'completed' } },
      { $unwind: '$payments' },
      { $match: { 'payments.method': 'credit' } },
      { $group: { _id: null, total: { $sum: '$payments.amount' } } },
    ]);

    // Payments received from customers
    const paymentsReceived = await CustomerPayment.aggregate([
      { $match: { businessId, createdAt: { $gte: targetDate, $lt: nextDay } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Top sold products
    const topProducts = await Sale.aggregate([
      { $match: { businessId, saleDate: { $gte: targetDate, $lt: nextDay }, status: 'completed' } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productName', qty: { $sum: '$items.quantity' }, revenue: { $sum: '$items.lineTotal' } } },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]);

    // Production
    const production = await ProductionLog.aggregate([
      { $match: { businessId, date: { $gte: targetDate, $lt: nextDay } } },
      { $group: { _id: null, totalItems: { $sum: '$totalItemsProduced' }, totalCost: { $sum: '$totalProductionCost' } } },
    ]);

    const salesData = sales[0] || { totalSales: 0, salesCount: 0, totalTax: 0, totalDiscount: 0 };
    const totalCOGS = cogs[0]?.total || 0;
    const grossProfit = salesData.totalSales - totalCOGS;
    const totalExpenses = expenses[0]?.total || 0;
    const totalWastage = wastage[0]?.totalLoss || 0;
    const netProfit = grossProfit - totalExpenses - totalWastage;
    const cashPayments = payments.find(p => p._id === 'cash')?.total || 0;

    res.json({
      success: true,
      data: {
        date: targetDate.toISOString().slice(0, 10),
        sales: salesData,
        cogs: totalCOGS,
        grossProfit,
        expenses: totalExpenses,
        wastage: { loss: totalWastage, items: wastage[0]?.totalItems || 0 },
        netProfit,
        payments: payments.map(p => ({ method: p._id, amount: p.total })),
        cashInHand: cashPayments,
        cashHandedOver: handovers[0]?.total || 0,
        creditGiven: creditGiven[0]?.total || 0,
        paymentsReceived: paymentsReceived[0]?.total || 0,
        topProducts,
        production: production[0] || { totalItems: 0, totalCost: 0 },
      },
    });
  } catch (error) { next(error); }
};

// ===================== UDHAR REGISTER =====================

export const getUdharRegister = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;

    // Customers with outstanding balance
    const customers = await Customer.find({
      businessId, currentBalance: { $gt: 0 }, isActive: true,
    }).sort({ currentBalance: -1 });

    // Recent credit sales
    const recentCredit = await Sale.find({
      businessId, status: 'completed', 'payments.method': 'credit',
    }).sort({ saleDate: -1 }).limit(50).select('invoiceNo customerName grandTotal payments saleDate');

    // Recent payments received
    const recentPayments = await CustomerPayment.find({ businessId })
      .populate('customerId', 'customerName phone')
      .sort({ createdAt: -1 }).limit(50);

    const totalUdhar = customers.reduce((s, c) => s + c.currentBalance, 0);

    res.json({
      success: true,
      data: { customers, recentCredit, recentPayments, totalUdhar, customerCount: customers.length },
    });
  } catch (error) { next(error); }
};
