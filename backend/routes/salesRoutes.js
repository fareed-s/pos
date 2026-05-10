import express from 'express';
import { protect, protectWithBusiness, authorize } from '../middleware/auth.js';
import {
  createSale, getSales, getSale, voidSale, processReturn,
  holdSale, getHeldSales, resumeHeldSale, getTodaySummary,
} from '../controllers/salesController.js';

const router = express.Router();

router.use(protect, protectWithBusiness);

router.get('/today-summary', getTodaySummary);
router.get('/held', getHeldSales);
router.post('/hold', holdSale);
router.delete('/held/:id', resumeHeldSale);

router.route('/')
  .get(getSales)
  .post(createSale);

router.get('/:id', getSale);
router.post('/:id/void', authorize('businessadmin', 'manager'), voidSale);
router.post('/:id/return', authorize('businessadmin', 'manager'), processReturn);

export default router;
