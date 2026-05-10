import express from 'express';
import { protect, protectWithBusiness, authorize } from '../middleware/auth.js';
import {
  salesSummary, salesByProduct, salesByCategory, salesByCashier,
  salesByCustomer, salesByHour, profitLoss, inventoryReport,
  taxReport, accountsReceivable, accountsPayable, purchaseSummary,
} from '../controllers/reportsController.js';

const router = express.Router();
router.use(protect, protectWithBusiness);

router.get('/sales-summary', authorize('businessadmin', 'manager'), salesSummary);
router.get('/sales-by-product', authorize('businessadmin', 'manager'), salesByProduct);
router.get('/sales-by-category', authorize('businessadmin', 'manager'), salesByCategory);
router.get('/sales-by-cashier', authorize('businessadmin'), salesByCashier);
router.get('/sales-by-customer', authorize('businessadmin', 'manager'), salesByCustomer);
router.get('/sales-by-hour', authorize('businessadmin', 'manager'), salesByHour);
router.get('/profit-loss', authorize('businessadmin'), profitLoss);
router.get('/inventory', authorize('businessadmin', 'manager'), inventoryReport);
router.get('/tax', authorize('businessadmin'), taxReport);
router.get('/accounts-receivable', authorize('businessadmin', 'manager'), accountsReceivable);
router.get('/accounts-payable', authorize('businessadmin', 'manager'), accountsPayable);
router.get('/purchase-summary', authorize('businessadmin', 'manager'), purchaseSummary);

export default router;
