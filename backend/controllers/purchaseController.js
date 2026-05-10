import PurchaseOrder from '../models/PurchaseOrder.js';
import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import StockAdjustment from '../models/StockAdjustment.js';
import { generatePONumber, getSettings } from '../utils/helpers.js';
import { logActivity } from '../middleware/activityLog.js';

// @desc Get all purchase orders
export const getPurchaseOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status, supplier, startDate, endDate } = req.query;
    const query = { businessId: req.user.businessId };
    if (status) query.status = status;
    if (supplier) query.supplierId = supplier;
    if (search) {
      query.$or = [
        { poNumber: { $regex: search, $options: 'i' } },
      ];
    }
    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); query.orderDate.$lte = e; }
    }

    const total = await PurchaseOrder.countDocuments(query);
    const orders = await PurchaseOrder.find(query)
      .populate('supplierId', 'supplierName companyName')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totals = await PurchaseOrder.aggregate([
      { $match: { ...query, status: { $nin: ['cancelled'] } } },
      { $group: { _id: null, totalAmount: { $sum: '$grandTotal' }, totalPaid: { $sum: '$amountPaid' }, totalDue: { $sum: '$balanceDue' } } },
    ]);

    res.json({
      success: true, data: orders, totals: totals[0] || { totalAmount: 0, totalPaid: 0, totalDue: 0 },
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) { next(error); }
};

// @desc Get single PO
export const getPurchaseOrder = async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, businessId: req.user.businessId })
      .populate('supplierId', 'supplierName companyName phone email')
      .populate('createdBy', 'name');
    if (!po) return res.status(404).json({ success: false, message: 'Purchase order not found' });
    res.json({ success: true, data: po });
  } catch (error) { next(error); }
};

// @desc Create purchase order
export const createPurchaseOrder = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const settings = await getSettings(businessId);
    const { supplierId, items, tax, discount, notes, expectedDeliveryDate, status } = req.body;

    if (!supplierId) return res.status(400).json({ success: false, message: 'Supplier is required' });
    if (!items || items.length === 0) return res.status(400).json({ success: false, message: 'Items are required' });

    const supplier = await Supplier.findOne({ _id: supplierId, businessId });
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

    const poNumber = await generatePONumber(businessId, settings.poPrefix || 'PO');

    let subtotal = 0;
    const poItems = items.map(item => {
      const lineTotal = item.quantity * item.unitCost;
      subtotal += lineTotal;
      return { productId: item.productId, productName: item.productName, quantity: item.quantity, unitCost: item.unitCost, receivedQuantity: 0, lineTotal };
    });

    const taxAmount = (subtotal * (tax || 0)) / 100;
    const discountAmount = discount || 0;
    const grandTotal = subtotal + taxAmount - discountAmount;

    const po = await PurchaseOrder.create({
      poNumber, supplierId, items: poItems, subtotal, tax: taxAmount, discount: discountAmount,
      grandTotal, balanceDue: grandTotal, status: status || 'draft',
      orderDate: new Date(), expectedDeliveryDate, notes,
      createdBy: req.user._id, businessId,
    });

    // Update supplier total due
    supplier.totalAmountDue = (supplier.totalAmountDue || 0) + grandTotal;
    supplier.totalPurchases = (supplier.totalPurchases || 0) + 1;
    await supplier.save();

    logActivity(req.user._id, req.user.name, 'create', 'purchases', businessId, po._id, `Created PO: ${poNumber}`);
    res.status(201).json({ success: true, data: po });
  } catch (error) { next(error); }
};

// @desc Update PO (draft only)
export const updatePurchaseOrder = async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, businessId: req.user.businessId });
    if (!po) return res.status(404).json({ success: false, message: 'PO not found' });
    if (po.status !== 'draft') return res.status(400).json({ success: false, message: 'Only draft POs can be edited' });

    const { items, tax, discount, notes, expectedDeliveryDate, status } = req.body;
    if (items) {
      let subtotal = 0;
      po.items = items.map(item => {
        const lineTotal = item.quantity * item.unitCost;
        subtotal += lineTotal;
        return { productId: item.productId, productName: item.productName, quantity: item.quantity, unitCost: item.unitCost, receivedQuantity: 0, lineTotal };
      });
      po.subtotal = subtotal;
      const taxAmt = (subtotal * (tax || 0)) / 100;
      po.tax = taxAmt;
      po.discount = discount || 0;
      po.grandTotal = subtotal + taxAmt - (discount || 0);
      po.balanceDue = po.grandTotal - po.amountPaid;
    }
    if (notes !== undefined) po.notes = notes;
    if (expectedDeliveryDate) po.expectedDeliveryDate = expectedDeliveryDate;
    if (status) po.status = status;

    await po.save();
    res.json({ success: true, data: po });
  } catch (error) { next(error); }
};

// @desc Receive stock against PO
export const receiveStock = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const { items } = req.body; // [{ productId, receivedQuantity }]

    const po = await PurchaseOrder.findOne({ _id: req.params.id, businessId });
    if (!po) return res.status(404).json({ success: false, message: 'PO not found' });
    if (['received', 'cancelled'].includes(po.status)) {
      return res.status(400).json({ success: false, message: `PO is already ${po.status}` });
    }

    let allReceived = true;

    for (const received of items) {
      const poItem = po.items.find(i => i.productId.toString() === received.productId);
      if (!poItem) continue;

      const newReceived = Math.min(received.receivedQuantity, poItem.quantity - poItem.receivedQuantity);
      if (newReceived <= 0) continue;

      poItem.receivedQuantity += newReceived;
      if (poItem.receivedQuantity < poItem.quantity) allReceived = false;

      // Update product stock (tenant-scoped)
      const product = await Product.findOne({ _id: poItem.productId, businessId });
      if (product) {
        const prevStock = product.currentStock;
        product.currentStock += newReceived;
        // Update cost price if different
        if (poItem.unitCost !== product.costPrice) {
          product.costPrice = poItem.unitCost;
        }
        await product.save();

        await StockAdjustment.create({
          productId: product._id, productName: product.productName,
          type: 'add', quantity: newReceived,
          previousStock: prevStock, newStock: product.currentStock,
          reason: 'purchase', notes: `PO: ${po.poNumber}`,
          adjustedBy: req.user._id, adjustedByName: req.user.name, businessId,
        });
      }
    }

    // Check if all items fully received
    const fullyReceived = po.items.every(i => i.receivedQuantity >= i.quantity);
    if (fullyReceived) {
      po.status = 'received';
      po.receivedDate = new Date();
    } else {
      const anyReceived = po.items.some(i => i.receivedQuantity > 0);
      if (anyReceived) po.status = 'partially_received';
    }

    await po.save();
    logActivity(req.user._id, req.user.name, 'receive_stock', 'purchases', businessId, po._id, `Stock received for PO: ${po.poNumber}`);
    res.json({ success: true, data: po, message: fullyReceived ? 'All stock received' : 'Partial stock received' });
  } catch (error) { next(error); }
};

// @desc Record payment against PO
export const recordPOPayment = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero' });
    }

    const po = await PurchaseOrder.findOne({ _id: req.params.id, businessId });
    if (!po) return res.status(404).json({ success: false, message: 'PO not found' });

    const applied = Math.min(amount, Math.max(0, po.balanceDue));
    if (applied <= 0) {
      return res.status(400).json({ success: false, message: 'PO is already fully paid' });
    }

    po.amountPaid = (po.amountPaid || 0) + applied;
    po.balanceDue = Math.max(0, po.grandTotal - po.amountPaid);
    po.paymentStatus = po.balanceDue <= 0 ? 'paid' : po.amountPaid > 0 ? 'partial' : 'unpaid';
    await po.save();

    // Update supplier balance (tenant-scoped)
    await Supplier.findOneAndUpdate(
      { _id: po.supplierId, businessId },
      { $inc: { totalAmountDue: -applied } }
    );

    res.json({ success: true, data: po });
  } catch (error) { next(error); }
};

// @desc Cancel PO
export const cancelPurchaseOrder = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const po = await PurchaseOrder.findOne({ _id: req.params.id, businessId });
    if (!po) return res.status(404).json({ success: false, message: 'PO not found' });
    if (['received', 'cancelled'].includes(po.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel a ${po.status} PO` });
    }

    // Reverse supplier amount due (tenant-scoped)
    await Supplier.findOneAndUpdate(
      { _id: po.supplierId, businessId },
      { $inc: { totalAmountDue: -po.balanceDue } }
    );

    po.status = 'cancelled';
    await po.save();

    res.json({ success: true, message: 'PO cancelled', data: po });
  } catch (error) { next(error); }
};

// @desc Get auto-reorder suggestions
export const getReorderSuggestions = async (req, res, next) => {
  try {
    const products = await Product.find({
      businessId: req.user.businessId, isActive: true, isStockTracked: true,
      $expr: { $lte: ['$currentStock', '$reorderLevel'] },
    })
      .populate('supplier', 'supplierName')
      .select('productName sku currentStock reorderLevel lowStockThreshold costPrice supplier unit')
      .sort({ currentStock: 1 });

    res.json({ success: true, data: products });
  } catch (error) { next(error); }
};
