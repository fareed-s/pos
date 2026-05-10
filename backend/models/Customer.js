import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  customerName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, default: '', trim: true },
  address: { street: String, city: String, area: String },
  customerType: {
    type: String,
    enum: ['walk-in', 'regular', 'wholesale', 'vip'],
    default: 'regular',
  },
  priceLevel: { type: String, enum: ['retail', 'wholesale'], default: 'retail' },
  creditLimit: { type: Number, default: 0 },
  currentBalance: { type: Number, default: 0 },
  loyaltyPoints: { type: Number, default: 0 },
  totalPurchases: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  lastPurchaseDate: Date,
  notes: { type: String, default: '' },
  tags: [String],
  isActive: { type: Boolean, default: true },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
}, { timestamps: true });

customerSchema.index({ businessId: 1, phone: 1 }, { unique: true });
customerSchema.index({ businessId: 1, customerName: 'text' });

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
