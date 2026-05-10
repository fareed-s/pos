import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getGlobalStats, getAllBusinesses,
  createBusiness, updateBusiness, deleteBusiness,
  approveBusiness, rejectBusiness, toggleBusiness,
  updatePlan, resetAdminPassword, getUpcomingExpiries,
} from '../controllers/superadminController.js';

const router = express.Router();

router.use(protect, authorize('superadmin'));

router.get('/stats', getGlobalStats);
router.get('/expiries', getUpcomingExpiries);

router.route('/businesses')
  .get(getAllBusinesses)
  .post(createBusiness);

router.route('/businesses/:id')
  .put(updateBusiness)
  .delete(deleteBusiness);

router.put('/businesses/:id/approve', approveBusiness);
router.put('/businesses/:id/reject', rejectBusiness);
router.put('/businesses/:id/toggle', toggleBusiness);
router.put('/businesses/:id/plan', updatePlan);
router.put('/businesses/:id/reset-password', resetAdminPassword);

export default router;
