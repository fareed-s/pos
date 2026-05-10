import express from 'express';
import { protect, protectWithBusiness, authorize } from '../middleware/auth.js';
import {
  getWastages, createWastage,
  getProductionLogs, createProductionLog,
  getCashHandovers, createCashHandover,
  bulkUpdatePrices,
  getDailySummary,
  getUdharRegister,
} from '../controllers/bakeryFeaturesController.js';

const router = express.Router();
router.use(protect, protectWithBusiness);

// Wastage
router.get('/wastage', getWastages);
router.post('/wastage', createWastage);

// Production
router.get('/production', getProductionLogs);
router.post('/production', createProductionLog);

// Cash Handover
router.get('/cash-handover', getCashHandovers);
router.post('/cash-handover', createCashHandover);

// Bulk Price Update (admin/manager only)
router.post('/bulk-price-update', authorize('businessadmin', 'manager'), bulkUpdatePrices);

// Daily Summary
router.get('/daily-summary', getDailySummary);

// Udhar Register
router.get('/udhar', getUdharRegister);

export default router;
