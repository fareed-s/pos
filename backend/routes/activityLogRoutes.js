import express from 'express';
import { protect, protectWithBusiness, authorize } from '../middleware/auth.js';
import { getActivityLogs } from '../controllers/activityLogController.js';

const router = express.Router();
router.use(protect, protectWithBusiness, authorize('businessadmin'));
router.get('/', getActivityLogs);

export default router;
