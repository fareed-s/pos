import mongoose from 'mongoose';

const productionItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  costPerUnit: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 },
});

const productionLogSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  items: [productionItemSchema],
  totalItemsProduced: { type: Number, default: 0 },
  totalProductionCost: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdByName: { type: String, default: '' },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
}, { timestamps: true });

productionLogSchema.index({ businessId: 1, date: -1 });

const ProductionLog = mongoose.model('ProductionLog', productionLogSchema);
export default ProductionLog;
