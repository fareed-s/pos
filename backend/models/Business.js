import mongoose from 'mongoose';

const businessSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'Pakistan' },
  },
  logo: { type: String, default: '' },
  businessType: {
    type: String,
    enum: ['retail', 'wholesale', 'both', 'pharmacy', 'restaurant', 'other'],
    default: 'retail',
  },
  ownerName: { type: String, required: true },
  taxNumber: { type: String, default: '' },
  website: { type: String, default: '' },
  currency: { type: String, default: 'PKR' },
  timezone: { type: String, default: 'Asia/Karachi' },
  fiscalYearStart: { type: Number, default: 1, min: 1, max: 12 },
  isApproved: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  approvedAt: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: String,
}, { timestamps: true });

businessSchema.index({ isApproved: 1, isActive: 1 });

const Business = mongoose.model('Business', businessSchema);
export default Business;
