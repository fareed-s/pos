import express from 'express';
import { protect, protectWithBusiness, authorize } from '../middleware/auth.js';
import { getCategories, getCategoryTree, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController.js';
import { validate, categorySchema } from '../validators/index.js';

const router = express.Router();

router.use(protect, protectWithBusiness);

router.get('/tree', getCategoryTree);

router.route('/')
  .get(getCategories)
  .post(authorize('businessadmin'), validate(categorySchema), createCategory);

router.route('/:id')
  .put(authorize('businessadmin'), updateCategory)
  .delete(authorize('businessadmin'), deleteCategory);

export default router;
