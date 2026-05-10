import mongoose from 'mongoose';

const cashHandoverSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  handedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  handedByName: { type: String, required: true },
  receivedBy: { type: String, default: 'Owner' },
  date: { type: Date, default: Date.now },
  notes: { type: String, default: '' },
  denomination: {
    n5000: { type: Number, default: 0 },
    n1000: { type: Number, default: 0 },
    n500: { type: Number, default: 0 },
    n100: { type: Number, default: 0 },
    n50: { type: Number, default: 0 },
    n20: { type: Number, default: 0 },
    n10: { type: Number, default: 0 },
    coins: { type: Number, default: 0 },
  },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
}, { timestamps: true });

cashHandoverSchema.index({ businessId: 1, date: -1 });

const CashHandover = mongoose.model('CashHandover', cashHandoverSchema);
export default CashHandover;
