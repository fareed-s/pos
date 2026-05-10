import express from 'express';
import { protect, protectWithBusiness, authorize } from '../middleware/auth.js';
import { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier, getSupplierLedger } from '../controllers/supplierController.js';

const router = express.Router();
router.use(protect, protectWithBusiness, authorize('businessadmin', 'manager'));

router.route('/').get(getSuppliers).post(createSupplier);
router.route('/:id').get(getSupplier).put(updateSupplier).delete(authorize('businessadmin'), deleteSupplier);
router.get('/:id/ledger', getSupplierLedger);

export default router;
