import express from 'express';
import { protect, protectWithBusiness, authorize } from '../middleware/auth.js';
import {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct,
  searchProducts, getByBarcode, getLowStock, getFeatured,
  adjustStock, getStockAdjustments, bulkCreateProducts,
} from '../controllers/productController.js';
import { validate, productSchema, stockAdjustmentSchema } from '../validators/index.js';

const router = express.Router();

router.use(protect, protectWithBusiness);

router.get('/search', searchProducts);
router.get('/low-stock', getLowStock);
router.get('/featured', getFeatured);
router.get('/barcode/:code', getByBarcode);

router.route('/')
  .get(getProducts)
  .post(authorize('businessadmin'), validate(productSchema), createProduct);

// Bulk CSV / Excel import — body shape: { rows: [...] }
router.post('/bulk', authorize('businessadmin'), bulkCreateProducts);

router.route('/:id')
  .get(getProduct)
  .put(authorize('businessadmin'), updateProduct)
  .delete(authorize('businessadmin'), deleteProduct);

// Stock routes
router.post('/stock/adjust', authorize('businessadmin', 'manager'), validate(stockAdjustmentSchema), adjustStock);
router.get('/stock/adjustments', authorize('businessadmin', 'manager'), getStockAdjustments);

export default router;
