import mongoose from 'mongoose';

const poItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitCost: { type: Number, required: true, min: 0 },
  receivedQuantity: { type: Number, default: 0 },
  lineTotal: { type: Number, required: true },
});

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: { type: String, required: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  items: [poItemSchema],
  subtotal: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['draft', 'ordered', 'partially_received', 'received', 'cancelled'],
    default: 'draft',
  },
  orderDate: { type: Date, default: Date.now },
  expectedDeliveryDate: Date,
  receivedDate: Date,
  paymentStatus: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },
  amountPaid: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
}, { timestamps: true });

purchaseOrderSchema.index({ businessId: 1, poNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ businessId: 1, supplierId: 1 });
purchaseOrderSchema.index({ businessId: 1, status: 1 });

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
export default PurchaseOrder;
