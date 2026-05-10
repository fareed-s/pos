import { z } from 'zod';

export const registerSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  businessType: z.enum(['retail', 'wholesale', 'both', 'pharmacy', 'restaurant', 'other']).optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export const productSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  costPrice: z.number().min(0, 'Cost price must be positive'),
  salePrice: z.number().min(0, 'Sale price must be positive'),
  wholesalePrice: z.number().min(0).optional(),
  minimumPrice: z.number().min(0).optional(),
  tax: z.number().min(0).max(100).optional(),
  discount: z.number().min(0).max(100).optional(),
  currentStock: z.number().min(0).optional(),
  lowStockThreshold: z.number().min(0).optional(),
  reorderLevel: z.number().min(0).optional(),
  unit: z.enum(['piece', 'kg', 'gram', 'liter', 'ml', 'box', 'carton', 'dozen', 'meter', 'pair', 'pack', 'set']).optional(),
  isStockTracked: z.boolean().optional(),
  hasVariants: z.boolean().optional(),
  variants: z.array(z.object({
    variantName: z.string(),
    sku: z.string(),
    barcode: z.string().optional(),
    costPrice: z.number().min(0),
    salePrice: z.number().min(0),
    currentStock: z.number().min(0).optional(),
  })).optional(),
  isFeatured: z.boolean().optional(),
  supplier: z.string().optional(),
  brand: z.string().optional(),
  expiryDate: z.string().optional(),
  batchNumber: z.string().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  parentCategory: z.string().nullable().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

// One module's permission record
const permissionRecord = z.object({
  add: z.boolean().optional(),
  edit: z.boolean().optional(),
  delete: z.boolean().optional(),
});
const permissionsSchema = z.record(z.string(), permissionRecord).optional();

export const staffCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  role: z.enum(['manager', 'cashier']),
  phone: z.string().optional(),
  maxDiscountPercent: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  permissions: permissionsSchema,
});

export const staffUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email').optional(),
  role: z.enum(['manager', 'cashier']).optional(),
  phone: z.string().optional(),
  maxDiscountPercent: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  permissions: permissionsSchema,
});

// Backwards compatibility alias (use staffCreateSchema for new code)
export const staffSchema = staffCreateSchema;

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  type: z.enum(['add', 'subtract']),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  reason: z.enum(['damaged', 'lost', 'count_correction', 'donation', 'returned', 'other']),
  notes: z.string().optional(),
});

export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }
};
