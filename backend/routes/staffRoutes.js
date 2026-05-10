import express from 'express';
import { protect, protectWithBusiness, authorize } from '../middleware/auth.js';
import {
  getStaff, createStaff, updateStaff, resetStaffPassword, deleteStaff, getPermissionModules,
} from '../controllers/staffController.js';
import { validate, staffCreateSchema, staffUpdateSchema } from '../validators/index.js';

const router = express.Router();

router.use(protect, protectWithBusiness, authorize('businessadmin'));

router.get('/modules', getPermissionModules);

router.route('/')
  .get(getStaff)
  .post(validate(staffCreateSchema), createStaff);

router.route('/:id')
  .put(validate(staffUpdateSchema), updateStaff)
  .delete(deleteStaff);

router.put('/:id/reset-password', resetStaffPassword);

export default router;
