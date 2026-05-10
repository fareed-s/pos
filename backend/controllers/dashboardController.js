import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Expense from '../models/Expense.js';
import PurchaseOrder from '../models/PurchaseOrder.js';

// @desc Get dashboard stats
export const getDashboardStats = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's sales
    const todaySales = await Sale.aggregate([
      { $match: { businessId, saleDate: { $gte: today, $lt: tomorrow }, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
    ]);

    const salesData = todaySales[0] || { total: 0, count: 0 };
    
    // Calculate actual COGS for today
    const todaySaleItems = await Sale.aggregate([
      { $match: { businessId, saleDate: { $gte: today, $lt: tomorrow }, status: 'completed' } },
      { $unwind: '$items' },
      { $group: { _id: null, cogs: { $sum: { $multiply: ['$items.costPrice', '$items.quantity'] } } } },
    ]);
    const cogs = todaySaleItems[0]?.cogs || 0;

    // Low stock count
    const lowStockCount = await Product.countDocuments({
      businessId,
      isActive: true,
      isStockTracked: true,
      $expr: { $lte: ['$currentStock', '$lowStockThreshold'] },
    });

    // Out of stock
    const outOfStockCount = await Product.countDocuments({
      businessId, isActive: true, isStockTracked: true, currentStock: { $lte: 0 },
    });

    // Credit due
    const creditDue = await Customer.aggregate([
      { $match: { businessId, currentBalance: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$currentBalance' }, count: { $sum: 1 } } },
    ]);

    // Pending purchase orders
    const pendingPOs = await PurchaseOrder.countDocuments({
      businessId, status: { $in: ['ordered', 'partially_received'] },
    });

    // Sales trend (last 7 days)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const salesTrend = await Sale.aggregate([
      { $match: { businessId, saleDate: { $gte: sevenDaysAgo }, status: 'completed' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } },
          total: { $sum: '$grandTotal' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Top 10 selling products (this month)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const topProducts = await Sale.aggregate([
      { $match: { businessId, saleDate: { $gte: monthStart }, status: 'completed' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.productName' },
          totalQty: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.lineTotal' },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
    ]);

    // Sales by category (this month)
    const salesByCategory = await Sale.aggregate([
      { $match: { businessId, saleDate: { $gte: monthStart }, status: 'completed' } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'categories',
          localField: 'product.category',
          foreignField: '_id',
          as: 'cat',
        },
      },
      { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$cat.name',
          total: { $sum: '$items.lineTotal' },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Today's expenses
    const todayExpenses = await Expense.aggregate([
      { $match: { businessId, date: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Total products
    const totalProducts = await Product.countDocuments({ businessId, isActive: true });
    const totalCustomers = await Customer.countDocuments({ businessId, isActive: true });

    res.json({
      success: true,
      data: {
        todaySales: { amount: salesData.total, count: salesData.count },
        todayProfit: salesData.total - cogs,
        todayExpenses: todayExpenses[0]?.total || 0,
        lowStockCount,
        outOfStockCount,
        creditDue: creditDue[0] || { total: 0, count: 0 },
        pendingPOs,
        salesTrend,
        topProducts,
        salesByCategory: salesByCategory.map(s => ({ name: s._id || 'Uncategorized', value: s.total })),
        totalProducts,
        totalCustomers,
      },
    });
  } catch (error) {
    next(error);
  }
};
