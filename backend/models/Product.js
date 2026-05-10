import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  variantName: { type: String, required: true },
  sku: { type: String, required: true },
  barcode: { type: String, default: '' },
  costPrice: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, required: true, min: 0 },
  currentStock: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  isActive: { type: Boolean, default: true },
});

const productSchema = new mongoose.Schema({
  productName: { type: String, required: true, trim: true },
  sku: { type: String, required: true, trim: true },
  barcode: { type: String, default: '', trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  description: { type: String, default: '' },
  images: [{ type: String }],

  // Pricing
  costPrice: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, required: true, min: 0 },
  wholesalePrice: { type: Number, default: 0, min: 0 },
  minimumPrice: { type: Number, default: 0, min: 0 },
  tax: { type: Number, default: 0, min: 0, max: 100 },
  discount: { type: Number, default: 0, min: 0, max: 100 },
  profitMargin: { type: Number, default: 0 },

  // Inventory
  currentStock: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  reorderLevel: { type: Number, default: 10 },
  unit: {
    type: String,
    enum: ['piece', 'kg', 'gram', 'liter', 'ml', 'box', 'carton', 'dozen', 'meter', 'pair', 'pack', 'set'],
    default: 'piece',
  },
  isStockTracked: { type: Boolean, default: true },

  // Variants
  hasVariants: { type: Boolean, default: false },
  variants: [variantSchema],

  // Status
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },

  // References
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  brand: { type: String, default: '' },
  weight: { type: String, default: '' },
  dimensions: { type: String, default: '' },
  expiryDate: Date,
  batchNumber: { type: String, default: '' },

  // Tenant
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
}, { timestamps: true });

productSchema.index({ businessId: 1, sku: 1 }, { unique: true });
productSchema.index({ businessId: 1, barcode: 1 }, { sparse: true });
productSchema.index({ businessId: 1, productName: 'text' });
productSchema.index({ businessId: 1, category: 1 });
productSchema.index({ businessId: 1, currentStock: 1 });
productSchema.index({ businessId: 1, isActive: 1 });

productSchema.pre('save', function (next) {
  this.profitMargin = this.salePrice - this.costPrice;
  next();
});

const Product = mongoose.model('Product', productSchema);
export default Product;
