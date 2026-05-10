import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  supplierName: { type: String, required: true, trim: true },
  companyName: { type: String, default: '' },
  email: { type: String, default: '', trim: true },
  phone: { type: String, required: true, trim: true },
  address: { street: String, city: String, state: String, country: String },
  contactPerson: { type: String, default: '' },
  designation: { type: String, default: '' },
  taxNumber: { type: String, default: '' },
  bankDetails: { bankName: String, accountNumber: String, branchCode: String },
  paymentTerms: { type: String, default: 'COD' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  totalPurchases: { type: Number, default: 0 },
  totalAmountDue: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  rating: { type: Number, min: 1, max: 5, default: 3 },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
}, { timestamps: true });

supplierSchema.index({ businessId: 1, supplierName: 1 });
supplierSchema.index({ businessId: 1, phone: 1 });

const Supplier = mongoose.model('Supplier', supplierSchema);
export default Supplier;
