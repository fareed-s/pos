import express from 'express';
import { protect, protectWithBusiness, authorize } from '../middleware/auth.js';
import {
  getCustomers, searchCustomers, quickAddCustomer, createCustomer,
  updateCustomer, getCustomerHistory, recordPayment, getCustomerStatement, deleteCustomer,
} from '../controllers/customerController.js';

const router = express.Router();

router.use(protect, protectWithBusiness);

router.get('/search', searchCustomers);
router.post('/quick-add', quickAddCustomer);

router.route('/')
  .get(getCustomers)
  .post(authorize('businessadmin', 'manager'), createCustomer);

router.route('/:id')
  .put(authorize('businessadmin', 'manager'), updateCustomer)
  .delete(authorize('businessadmin'), deleteCustomer);

router.get('/:id/history', getCustomerHistory);
router.post('/:id/payment', authorize('businessadmin', 'manager'), recordPayment);
router.get('/:id/statement', getCustomerStatement);

export default router;
