import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Per-component (module) permission record. Stored as a Map so admins can grant
// or revoke specific actions on a per-staff basis without touching the role.
const permissionRecordSchema = new mongoose.Schema({
  add: { type: Boolean, default: false },
  edit: { type: Boolean, default: false },
  delete: { type: Boolean, default: false },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role: {
    type: String,
    enum: ['superadmin', 'businessadmin', 'manager', 'cashier'],
    required: true,
  },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
  phone: { type: String, default: '' },
  avatar: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  maxDiscountPercent: { type: Number, default: 0 },
  // Module → {add, edit, delete}. Empty for superadmin/businessadmin (they bypass).
  permissions: { type: Map, of: permissionRecordSchema, default: () => new Map() },
}, { timestamps: true });

userSchema.index({ email: 1, businessId: 1 }, { unique: true });
userSchema.index({ businessId: 1, role: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema);
export default User;
