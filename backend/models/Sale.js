import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  sku: { type: String, default: '' },
  variantId: { type: mongoose.Schema.Types.ObjectId },
  variantName: { type: String, default: '' },
  quantity: { type: Number, required: true, min: 0.01 },
  unitPrice: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  discountAmount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  lineTotal: { type: Number, required: true },
});

const paymentSchema = new mongoose.Schema({
  method: { type: String, enum: ['cash', 'card', 'online', 'cheque', 'credit'], required: true },
  amount: { type: Number, required: true, min: 0 },
  reference: { type: String, default: '' },
});

const saleSchema = new mongoose.Schema({
  invoiceNo: { type: String, required: true },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, default: 'Walk-in Customer' },
  cashierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cashierName: { type: String, default: '' },
  items: [saleItemSchema],
  subtotal: { type: Number, required: true, default: 0 },
  taxTotal: { type: Number, default: 0 },
  discountTotal: { type: Number, default: 0 },
  discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  discountValue: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true, default: 0 },
  payments: [paymentSchema],
  amountTendered: { type: Number, default: 0 },
  changeGiven: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['completed', 'held', 'voided', 'returned'],
    default: 'completed',
  },
  notes: { type: String, default: '' },
  voidReason: { type: String, default: '' },
  voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  voidedAt: Date,
  saleDate: { type: Date, default: Date.now },

  // Khata (udhar) proof — populated only when payment method is 'credit' and the
  // shopkeeper marks the buyer as "someone else" (proxy collecting on behalf
  // of the registered customer). URLs point at /uploads/khata/... served by
  // express.static. Cloudinary can replace this layer without schema change.
  udharType: { type: String, enum: ['self', 'someone_else'], default: undefined },
  udharProxyName: { type: String, default: '' },
  udharProofImage: { type: String, default: '' },
  udharProofVoice: { type: String, default: '' },
}, { timestamps: true });

saleSchema.index({ businessId: 1, invoiceNo: 1 }, { unique: true });
saleSchema.index({ businessId: 1, saleDate: -1 });
saleSchema.index({ businessId: 1, customerId: 1 });
saleSchema.index({ businessId: 1, cashierId: 1 });
saleSchema.index({ businessId: 1, status: 1 });

const Sale = mongoose.model('Sale', saleSchema);
export default Sale;
