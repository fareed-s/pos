import mongoose from 'mongoose';

const expenseCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  isDefault: { type: Boolean, default: false },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
}, { timestamps: true });

expenseCategorySchema.index({ businessId: 1, name: 1 }, { unique: true });

const expenseSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0 },
  category: { type: String, required: true },
  date: { type: Date, default: Date.now },
  description: { type: String, default: '' },
  paymentMethod: { type: String, enum: ['cash', 'card', 'online', 'cheque'], default: 'cash' },
  receipt: { type: String, default: '' },
  isRecurring: { type: Boolean, default: false },
  recurringFrequency: { type: String, enum: ['monthly', 'weekly', 'yearly', ''], default: '' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
}, { timestamps: true });

expenseSchema.index({ businessId: 1, date: -1 });
expenseSchema.index({ businessId: 1, category: 1 });

export const ExpenseCategory = mongoose.model('ExpenseCategory', expenseCategorySchema);
const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
