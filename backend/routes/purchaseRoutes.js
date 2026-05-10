import express from 'express';
import { protect, protectWithBusiness, authorize } from '../middleware/auth.js';
import {
  getPurchaseOrders, getPurchaseOrder, createPurchaseOrder, updatePurchaseOrder,
  receiveStock, recordPOPayment, cancelPurchaseOrder, getReorderSuggestions,
} from '../controllers/purchaseController.js';

const router = express.Router();
router.use(protect, protectWithBusiness, authorize('businessadmin', 'manager'));

router.get('/reorder-suggestions', getReorderSuggestions);
router.route('/').get(getPurchaseOrders).post(createPurchaseOrder);
router.route('/:id').get(getPurchaseOrder).put(updatePurchaseOrder);
router.post('/:id/receive', receiveStock);
router.post('/:id/payment', recordPOPayment);
router.post('/:id/cancel', cancelPurchaseOrder);

export default router;
