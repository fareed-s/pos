export const ROLES = {
  SUPER_ADMIN: 'superadmin',
  BUSINESS_ADMIN: 'businessadmin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
};

export const BUSINESS_TYPES = ['retail', 'wholesale', 'both', 'pharmacy', 'restaurant', 'other'];

export const PLAN_TYPES = {
  TRIAL: 'trial',
  MONTHLY: 'monthly',
  HALF_YEARLY: 'half_yearly',
  YEARLY: 'yearly',
  CUSTOM: 'custom',
  // Legacy keys (kept so existing seeds/data stay valid)
  FREE_TRIAL: 'free_trial',
  BASIC: 'basic',
  PREMIUM: 'premium',
};

// Default duration (super admin can override per-user). -1 limits = unlimited.
export const PLAN_LIMITS = {
  trial: { maxProducts: 50, maxStaff: 3, maxLocations: 1, durationDays: 7, alertDays: 1, label: 'Trial' },
  monthly: { maxProducts: -1, maxStaff: -1, maxLocations: -1, durationDays: 30, alertDays: 3, label: 'Monthly' },
  half_yearly: { maxProducts: -1, maxStaff: -1, maxLocations: -1, durationDays: 180, alertDays: 15, label: '6 Months' },
  yearly: { maxProducts: -1, maxStaff: -1, maxLocations: -1, durationDays: 365, alertDays: 30, label: 'Yearly' },
  custom: { maxProducts: -1, maxStaff: -1, maxLocations: -1, durationDays: 30, alertDays: 3, label: 'Custom' },
  // Legacy fallbacks
  free_trial: { maxProducts: 50, maxStaff: 2, maxLocations: 1, durationDays: 14, alertDays: 3, label: 'Free Trial' },
  basic: { maxProducts: 500, maxStaff: 5, maxLocations: 2, durationDays: 30, alertDays: 3, label: 'Basic' },
  premium: { maxProducts: -1, maxStaff: -1, maxLocations: -1, durationDays: 30, alertDays: 3, label: 'Premium' },
};

// Number of days before expiry that a warning should appear, by plan
export const expiryAlertDays = (plan) => (PLAN_LIMITS[plan]?.alertDays ?? 3);

export const PRODUCT_UNITS = ['piece', 'kg', 'gram', 'liter', 'ml', 'box', 'carton', 'dozen', 'meter', 'pair', 'pack', 'set'];

export const SALE_STATUS = {
  COMPLETED: 'completed',
  HELD: 'held',
  VOIDED: 'voided',
  RETURNED: 'returned',
};

export const PAYMENT_METHODS = ['cash', 'card', 'online', 'cheque', 'credit'];

export const PO_STATUS = {
  DRAFT: 'draft',
  ORDERED: 'ordered',
  PARTIALLY_RECEIVED: 'partially_received',
  RECEIVED: 'received',
  CANCELLED: 'cancelled',
};

export const CUSTOMER_TYPES = ['walk-in', 'regular', 'wholesale', 'vip'];

export const PRICE_LEVELS = ['retail', 'wholesale'];

export const STOCK_ADJUSTMENT_TYPES = ['add', 'subtract'];

export const STOCK_ADJUSTMENT_REASONS = ['damaged', 'lost', 'count_correction', 'donation', 'returned', 'other'];

export const EXPENSE_CATEGORIES_DEFAULT = [
  'Rent', 'Salaries', 'Utilities', 'Transport', 'Maintenance', 'Supplies', 'Marketing', 'Other'
];

// Modules used by the per-staff permission matrix.
// Keep keys stable — they're persisted on User.permissions and used by middleware.
export const PERMISSION_MODULES = [
  { key: 'products',     label: 'Products' },
  { key: 'categories',   label: 'Categories' },
  { key: 'inventory',    label: 'Inventory / Stock' },
  { key: 'customers',    label: 'Customers' },
  { key: 'suppliers',    label: 'Suppliers' },
  { key: 'purchases',    label: 'Purchases' },
  { key: 'sales',        label: 'Sales / POS' },
  { key: 'expenses',     label: 'Expenses' },
  { key: 'staff',        label: 'Staff' },
  { key: 'cash_register',label: 'Cash Register' },
  { key: 'production',   label: 'Production Log' },
  { key: 'wastage',      label: 'Wastage' },
  { key: 'bulk_pricing', label: 'Bulk Price Update' },
  { key: 'reports',      label: 'Reports' },
  { key: 'settings',     label: 'Settings' },
];

// Sensible defaults for newly-created staff — admin can override per user.
export const DEFAULT_PERMISSIONS = {
  manager: PERMISSION_MODULES.reduce((acc, m) => {
    if (m.key === 'staff' || m.key === 'settings') {
      acc[m.key] = { add: false, edit: false, delete: false };
    } else {
      acc[m.key] = { add: true, edit: true, delete: m.key !== 'staff' };
    }
    return acc;
  }, {}),
  cashier: PERMISSION_MODULES.reduce((acc, m) => {
    const writable = ['sales', 'customers', 'cash_register', 'production', 'wastage'];
    acc[m.key] = {
      add: writable.includes(m.key),
      edit: writable.includes(m.key),
      delete: false,
    };
    return acc;
  }, {}),
};
