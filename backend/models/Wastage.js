import mongoose from 'mongoose';

const wastageSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0.01 },
  reason: { type: String, enum: ['expired', 'damaged', 'unsold', 'stale', 'burnt', 'other'], required: true },
  costPrice: { type: Number, default: 0 },
  totalLoss: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  date: { type: Date, default: Date.now },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recordedByName: { type: String, default: '' },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
}, { timestamps: true });

wastageSchema.index({ businessId: 1, date: -1 });
wastageSchema.index({ businessId: 1, productId: 1 });

const Wastage = mongoose.model('Wastage', wastageSchema);
export default Wastage;
