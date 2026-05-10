import express from 'express';
import { protect, protectWithBusiness, authorize } from '../middleware/auth.js';
import { getExpenses, createExpense, updateExpense, deleteExpense, getExpenseCategories, createExpenseCategory } from '../controllers/expenseController.js';

const router = express.Router();
router.use(protect, protectWithBusiness, authorize('businessadmin', 'manager'));

router.get('/categories', getExpenseCategories);
router.post('/categories', authorize('businessadmin'), createExpenseCategory);
router.route('/').get(getExpenses).post(createExpense);
router.route('/:id').put(updateExpense).delete(authorize('businessadmin'), deleteExpense);

export default router;
