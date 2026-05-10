import mongoose from 'mongoose';

// Activity Log
const activityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  action: { type: String, required: true },
  module: { type: String, required: true },
  recordId: { type: mongoose.Schema.Types.ObjectId },
  details: { type: String, default: '' },
  ipAddress: { type: String, default: '' },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
}, { timestamps: true });
activityLogSchema.index({ businessId: 1, createdAt: -1 });
activityLogSchema.index({ businessId: 1, userId: 1 });
export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

// Notification
const notificationSchema = new mongoose.Schema({
  type: { type: String, enum: ['low_stock', 'new_order', 'payment_due', 'system', 'info'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
}, { timestamps: true });
notificationSchema.index({ businessId: 1, userId: 1, isRead: 1 });
export const Notification = mongoose.model('Notification', notificationSchema);

// Settings
const settingsSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, unique: true },
  taxRate: { type: Number, default: 17 },
  taxInclusive: { type: Boolean, default: false },
  currency: { type: String, default: 'PKR' },
  currencySymbol: { type: String, default: 'Rs.' },
  invoicePrefix: { type: String, default: 'INV' },
  poPrefix: { type: String, default: 'PO' },
  skuPrefix: { type: String, default: 'PROD' },
  autoSku: { type: Boolean, default: true },
  maxCashierDiscount: { type: Number, default: 10 },
  allowNegativeStock: { type: Boolean, default: false },
  requireCustomer: { type: Boolean, default: false },
  sessionTimeout: { type: Number, default: 480 },
  receiptDesign: {
    headerAlignment: { type: String, default: 'center' },
    showLogo: { type: Boolean, default: true },
    footerText: { type: String, default: 'Thank you for your business!' },
    showTaxDetails: { type: Boolean, default: true },
    showDiscount: { type: Boolean, default: true },
    showBarcode: { type: Boolean, default: true },
    receiptWidth: { type: String, enum: ['58mm', '80mm'], default: '80mm' },
  },
  loyaltyPointsRate: { type: Number, default: 1 },
  loyaltyPointsValue: { type: Number, default: 100 },
  loyaltyPointsExpiry: { type: Number, default: 365 },
}, { timestamps: true });
export const Settings = mongoose.model('Settings', settingsSchema);

// Subscription
const subscriptionSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  plan: {
    type: String,
    enum: [
      'trial', 'monthly', 'half_yearly', 'yearly', 'custom',
      // legacy keys
      'free_trial', 'basic', 'premium',
    ],
    default: 'trial',
  },
  // Custom pricing (per-user, set by super admin). 0 means free / not billed.
  price: { type: Number, default: 0, min: 0 },
  currency: { type: String, default: 'PKR' },
  // Duration in days that produced the current cycle's endDate.
  durationDays: { type: Number, default: 7, min: 1 },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  maxProducts: { type: Number, default: -1 },
  maxStaff: { type: Number, default: -1 },
  maxLocations: { type: Number, default: -1 },
  isActive: { type: Boolean, default: true },
  notes: { type: String, default: '' },
}, { timestamps: true });
subscriptionSchema.index({ businessId: 1 });
subscriptionSchema.index({ endDate: 1 });

subscriptionSchema.virtual('isExpired').get(function () {
  return !!(this.endDate && this.endDate.getTime() < Date.now());
});
subscriptionSchema.virtual('daysRemaining').get(function () {
  if (!this.endDate) return null;
  const ms = this.endDate.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
});
subscriptionSchema.set('toJSON', { virtuals: true });
subscriptionSchema.set('toObject', { virtuals: true });

export const Subscription = mongoose.model('Subscription', subscriptionSchema);

// Location
const locationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { street: String, city: String, state: String },
  phone: { type: String, default: '' },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
}, { timestamps: true });
locationSchema.index({ businessId: 1 });
export const Location = mongoose.model('Location', locationSchema);

// Customer Payment
const customerPaymentSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['cash', 'card', 'online', 'cheque'], default: 'cash' },
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
  notes: { type: String, default: '' },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
}, { timestamps: true });
customerPaymentSchema.index({ businessId: 1, customerId: 1 });
export const CustomerPayment = mongoose.model('CustomerPayment', customerPaymentSchema);

// Sale Return
const saleReturnSchema = new mongoose.Schema({
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
  invoiceNo: { type: String, required: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: String,
    quantity: Number,
    unitPrice: Number,
    lineTotal: Number,
  }],
  refundAmount: { type: Number, required: true },
  refundMethod: { type: String, enum: ['cash', 'credit', 'exchange'], default: 'cash' },
  reason: { type: String, required: true },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
}, { timestamps: true });
saleReturnSchema.index({ businessId: 1, saleId: 1 });
export const SaleReturn = mongoose.model('SaleReturn', saleReturnSchema);

// Held Sale
const heldSaleSchema = new mongoose.Schema({
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: String,
    sku: String,
    quantity: Number,
    unitPrice: Number,
    discount: Number,
    tax: Number,
    lineTotal: Number,
  }],
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, default: 'Walk-in Customer' },
  cashierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notes: { type: String, default: '' },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
}, { timestamps: true });
heldSaleSchema.index({ businessId: 1, cashierId: 1 });
export const HeldSale = mongoose.model('HeldSale', heldSaleSchema);

// Stock Transfer
const stockTransferSchema = new mongoose.Schema({
  fromLocation: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
  toLocation: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: String,
    quantity: Number,
  }],
  status: { type: String, enum: ['pending', 'approved', 'completed', 'rejected'], default: 'pending' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, default: '' },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
}, { timestamps: true });
stockTransferSchema.index({ businessId: 1, status: 1 });
export const StockTransfer = mongoose.model('StockTransfer', stockTransferSchema);
