import express from 'express';
import { protect, protectWithBusiness } from '../middleware/auth.js';
import {
  getProductionSuggestions, getSmartDiscountSuggestions,
  getSupplierComparison, getStaffLeaderboard, getExpiryCountdown,
} from '../controllers/smartFeaturesController.js';

const router = express.Router();
router.use(protect, protectWithBusiness);

router.get('/production-suggestions', getProductionSuggestions);
router.get('/discount-suggestions', getSmartDiscountSuggestions);
router.get('/supplier-comparison', getSupplierComparison);
router.get('/staff-leaderboard', getStaffLeaderboard);
router.get('/expiry-countdown', getExpiryCountdown);

export default router;
