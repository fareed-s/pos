import express from 'express';
import { protect, protectWithBusiness, authorize } from '../middleware/auth.js';
import { getDashboardStats } from '../controllers/dashboardController.js';

const router = express.Router();

router.use(protect, protectWithBusiness);
router.get('/stats', getDashboardStats);

export default router;
