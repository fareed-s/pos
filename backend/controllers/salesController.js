import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import { HeldSale, SaleReturn, Settings } from '../models/OtherModels.js';
import StockAdjustment from '../models/StockAdjustment.js';
import { generateInvoiceNo, getSettings } from '../utils/helpers.js';
import { logActivity } from '../middleware/activityLog.js';

// @desc Create a new sale (complete transaction)
// @route POST /api/sales
export const createSale = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const settings = await getSettings(businessId);
    const {
      items, customerId, customerName, payments, amountTendered,
      discountType, discountValue, notes, saleDate,
      udharType, udharProxyName, udharProofImage, udharProofVoice,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // Generate invoice number
    const invoiceNo = await generateInvoiceNo(businessId, settings.invoicePrefix || 'INV');

    // Calculate totals and validate stock
    let subtotal = 0;
    let taxTotal = 0;
    let itemDiscountTotal = 0;
    const saleItems = [];

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, businessId });
      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found: ${item.productName || item.productId}` });
      }

      // Check stock
      if (product.isStockTracked && !settings.allowNegativeStock && product.currentStock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.productName}. Available: ${product.currentStock}`,
        });
      }

      const unitPrice = item.unitPrice || product.salePrice;
      const costPrice = product.costPrice;
      const taxRate = item.tax !== undefined ? item.tax : product.tax || 0;

      // Per-item discount
      let discountAmount = 0;
      if (item.discount && item.discount > 0) {
        if (item.discountType === 'fixed') {
          discountAmount = item.discount;
        } else {
          discountAmount = (unitPrice * item.quantity * item.discount) / 100;
        }
      }

      const lineSubtotal = unitPrice * item.quantity - discountAmount;
      const taxAmount = (lineSubtotal * taxRate) / 100;
      const lineTotal = lineSubtotal + taxAmount;

      subtotal += unitPrice * item.quantity;
      taxTotal += taxAmount;
      itemDiscountTotal += discountAmount;

      saleItems.push({
        productId: product._id,
        productName: product.productName,
        sku: product.sku,
        variantId: item.variantId || undefined,
        variantName: item.variantName || '',
        quantity: item.quantity,
        unitPrice,
        costPrice,
        discount: item.discount || 0,
        discountType: item.discountType || 'percentage',
        discountAmount,
        tax: taxRate,
        taxAmount,
        lineTotal,
      });

      // Deduct stock
      if (product.isStockTracked) {
        product.currentStock -= item.quantity;
        await product.save();

        await StockAdjustment.create({
          productId: product._id,
          productName: product.productName,
          type: 'subtract',
          quantity: item.quantity,
          previousStock: product.currentStock + item.quantity,
          newStock: product.currentStock,
          reason: 'sale',
          notes: `Sale: ${invoiceNo}`,
          adjustedBy: req.user._id,
          adjustedByName: req.user.name,
          businessId,
        });
      }
    }

    // Overall discount
    let overallDiscount = 0;
    if (discountValue && discountValue > 0) {
      if (discountType === 'fixed') {
        overallDiscount = discountValue;
      } else {
        overallDiscount = (subtotal * discountValue) / 100;
      }
    }

    const discountTotal = itemDiscountTotal + overallDiscount;
    const grandTotal = subtotal + taxTotal - discountTotal;
    const changeGiven = amountTendered ? Math.max(0, amountTendered - grandTotal) : 0;

    // Resolve customer name from DB when only customerId is supplied
    let resolvedCustomerName = customerName;
    let resolvedCustomer = null;
    if (customerId) {
      resolvedCustomer = await Customer.findOne({ _id: customerId, businessId });
      if (!resolvedCustomer) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }
      if (!resolvedCustomerName) resolvedCustomerName = resolvedCustomer.customerName;
    }
    if (!resolvedCustomerName) resolvedCustomerName = 'Walk-in Customer';

    // Khata fields are only meaningful on credit sales — drop them otherwise so we
    // don't store stale proxy/proof URLs on a paid sale that's later voided/edited.
    const isCredit = (payments || []).some(p => p.method === 'credit');
    const khataFields = isCredit ? {
      udharType: udharType === 'someone_else' ? 'someone_else' : 'self',
      udharProxyName: udharProxyName || '',
      udharProofImage: udharProofImage || '',
      udharProofVoice: udharProofVoice || '',
    } : {};

    const sale = await Sale.create({
      invoiceNo,
      businessId,
      customerId: customerId || undefined,
      customerName: resolvedCustomerName,
      cashierId: req.user._id,
      cashierName: req.user.name,
      items: saleItems,
      subtotal,
      taxTotal,
      discountTotal,
      discountType: discountType || 'percentage',
      discountValue: discountValue || 0,
      grandTotal,
      payments: payments || [{ method: 'cash', amount: grandTotal }],
      amountTendered: amountTendered || grandTotal,
      changeGiven,
      status: 'completed',
      notes: notes || '',
      saleDate: saleDate || new Date(),
      ...khataFields,
    });

    // Update customer stats if customer selected
    if (resolvedCustomer) {
      const customer = resolvedCustomer;
      customer.totalPurchases = (customer.totalPurchases || 0) + 1;
      customer.totalSpent = (customer.totalSpent || 0) + grandTotal;
      customer.lastPurchaseDate = new Date();

      // Loyalty points (guard against zero/missing pointsValue)
      if (settings.loyaltyPointsRate > 0 && settings.loyaltyPointsValue > 0) {
        const pointsEarned = Math.floor(grandTotal / settings.loyaltyPointsValue) * settings.loyaltyPointsRate;
        customer.loyaltyPoints = (customer.loyaltyPoints || 0) + pointsEarned;
      }

      // Handle credit payment
      const creditPayment = payments?.find(p => p.method === 'credit');
      if (creditPayment) {
        customer.currentBalance = (customer.currentBalance || 0) + creditPayment.amount;
      }

      await customer.save();
    }

    logActivity(req.user._id, req.user.name, 'create', 'sales', businessId, sale._id, `Sale completed: ${invoiceNo} - ${grandTotal}`);

    res.status(201).json({ success: true, data: sale });
  } catch (error) {
    next(error);
  }
};

// @desc Get all sales
// @route GET /api/sales
export const getSales = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status, startDate, endDate, cashier, customer, paymentMethod, sort = '-saleDate' } = req.query;
    const businessId = req.user.businessId;
    const query = { businessId };

    if (status) query.status = status;
    if (cashier) query.cashierId = cashier;
    if (customer) query.customerId = customer;

    if (search) {
      query.$or = [
        { invoiceNo: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { cashierName: { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      query.saleDate = {};
      if (startDate) query.saleDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.saleDate.$lte = end;
      }
    }

    if (paymentMethod) {
      query['payments.method'] = paymentMethod;
    }

    // Cashiers can only see their own sales
    if (req.user.role === 'cashier') {
      query.cashierId = req.user._id;
    }

    const total = await Sale.countDocuments(query);
    const sales = await Sale.find(query)
      .populate('customerId', 'customerName phone')
      .populate('cashierId', 'name')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Aggregate totals for filtered set
    const totals = await Sale.aggregate([
      { $match: { ...query, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$grandTotal' },
          totalCount: { $sum: 1 },
          totalTax: { $sum: '$taxTotal' },
          totalDiscount: { $sum: '$discountTotal' },
        },
      },
    ]);

    res.json({
      success: true,
      data: sales,
      totals: totals[0] || { totalAmount: 0, totalCount: 0, totalTax: 0, totalDiscount: 0 },
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get single sale details
// @route GET /api/sales/:id
export const getSale = async (req, res, next) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, businessId: req.user.businessId })
      .populate('customerId', 'customerName phone email address')
      .populate('cashierId', 'name email');

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    res.json({ success: true, data: sale });
  } catch (error) {
    next(error);
  }
};

// @desc Void a sale
// @route POST /api/sales/:id/void
export const voidSale = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Void reason is required' });
    }

    const sale = await Sale.findOne({ _id: req.params.id, businessId });
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    if (sale.status !== 'completed') {
      return res.status(400).json({ success: false, message: `Cannot void a ${sale.status} sale` });
    }

    // Restore stock
    for (const item of sale.items) {
      const product = await Product.findOne({ _id: item.productId, businessId });
      if (product && product.isStockTracked) {
        product.currentStock += item.quantity;
        await product.save();

        await StockAdjustment.create({
          productId: product._id,
          productName: product.productName,
          type: 'add',
          quantity: item.quantity,
          previousStock: product.currentStock - item.quantity,
          newStock: product.currentStock,
          reason: 'sale',
          notes: `Voided sale: ${sale.invoiceNo}`,
          adjustedBy: req.user._id,
          adjustedByName: req.user.name,
          businessId,
        });
      }
    }

    // Reverse customer balance if credit was used (tenant-scoped)
    if (sale.customerId) {
      const creditPayment = sale.payments?.find(p => p.method === 'credit');
      const inc = creditPayment
        ? { currentBalance: -creditPayment.amount, totalSpent: -sale.grandTotal, totalPurchases: -1 }
        : { totalSpent: -sale.grandTotal, totalPurchases: -1 };
      await Customer.findOneAndUpdate({ _id: sale.customerId, businessId }, { $inc: inc });
    }

    sale.status = 'voided';
    sale.voidReason = reason;
    sale.voidedBy = req.user._id;
    sale.voidedAt = new Date();
    await sale.save();

    logActivity(req.user._id, req.user.name, 'void', 'sales', businessId, sale._id, `Voided sale: ${sale.invoiceNo}. Reason: ${reason}`);

    res.json({ success: true, data: sale, message: 'Sale voided successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc Process return/refund
// @route POST /api/sales/:id/return
export const processReturn = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const { items, refundMethod, reason } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Select items to return' });
    }

    const sale = await Sale.findOne({ _id: req.params.id, businessId });
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    if (sale.status !== 'completed') {
      return res.status(400).json({ success: false, message: `Cannot return a ${sale.status} sale` });
    }

    // Sum already-returned quantities per item across prior SaleReturn docs
    const priorReturns = await SaleReturn.find({ saleId: sale._id, businessId });
    const returnedSoFar = {};
    for (const r of priorReturns) {
      for (const ri of r.items) {
        const key = ri.productId.toString();
        returnedSoFar[key] = (returnedSoFar[key] || 0) + ri.quantity;
      }
    }

    let refundAmount = 0;
    const returnItems = [];

    for (const returnItem of items) {
      const saleItem = sale.items.find(i => i.productId.toString() === returnItem.productId);
      if (!saleItem) continue;

      const remaining = saleItem.quantity - (returnedSoFar[saleItem.productId.toString()] || 0);
      if (remaining <= 0) continue;

      const qty = Math.min(returnItem.quantity, remaining);
      if (qty <= 0) continue;

      const perUnit = saleItem.quantity > 0 ? saleItem.lineTotal / saleItem.quantity : 0;
      const lineRefund = perUnit * qty;
      refundAmount += lineRefund;

      returnItems.push({
        productId: saleItem.productId,
        productName: saleItem.productName,
        quantity: qty,
        unitPrice: saleItem.unitPrice,
        lineTotal: lineRefund,
      });

      // Restore stock (tenant-scoped)
      const product = await Product.findOne({ _id: saleItem.productId, businessId });
      if (product && product.isStockTracked) {
        product.currentStock += qty;
        await product.save();

        await StockAdjustment.create({
          productId: product._id,
          productName: product.productName,
          type: 'add',
          quantity: qty,
          previousStock: product.currentStock - qty,
          newStock: product.currentStock,
          reason: 'returned',
          notes: `Return from sale: ${sale.invoiceNo}`,
          adjustedBy: req.user._id,
          adjustedByName: req.user.name,
          businessId,
        });
      }
    }

    if (returnItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Nothing to return (already fully returned)' });
    }

    const saleReturn = await SaleReturn.create({
      saleId: sale._id,
      invoiceNo: sale.invoiceNo,
      items: returnItems,
      refundAmount,
      refundMethod: refundMethod || 'cash',
      reason: reason || 'Customer return',
      processedBy: req.user._id,
      businessId,
    });

    // Reverse customer balance / loyalty for the refunded amount
    if (sale.customerId) {
      const settings = await getSettings(businessId);
      const customer = await Customer.findOne({ _id: sale.customerId, businessId });
      if (customer) {
        customer.totalSpent = Math.max(0, (customer.totalSpent || 0) - refundAmount);
        if ((refundMethod || 'cash') === 'credit') {
          customer.currentBalance = Math.max(0, (customer.currentBalance || 0) - refundAmount);
        }
        if (settings.loyaltyPointsRate > 0 && settings.loyaltyPointsValue > 0) {
          const pointsToReverse = Math.floor(refundAmount / settings.loyaltyPointsValue) * settings.loyaltyPointsRate;
          customer.loyaltyPoints = Math.max(0, (customer.loyaltyPoints || 0) - pointsToReverse);
        }
        await customer.save();
      }
    }

    // Mark sale as returned only if cumulative returns cover all original quantities
    const cumulative = { ...returnedSoFar };
    for (const ri of returnItems) {
      const k = ri.productId.toString();
      cumulative[k] = (cumulative[k] || 0) + ri.quantity;
    }
    const allReturned = sale.items.every(si => (cumulative[si.productId.toString()] || 0) >= si.quantity);

    if (allReturned) {
      sale.status = 'returned';
    }
    await sale.save();

    logActivity(req.user._id, req.user.name, 'return', 'sales', businessId, sale._id, `Return processed: ${sale.invoiceNo}. Refund: ${refundAmount}`);

    res.json({ success: true, data: saleReturn, message: `Refund of Rs. ${refundAmount} processed` });
  } catch (error) {
    next(error);
  }
};

// @desc Hold a sale (save cart for later)
// @route POST /api/sales/hold
export const holdSale = async (req, res, next) => {
  try {
    const { items, customerId, customerName, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const heldSale = await HeldSale.create({
      items,
      customerId: customerId || undefined,
      customerName: customerName || 'Walk-in Customer',
      cashierId: req.user._id,
      notes: notes || '',
      businessId: req.user.businessId,
    });

    res.status(201).json({ success: true, data: heldSale, message: 'Sale held successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc Get held sales
// @route GET /api/sales/held
export const getHeldSales = async (req, res, next) => {
  try {
    const heldSales = await HeldSale.find({ businessId: req.user.businessId })
      .populate('cashierId', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: heldSales });
  } catch (error) {
    next(error);
  }
};

// @desc Resume a held sale (delete held, return data)
// @route DELETE /api/sales/held/:id
export const resumeHeldSale = async (req, res, next) => {
  try {
    const heldSale = await HeldSale.findOneAndDelete({
      _id: req.params.id,
      businessId: req.user.businessId,
    });

    if (!heldSale) {
      return res.status(404).json({ success: false, message: 'Held sale not found' });
    }

    res.json({ success: true, data: heldSale, message: 'Sale resumed' });
  } catch (error) {
    next(error);
  }
};

// @desc Get today's sales summary (for cashier)
// @route GET /api/sales/today-summary
export const getTodaySummary = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const matchQuery = {
      businessId,
      saleDate: { $gte: today, $lt: tomorrow },
    };

    if (req.user.role === 'cashier') {
      matchQuery.cashierId = req.user._id;
    }

    const summary = await Sale.aggregate([
      { $match: { ...matchQuery, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$grandTotal' },
          salesCount: { $sum: 1 },
          totalTax: { $sum: '$taxTotal' },
          totalDiscount: { $sum: '$discountTotal' },
          cashSales: {
            $sum: {
              $reduce: {
                input: '$payments',
                initialValue: 0,
                in: { $cond: [{ $eq: ['$$this.method', 'cash'] }, { $add: ['$$value', '$$this.amount'] }, '$$value'] },
              },
            },
          },
          cardSales: {
            $sum: {
              $reduce: {
                input: '$payments',
                initialValue: 0,
                in: { $cond: [{ $eq: ['$$this.method', 'card'] }, { $add: ['$$value', '$$this.amount'] }, '$$value'] },
              },
            },
          },
        },
      },
    ]);

    const voidCount = await Sale.countDocuments({ ...matchQuery, status: 'voided' });
    const returnCount = await Sale.countDocuments({ ...matchQuery, status: 'returned' });

    res.json({
      success: true,
      data: {
        ...(summary[0] || { totalSales: 0, salesCount: 0, totalTax: 0, totalDiscount: 0, cashSales: 0, cardSales: 0 }),
        voidCount,
        returnCount,
      },
    });
  } catch (error) {
    next(error);
  }
};
