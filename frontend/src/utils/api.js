import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;

    if (status === 401) {
      // Token expired or invalid
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (status === 403 && code === 'SUBSCRIPTION_EXPIRED') {
      // Backend has blocked a write because the subscription is expired.
      toast.error('Subscription expired — view-only mode active. Contact admin to renew.');
    }
    return Promise.reject(error);
  }
);

// Auth API (public registration is disabled)
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// SuperAdmin API
export const superadminAPI = {
  getStats: () => api.get('/superadmin/stats'),
  getExpiries: () => api.get('/superadmin/expiries'),
  getBusinesses: (params) => api.get('/superadmin/businesses', { params }),
  createBusiness: (data) => api.post('/superadmin/businesses', data),
  updateBusiness: (id, data) => api.put(`/superadmin/businesses/${id}`, data),
  deleteBusiness: (id) => api.delete(`/superadmin/businesses/${id}`),
  approveBusiness: (id) => api.put(`/superadmin/businesses/${id}/approve`),
  rejectBusiness: (id, reason) => api.put(`/superadmin/businesses/${id}/reject`, { reason }),
  toggleBusiness: (id) => api.put(`/superadmin/businesses/${id}/toggle`),
  updatePlan: (id, data) => api.put(`/superadmin/businesses/${id}/plan`, data),
  resetPassword: (id, data = {}) => api.put(`/superadmin/businesses/${id}/reset-password`, data),
};

// Product API
export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  search: (q) => api.get('/products/search', { params: { q } }),
  getByBarcode: (code) => api.get(`/products/barcode/${code}`),
  getLowStock: () => api.get('/products/low-stock'),
  getExpiryTracker: () => api.get('/products/expiry-tracker'),
  getFeatured: () => api.get('/products/featured'),
  adjustStock: (data) => api.post('/products/stock/adjust', data),
  getStockAdjustments: (params) => api.get('/products/stock/adjustments', { params }),
  bulkCreate: (rows) => api.post('/products/bulk', { rows }),
};

// Upload API — returns { url, mimeType, size }. The URL is server-relative
// (`/uploads/...`) and will be prefixed with the API origin when displayed.
export const uploadAPI = {
  khataImage: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/upload/khata/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  khataVoice: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/upload/khata/voice', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// Category API
export const categoryAPI = {
  getAll: () => api.get('/categories'),
  getTree: () => api.get('/categories/tree'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Staff API
export const staffAPI = {
  getAll: () => api.get('/staff'),
  getModules: () => api.get('/staff/modules'),
  create: (data) => api.post('/staff', data),
  update: (id, data) => api.put(`/staff/${id}`, data),
  delete: (id) => api.delete(`/staff/${id}`),
  resetPassword: (id, newPassword) => api.put(`/staff/${id}/reset-password`, { newPassword }),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// Sales API
export const salesAPI = {
  getAll: (params) => api.get('/sales', { params }),
  getOne: (id) => api.get(`/sales/${id}`),
  create: (data) => api.post('/sales', data),
  void: (id, reason) => api.post(`/sales/${id}/void`, { reason }),
  return: (id, data) => api.post(`/sales/${id}/return`, data),
  hold: (data) => api.post('/sales/hold', data),
  getHeld: () => api.get('/sales/held'),
  resumeHeld: (id) => api.delete(`/sales/held/${id}`),
  getTodaySummary: () => api.get('/sales/today-summary'),
};

// Customer API
export const customerAPI = {
  getAll: (params) => api.get('/customers', { params }),
  search: (q) => api.get('/customers/search', { params: { q } }),
  quickAdd: (data) => api.post('/customers/quick-add', data),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  getHistory: (id, params) => api.get(`/customers/${id}/history`, { params }),
  recordPayment: (id, data) => api.post(`/customers/${id}/payment`, data),
  getStatement: (id) => api.get(`/customers/${id}/statement`),
};

// Settings API
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  getProfile: () => api.get('/settings/business-profile'),
  updateProfile: (data) => api.put('/settings/business-profile', data),
};

// Supplier API
export const supplierAPI = {
  getAll: (params) => api.get('/suppliers', { params }),
  getOne: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
  getLedger: (id) => api.get(`/suppliers/${id}/ledger`),
};

// Purchase Order API
export const purchaseAPI = {
  getAll: (params) => api.get('/purchases', { params }),
  getOne: (id) => api.get(`/purchases/${id}`),
  create: (data) => api.post('/purchases', data),
  update: (id, data) => api.put(`/purchases/${id}`, data),
  receiveStock: (id, data) => api.post(`/purchases/${id}/receive`, data),
  recordPayment: (id, data) => api.post(`/purchases/${id}/payment`, data),
  cancel: (id) => api.post(`/purchases/${id}/cancel`),
  getReorderSuggestions: () => api.get('/purchases/reorder-suggestions'),
};

// Expense API
export const expenseAPI = {
  getAll: (params) => api.get('/expenses', { params }),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
  getCategories: () => api.get('/expenses/categories'),
  createCategory: (data) => api.post('/expenses/categories', data),
};

// Cash Register API
export const cashRegisterAPI = {
  open: (data) => api.post('/cash-register/open', data),
  getCurrent: () => api.get('/cash-register/current'),
  recordTransaction: (data) => api.post('/cash-register/transaction', data),
  close: (data) => api.post('/cash-register/close', data),
  getHistory: (params) => api.get('/cash-register/history', { params }),
};

// Reports API
export const reportsAPI = {
  salesSummary: (params) => api.get('/reports/sales-summary', { params }),
  salesByProduct: (params) => api.get('/reports/sales-by-product', { params }),
  salesByCategory: (params) => api.get('/reports/sales-by-category', { params }),
  salesByCashier: (params) => api.get('/reports/sales-by-cashier', { params }),
  salesByCustomer: (params) => api.get('/reports/sales-by-customer', { params }),
  salesByHour: (params) => api.get('/reports/sales-by-hour', { params }),
  profitLoss: (params) => api.get('/reports/profit-loss', { params }),
  inventory: () => api.get('/reports/inventory'),
  tax: (params) => api.get('/reports/tax', { params }),
  accountsReceivable: () => api.get('/reports/accounts-receivable'),
  accountsPayable: () => api.get('/reports/accounts-payable'),
  purchaseSummary: (params) => api.get('/reports/purchase-summary', { params }),
};

// Activity Log API
export const activityLogAPI = {
  getAll: (params) => api.get('/activity-logs', { params }),
};

// Bakery Features API
export const bakeryAPI = {
  // Wastage
  getWastages: (params) => api.get('/bakery/wastage', { params }),
  createWastage: (data) => api.post('/bakery/wastage', data),
  // Production
  getProduction: (params) => api.get('/bakery/production', { params }),
  createProduction: (data) => api.post('/bakery/production', data),
  // Cash Handover
  getHandovers: (params) => api.get('/bakery/cash-handover', { params }),
  createHandover: (data) => api.post('/bakery/cash-handover', data),
  // Bulk Price
  bulkUpdatePrices: (data) => api.post('/bakery/bulk-price-update', data),
  // Daily Summary
  getDailySummary: (params) => api.get('/bakery/daily-summary', { params }),
  // Udhar
  getUdhar: () => api.get('/bakery/udhar'),
};

// Smart Features API
export const smartAPI = {
  getProductionSuggestions: (params) => api.get('/smart/production-suggestions', { params }),
  getDiscountSuggestions: () => api.get('/smart/discount-suggestions'),
  getSupplierComparison: () => api.get('/smart/supplier-comparison'),
  getStaffLeaderboard: (params) => api.get('/smart/staff-leaderboard', { params }),
  getExpiryCountdown: () => api.get('/smart/expiry-countdown'),
};

export default api;
