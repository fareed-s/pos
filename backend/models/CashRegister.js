import mongoose from 'mongoose';

const cashTransactionSchema = new mongoose.Schema({
  registerId: { type: mongoose.Schema.Types.ObjectId, ref: 'CashRegister', required: true },
  type: { type: String, enum: ['in', 'out'], required: true },
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
  reference: { type: String, default: '' },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  performedByName: { type: String, default: '' },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
}, { timestamps: true });

const cashRegisterSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  openingBalance: { type: Number, required: true, default: 0 },
  closingBalance: { type: Number, default: 0 },
  expectedBalance: { type: Number, default: 0 },
  difference: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  totalReturns: { type: Number, default: 0 },
  totalCashIn: { type: Number, default: 0 },
  totalCashOut: { type: Number, default: 0 },
  cashierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cashierName: { type: String, default: '' },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  closedAt: Date,
  notes: { type: String, default: '' },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
}, { timestamps: true });

cashRegisterSchema.index({ businessId: 1, date: -1 });
cashRegisterSchema.index({ businessId: 1, cashierId: 1, status: 1 });

export const CashTransaction = mongoose.model('CashTransaction', cashTransactionSchema);
const CashRegister = mongoose.model('CashRegister', cashRegisterSchema);
export default CashRegister;
