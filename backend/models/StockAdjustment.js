import mongoose from 'mongoose';

const stockAdjustmentSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  type: { type: String, enum: ['add', 'subtract'], required: true },
  quantity: { type: Number, required: true, min: 1 },
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  reason: {
    type: String,
    enum: ['damaged', 'lost', 'count_correction', 'donation', 'returned', 'purchase', 'sale', 'transfer', 'other'],
    required: true,
  },
  notes: { type: String, default: '' },
  // Optional batch traceability. When stock arrives via a quick-add from the
  // Products page, we capture the supplier's batch + expiry + the cost paid
  // for THIS receipt — so later we can trace "which batch had the issue"
  // and the Expiry Tracker page can surface what's about to die on the shelf.
  batchNumber: { type: String, default: '' },
  expiryDate: { type: Date },
  unitCostAtReceipt: { type: Number },
  adjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adjustedByName: { type: String, default: '' },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
}, { timestamps: true });

stockAdjustmentSchema.index({ businessId: 1, productId: 1 });
stockAdjustmentSchema.index({ businessId: 1, createdAt: -1 });

const StockAdjustment = mongoose.model('StockAdjustment', stockAdjustmentSchema);
export default StockAdjustment;
