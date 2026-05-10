import Supplier from '../models/Supplier.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import { logActivity } from '../middleware/activityLog.js';

// @desc Get all suppliers
export const getSuppliers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const query = { businessId: req.user.businessId };
    if (search) {
      query.$or = [
        { supplierName: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) query.status = status;

    const total = await Supplier.countDocuments(query);
    const suppliers = await Supplier.find(query)
      .sort({ supplierName: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, data: suppliers, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

// @desc Get single supplier
export const getSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, businessId: req.user.businessId });
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

    const purchaseStats = await PurchaseOrder.aggregate([
      { $match: { supplierId: supplier._id, businessId: supplier.businessId } },
      { $group: { _id: null, totalOrders: { $sum: 1 }, totalAmount: { $sum: '$grandTotal' }, totalPaid: { $sum: '$amountPaid' } } },
    ]);

    res.json({ success: true, data: { ...supplier.toObject(), stats: purchaseStats[0] || { totalOrders: 0, totalAmount: 0, totalPaid: 0 } } });
  } catch (error) { next(error); }
};

// @desc Create supplier
export const createSupplier = async (req, res, next) => {
  try {
    const data = { ...req.body, businessId: req.user.businessId };
    const supplier = await Supplier.create(data);
    logActivity(req.user._id, req.user.name, 'create', 'suppliers', req.user.businessId, supplier._id, `Created supplier: ${supplier.supplierName}`);
    res.status(201).json({ success: true, data: supplier });
  } catch (error) { next(error); }
};

// @desc Update supplier
export const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, businessId: req.user.businessId },
      req.body, { new: true, runValidators: true }
    );
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    res.json({ success: true, data: supplier });
  } catch (error) { next(error); }
};

// @desc Delete supplier (soft)
export const deleteSupplier = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const poCount = await PurchaseOrder.countDocuments({
      supplierId: req.params.id, businessId, status: { $nin: ['cancelled', 'received'] },
    });
    if (poCount > 0) return res.status(400).json({ success: false, message: `Cannot delete. ${poCount} active purchase orders exist.` });

    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, businessId },
      { status: 'inactive' }, { new: true }
    );
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    res.json({ success: true, message: 'Supplier deactivated' });
  } catch (error) { next(error); }
};

// @desc Get supplier ledger (payment history)
export const getSupplierLedger = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const supplier = await Supplier.findOne({ _id: req.params.id, businessId })
      .select('supplierName totalAmountDue');
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

    const orders = await PurchaseOrder.find({
      supplierId: req.params.id, businessId,
    }).sort({ orderDate: -1 }).select('poNumber grandTotal amountPaid balanceDue status paymentStatus orderDate');

    res.json({ success: true, data: { supplier, orders } });
  } catch (error) { next(error); }
};
