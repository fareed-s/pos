import { Settings } from '../models/OtherModels.js';
import Sale from '../models/Sale.js';
import PurchaseOrder from '../models/PurchaseOrder.js';

// Generate sequential invoice number
export const generateInvoiceNo = async (businessId, prefix = 'INV') => {
  const lastSale = await Sale.findOne({ businessId })
    .sort({ createdAt: -1 })
    .select('invoiceNo');

  let nextNum = 1;
  if (lastSale && lastSale.invoiceNo) {
    const parts = lastSale.invoiceNo.split('-');
    const lastNum = parseInt(parts[parts.length - 1]);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}-${String(nextNum).padStart(5, '0')}`;
};

// Generate sequential PO number
export const generatePONumber = async (businessId, prefix = 'PO') => {
  const lastPO = await PurchaseOrder.findOne({ businessId })
    .sort({ createdAt: -1 })
    .select('poNumber');

  let nextNum = 1;
  if (lastPO && lastPO.poNumber) {
    const parts = lastPO.poNumber.split('-');
    const lastNum = parseInt(parts[parts.length - 1]);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}-${String(nextNum).padStart(5, '0')}`;
};

// Generate SKU
export const generateSKU = async (businessId, prefix = 'PROD') => {
  const Product = (await import('../models/Product.js')).default;
  const count = await Product.countDocuments({ businessId });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
};

// Strong random password generator. Always satisfies validator regex
// (at least one uppercase + at least one digit, length >= 8).
export const generatePassword = (length = 12) => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';        // no I, O — readability
  const lower = 'abcdefghijkmnopqrstuvwxyz';        // no l
  const digits = '23456789';                        // no 0, 1
  const symbols = '!@#$%^&*?';
  const all = upper + lower + digits + symbols;

  const pick = (s) => s[Math.floor(Math.random() * s.length)];
  const len = Math.max(8, Number(length) || 12);

  // Guarantee at least one of each character class
  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  const remaining = Array.from({ length: len - required.length }, () => pick(all));
  const out = [...required, ...remaining];

  // Fisher-Yates shuffle so the required chars aren't always at the front
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join('');
};

// Get business settings
export const getSettings = async (businessId) => {
  let settings = await Settings.findOne({ businessId });
  if (!settings) {
    settings = await Settings.create({ businessId });
  }
  return settings;
};

// Pagination helper
export const paginate = (query, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  return query.skip(skip).limit(limit);
};

// Date range filter helper
export const dateRangeFilter = (startDate, endDate, field = 'createdAt') => {
  const filter = {};
  if (startDate) filter[field] = { $gte: new Date(startDate) };
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filter[field] = { ...filter[field], $lte: end };
  }
  return filter;
};
