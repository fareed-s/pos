import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Wastage from '../models/Wastage.js';

// @desc Get AI production suggestions based on day-of-week sales patterns
export const getProductionSuggestions = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    const targetDay = targetDate.getDay(); // 0=Sun, 1=Mon...

    // Get last 8 weeks of same-day data
    const weeks = 8;
    const sameDayDates = [];
    for (let i = 1; i <= weeks; i++) {
      const d = new Date(targetDate);
      d.setDate(d.getDate() - (i * 7));
      sameDayDates.push(d);
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[targetDay];

    // Aggregate sales for same day of week over past weeks
    const salesData = await Sale.aggregate([
      {
        $match: {
          businessId, status: 'completed',
          $expr: { $eq: [{ $dayOfWeek: '$saleDate' }, targetDay + 1] }, // MongoDB dayOfWeek is 1-indexed (1=Sun)
          saleDate: { $gte: new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000) },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          totalQty: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.lineTotal' },
          dataPoints: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } } },
        },
      },
      { $sort: { totalQty: -1 } },
    ]);

    // Get wastage data for same day pattern
    const wastageData = await Wastage.aggregate([
      {
        $match: {
          businessId,
          $expr: { $eq: [{ $dayOfWeek: '$date' }, targetDay + 1] },
          date: { $gte: new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000) },
        },
      },
      { $group: { _id: '$productId', productName: { $first: '$productName' }, totalWasted: { $sum: '$quantity' } } },
    ]);

    const wastageMap = {};
    wastageData.forEach(w => { wastageMap[w._id?.toString()] = w.totalWasted; });

    // Calculate suggestions
    const suggestions = [];
    for (const item of salesData) {
      const weeksWithData = item.dataPoints.length || 1;
      const avgPerDay = Math.ceil(item.totalQty / weeksWithData);
      const avgWasted = Math.ceil((wastageMap[item._id?.toString()] || 0) / weeksWithData);
      const suggested = Math.max(1, avgPerDay - Math.floor(avgWasted * 0.5)); // Reduce by half of wastage

      // Get current stock
      const product = await Product.findById(item._id).select('currentStock costPrice salePrice category').populate('category', 'name');

      suggestions.push({
        productId: item._id,
        productName: item.productName,
        category: product?.category?.name || '',
        avgSoldPerDay: avgPerDay,
        avgWastedPerDay: avgWasted,
        currentStock: product?.currentStock || 0,
        suggestedProduction: Math.max(0, suggested - (product?.currentStock || 0)),
        estimatedRevenue: suggested * (product?.salePrice || 0),
        estimatedCost: suggested * (product?.costPrice || 0),
        confidence: Math.min(100, weeksWithData * 12.5), // More weeks = higher confidence
        weeksAnalyzed: weeksWithData,
      });
    }

    // Also check for products that sold on other days but not this day (opportunity)
    const allTimeBest = await Sale.aggregate([
      { $match: { businessId, status: 'completed', saleDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', productName: { $first: '$items.productName' }, totalQty: { $sum: '$items.quantity' } } },
      { $sort: { totalQty: -1 } },
      { $limit: 5 },
    ]);

    const suggestedIds = new Set(suggestions.map(s => s.productId?.toString()));
    const opportunities = allTimeBest.filter(p => !suggestedIds.has(p._id?.toString()));

    res.json({
      success: true,
      data: {
        dayName,
        date: targetDate.toISOString().slice(0, 10),
        weeksAnalyzed: weeks,
        suggestions: suggestions.filter(s => s.suggestedProduction > 0).slice(0, 25),
        allSuggestions: suggestions,
        opportunities,
      },
    });
  } catch (error) { next(error); }
};

// @desc Get smart discount suggestions for items nearing end of day
export const getSmartDiscountSuggestions = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;

    // Get bakery items with stock > 0 that typically don't sell well in remaining hours
    const now = new Date();
    const currentHour = now.getHours();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's sales so far
    const todaySold = await Sale.aggregate([
      { $match: { businessId, saleDate: { $gte: today, $lt: tomorrow }, status: 'completed' } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', qtySold: { $sum: '$items.quantity' } } },
    ]);
    const soldMap = {};
    todaySold.forEach(s => { soldMap[s._id?.toString()] = s.qtySold; });

    // Get perishable products (bakery items) with remaining stock
    const products = await Product.find({
      businessId, isActive: true, currentStock: { $gt: 0 },
    }).populate('category', 'name').select('productName sku costPrice salePrice currentStock category');

    // Calculate historical sell-through rate for remaining hours
    const historicalRemaining = await Sale.aggregate([
      {
        $match: {
          businessId, status: 'completed',
          saleDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          $expr: { $gte: [{ $hour: '$saleDate' }, currentHour] },
        },
      },
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', avgQty: { $avg: '$items.quantity' } } },
    ]);
    const remainingDemandMap = {};
    historicalRemaining.forEach(h => { remainingDemandMap[h._id?.toString()] = Math.ceil(h.avgQty); });

    const discountSuggestions = products.map(p => {
      const soldToday = soldMap[p._id.toString()] || 0;
      const remainingStock = p.currentStock;
      const expectedRemainingSales = remainingDemandMap[p._id.toString()] || 0;
      const excessStock = Math.max(0, remainingStock - expectedRemainingSales);
      const isBakery = p.category?.name?.toLowerCase().includes('bakery') || p.category?.name?.toLowerCase().includes('bread') || p.category?.name?.toLowerCase().includes('cake') || p.category?.name?.toLowerCase().includes('pastry') || p.category?.name?.toLowerCase().includes('patties') || p.category?.name?.toLowerCase().includes('rusk');

      let suggestedDiscount = 0;
      let urgency = 'low';

      if (excessStock > 0 && isBakery) {
        if (currentHour >= 20) { suggestedDiscount = 50; urgency = 'high'; }
        else if (currentHour >= 18) { suggestedDiscount = 30; urgency = 'medium'; }
        else if (currentHour >= 16) { suggestedDiscount = 20; urgency = 'low'; }
      } else if (excessStock > 0 && currentHour >= 20) {
        suggestedDiscount = 15; urgency = 'low';
      }

      const discountedPrice = Math.round(p.salePrice * (1 - suggestedDiscount / 100));
      const potentialRecovery = excessStock * discountedPrice;
      const potentialLoss = excessStock * p.costPrice; // If not sold at all

      return {
        productId: p._id, productName: p.productName, category: p.category?.name || '',
        currentStock: remainingStock, soldToday, expectedRemainingSales, excessStock,
        originalPrice: p.salePrice, costPrice: p.costPrice,
        suggestedDiscount, discountedPrice, urgency,
        potentialRecovery, potentialLoss, isBakery,
      };
    }).filter(s => s.suggestedDiscount > 0 && s.excessStock > 0)
      .sort((a, b) => b.urgency === 'high' ? 1 : -1);

    res.json({
      success: true,
      data: {
        currentHour, suggestions: discountSuggestions,
        totalExcessItems: discountSuggestions.reduce((s, d) => s + d.excessStock, 0),
        totalPotentialRecovery: discountSuggestions.reduce((s, d) => s + d.potentialRecovery, 0),
        totalPotentialLoss: discountSuggestions.reduce((s, d) => s + d.potentialLoss, 0),
      },
    });
  } catch (error) { next(error); }
};

// @desc Get supplier price comparison
export const getSupplierComparison = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const PurchaseOrder = (await import('../models/PurchaseOrder.js')).default;

    // Get all received POs with item costs
    const poData = await PurchaseOrder.aggregate([
      { $match: { businessId, status: { $in: ['received', 'partially_received'] } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: { productId: '$items.productId', supplierId: '$supplierId' },
          productName: { $first: '$items.productName' },
          avgCost: { $avg: '$items.unitCost' },
          lastCost: { $last: '$items.unitCost' },
          totalQty: { $sum: '$items.receivedQuantity' },
          orderCount: { $sum: 1 },
        },
      },
      {
        $lookup: { from: 'suppliers', localField: '_id.supplierId', foreignField: '_id', as: 'supplier' },
      },
      { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true } },
      { $sort: { '_id.productId': 1, lastCost: 1 } },
    ]);

    // Group by product
    const productMap = {};
    poData.forEach(d => {
      const pid = d._id.productId?.toString();
      if (!productMap[pid]) {
        productMap[pid] = { productName: d.productName, suppliers: [] };
      }
      productMap[pid].suppliers.push({
        supplierId: d._id.supplierId,
        supplierName: d.supplier?.supplierName || 'Unknown',
        avgCost: Math.round(d.avgCost),
        lastCost: d.lastCost,
        totalQty: d.totalQty,
        orderCount: d.orderCount,
      });
    });

    // Find products with multiple suppliers and price differences
    const comparisons = Object.entries(productMap)
      .filter(([_, v]) => v.suppliers.length > 1)
      .map(([productId, data]) => {
        const sorted = data.suppliers.sort((a, b) => a.lastCost - b.lastCost);
        const cheapest = sorted[0];
        const mostExpensive = sorted[sorted.length - 1];
        const savings = mostExpensive.lastCost - cheapest.lastCost;
        return {
          productId, productName: data.productName,
          suppliers: sorted, cheapest: cheapest.supplierName,
          savingsPerUnit: savings,
          savingsPercent: ((savings / mostExpensive.lastCost) * 100).toFixed(1),
        };
      })
      .filter(c => c.savingsPerUnit > 0)
      .sort((a, b) => b.savingsPerUnit - a.savingsPerUnit);

    res.json({ success: true, data: comparisons });
  } catch (error) { next(error); }
};

// @desc Get staff performance leaderboard
export const getStaffLeaderboard = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const { period = 'today' } = req.query;

    let startDate;
    const now = new Date();
    if (period === 'today') { startDate = new Date(); startDate.setHours(0, 0, 0, 0); }
    else if (period === 'week') { startDate = new Date(); startDate.setDate(startDate.getDate() - 7); }
    else if (period === 'month') { startDate = new Date(); startDate.setMonth(startDate.getMonth() - 1); }
    else { startDate = new Date(); startDate.setHours(0, 0, 0, 0); }

    const leaderboard = await Sale.aggregate([
      { $match: { businessId, status: 'completed', saleDate: { $gte: startDate } } },
      {
        $group: {
          _id: '$cashierId',
          name: { $first: '$cashierName' },
          totalSales: { $sum: '$grandTotal' },
          salesCount: { $sum: 1 },
          avgSale: { $avg: '$grandTotal' },
          itemsSold: { $sum: { $size: '$items' } },
          maxSale: { $max: '$grandTotal' },
        },
      },
      { $sort: { totalSales: -1 } },
    ]);

    // Add rank and medal
    const ranked = leaderboard.map((entry, i) => ({
      ...entry,
      rank: i + 1,
      medal: i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '',
    }));

    // Daily target (configurable - default 50000)
    const dailyTarget = 50000;

    res.json({
      success: true,
      data: {
        period, leaderboard: ranked, dailyTarget,
        totalTeamSales: ranked.reduce((s, r) => s + r.totalSales, 0),
      },
    });
  } catch (error) { next(error); }
};

// @desc Get expiry countdown for perishable items
export const getExpiryCountdown = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;

    // For bakery items, we treat them as "produced today, best before end of day"
    // Items with expiryDate field get actual countdown
    const now = new Date();

    // Products with actual expiry dates
    const expiringProducts = await Product.find({
      businessId, isActive: true, currentStock: { $gt: 0 },
      expiryDate: { $exists: true, $ne: null, $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    }).populate('category', 'name').sort({ expiryDate: 1 });

    // Bakery items that are "fresh today" - stock represents today's production
    const bakeryItems = await Product.find({
      businessId, isActive: true, currentStock: { $gt: 0 },
    }).populate('category', 'name');

    const freshItems = bakeryItems.filter(p => {
      const catName = p.category?.name?.toLowerCase() || '';
      return catName.includes('bread') || catName.includes('pastry') || catName.includes('cream') ||
        catName.includes('patties') || catName.includes('samosa') || catName.includes('cake') && !catName.includes('rusk');
    });

    // Categorize by urgency
    const urgent = []; // < 2 hours or expired
    const warning = []; // 2-6 hours
    const ok = []; // > 6 hours

    // For bakery items, assume 12-hour shelf life from morning (6 AM)
    const morningStart = new Date(); morningStart.setHours(6, 0, 0, 0);
    const shelfLifeHours = 14; // 6 AM to 8 PM

    freshItems.forEach(p => {
      const expiryTime = new Date(morningStart.getTime() + shelfLifeHours * 60 * 60 * 1000);
      const hoursLeft = Math.max(0, (expiryTime - now) / (60 * 60 * 1000));

      const item = {
        productId: p._id, productName: p.productName,
        category: p.category?.name || '', currentStock: p.currentStock,
        salePrice: p.salePrice, costPrice: p.costPrice,
        hoursLeft: Math.round(hoursLeft * 10) / 10,
        potentialLoss: p.currentStock * p.costPrice,
        expiryTime: expiryTime.toISOString(),
      };

      if (hoursLeft <= 0) urgent.push({ ...item, status: 'expired' });
      else if (hoursLeft <= 2) urgent.push({ ...item, status: 'critical' });
      else if (hoursLeft <= 6) warning.push({ ...item, status: 'warning' });
      else ok.push({ ...item, status: 'fresh' });
    });

    // Add products with actual expiry dates
    expiringProducts.forEach(p => {
      const daysLeft = Math.max(0, (new Date(p.expiryDate) - now) / (24 * 60 * 60 * 1000));
      const item = {
        productId: p._id, productName: p.productName,
        category: p.category?.name || '', currentStock: p.currentStock,
        salePrice: p.salePrice, costPrice: p.costPrice,
        daysLeft: Math.round(daysLeft * 10) / 10,
        expiryDate: p.expiryDate,
        potentialLoss: p.currentStock * p.costPrice,
      };
      if (daysLeft <= 1) urgent.push({ ...item, status: 'expiring_today' });
      else if (daysLeft <= 3) warning.push({ ...item, status: 'expiring_soon' });
      else ok.push({ ...item, status: 'ok' });
    });

    res.json({
      success: true,
      data: {
        urgent, warning, ok,
        totalAtRisk: urgent.length + warning.length,
        totalPotentialLoss: [...urgent, ...warning].reduce((s, i) => s + i.potentialLoss, 0),
      },
    });
  } catch (error) { next(error); }
};
