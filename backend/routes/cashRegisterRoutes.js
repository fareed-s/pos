import express from 'express';
import { protect, protectWithBusiness } from '../middleware/auth.js';
import { openRegister, getCurrentRegister, recordTransaction, closeRegister, getRegisterHistory } from '../controllers/cashRegisterController.js';

const router = express.Router();
router.use(protect, protectWithBusiness);

router.post('/open', openRegister);
router.get('/current', getCurrentRegister);
router.post('/transaction', recordTransaction);
router.post('/close', closeRegister);
router.get('/history', getRegisterHistory);

export default router;
