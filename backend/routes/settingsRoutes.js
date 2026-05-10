import express from 'express';
import { protect, protectWithBusiness, authorize } from '../middleware/auth.js';
import { getSettings, updateSettings, getBusinessProfile, updateBusinessProfile } from '../controllers/settingsController.js';

const router = express.Router();

router.use(protect, protectWithBusiness);

router.route('/')
  .get(getSettings)
  .put(authorize('businessadmin'), updateSettings);

router.route('/business-profile')
  .get(getBusinessProfile)
  .put(authorize('businessadmin'), updateBusinessProfile);

export default router;
