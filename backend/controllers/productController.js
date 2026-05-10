import Product from '../models/Product.js';
import Category from '../models/Category.js';
import StockAdjustment from '../models/StockAdjustment.js';
import { generateSKU, getSettings } from '../utils/helpers.js';
import { logActivity } from '../middleware/activityLog.js';

// @desc Get all products
// @route GET /api/products
export const getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category, status, sort = '-createdAt', lowStock } = req.query;
    const businessId = req.businessId || req.user.businessId;
    const query = { businessId };

    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) query.category = category;
    if (status === 'active') query.isActive = true;
    else if (status === 'inactive') query.isActive = false;
    if (lowStock === 'true') query.$expr = { $lte: ['$currentStock', '$lowStockThreshold'] };

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('supplier', 'supplierName')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: products,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get single product
// @route GET /api/products/:id
export const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
    })
      .populate('category', 'name')
      .populate('supplier', 'supplierName');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc Create product
// @route POST /api/products
export const createProduct = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const data = req.body;

    // Auto-generate SKU if not provided
    if (!data.sku) {
      const settings = await getSettings(businessId);
      data.sku = await generateSKU(businessId, settings.skuPrefix);
    }

    // Check duplicate SKU
    const existingSku = await Product.findOne({ businessId, sku: data.sku });
    if (existingSku) {
      return res.status(400).json({ success: false, message: 'SKU already exists' });
    }

    // Check duplicate barcode
    if (data.barcode) {
      const existingBarcode = await Product.findOne({ businessId, barcode: data.barcode });
      if (existingBarcode) {
        return res.status(400).json({ success: false, message: 'Barcode already exists' });
      }
    }

    data.businessId = businessId;
    const product = await Product.create(data);

    logActivity(req.user._id, req.user.name, 'create', 'products', businessId, product._id, `Created product: ${product.productName}`);

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc Update product
// @route PUT /api/products/:id
export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, businessId: req.user.businessId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    logActivity(req.user._id, req.user.name, 'update', 'products', req.user.businessId, product._id, `Updated product: ${product.productName}`);

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc Delete product (soft delete)
// @route DELETE /api/products/:id
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, businessId: req.user.businessId },
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    logActivity(req.user._id, req.user.name, 'delete', 'products', req.user.businessId, product._id, `Deleted product: ${product.productName}`);

    res.json({ success: true, message: 'Product deactivated' });
  } catch (error) {
    next(error);
  }
};

// @desc Search products (for POS)
// @route GET /api/products/search
export const searchProducts = async (req, res, next) => {
  try {
    const { q } = req.query;
    const businessId = req.user.businessId;

    if (!q || q.length < 1) {
      return res.json({ success: true, data: [] });
    }

    const products = await Product.find({
      businessId,
      isActive: true,
      $or: [
        { productName: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } },
        { barcode: q },
      ],
    })
      .select('productName sku barcode salePrice costPrice wholesalePrice currentStock tax discount unit images isFeatured hasVariants variants category')
      .populate('category', 'name')
      .limit(20);

    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

// @desc Get product by barcode
// @route GET /api/products/barcode/:code
export const getByBarcode = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      businessId: req.user.businessId,
      barcode: req.params.code,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc Get low stock products
// @route GET /api/products/low-stock
export const getLowStock = async (req, res, next) => {
  try {
    const products = await Product.find({
      businessId: req.user.businessId,
      isActive: true,
      isStockTracked: true,
      $expr: { $lte: ['$currentStock', '$lowStockThreshold'] },
    })
      .select('productName sku currentStock lowStockThreshold reorderLevel unit')
      .sort({ currentStock: 1 });

    res.json({ success: true, data: products, count: products.length });
  } catch (error) {
    next(error);
  }
};

// @desc Get featured products (for POS quick buttons)
// @route GET /api/products/featured
export const getFeatured = async (req, res, next) => {
  try {
    const products = await Product.find({
      businessId: req.user.businessId,
      isActive: true,
      isFeatured: true,
    })
      .select('productName sku salePrice currentStock images unit')
      .limit(25);

    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

// @desc Adjust stock
// @route POST /api/stock/adjust
export const adjustStock = async (req, res, next) => {
  try {
    const { productId, type, quantity, reason, notes } = req.body;
    const businessId = req.user.businessId;

    const product = await Product.findOne({ _id: productId, businessId });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const previousStock = product.currentStock;
    const newStock = type === 'add' ? previousStock + quantity : previousStock - quantity;

    if (newStock < 0) {
      const settings = await getSettings(businessId);
      if (!settings.allowNegativeStock) {
        return res.status(400).json({ success: false, message: 'Insufficient stock' });
      }
    }

    product.currentStock = newStock;
    await product.save();

    const adjustment = await StockAdjustment.create({
      productId,
      productName: product.productName,
      type,
      quantity,
      previousStock,
      newStock,
      reason,
      notes: notes || '',
      adjustedBy: req.user._id,
      adjustedByName: req.user.name,
      businessId,
    });

    logActivity(req.user._id, req.user.name, 'stock_adjustment', 'inventory', businessId, productId, `${type} ${quantity} units of ${product.productName}. Reason: ${reason}`);

    res.json({ success: true, data: { product, adjustment } });
  } catch (error) {
    next(error);
  }
};

// @desc Get stock adjustments
// @route GET /api/stock/adjustments
export const getStockAdjustments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, productId, startDate, endDate } = req.query;
    const query = { businessId: req.user.businessId };

    if (productId) query.productId = productId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const total = await StockAdjustment.countDocuments(query);
    const adjustments = await StockAdjustment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: adjustments,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Bulk-create products from a parsed CSV/Excel upload.
// @route POST /api/products/bulk
// Accepts { rows: [{ name, category, price, quantity, barcode?, description?, brand?, expiry_date? }, ...] }
// Strategy: per-row validation, dedupe against existing barcodes/SKUs, find-or-create
// categories by name. Returns a per-row outcome so the UI can show a green/red preview.
export const bulkCreateProducts = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const settings = await getSettings(businessId);
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];

    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'No rows provided' });
    }
    if (rows.length > 1000) {
      return res.status(400).json({ success: false, message: 'Max 1000 rows per upload' });
    }

    // Cache: name → category _id (lower-case key). Avoids repeated find/insert per row.
    const categoryCache = new Map();
    const existingCategories = await Category.find({ businessId }).select('_id name');
    existingCategories.forEach(c => categoryCache.set(c.name.toLowerCase(), c._id));

    // Pre-fetch all known barcodes + SKUs in this tenant for fast dedupe.
    const existing = await Product.find({ businessId }).select('barcode sku');
    const knownBarcodes = new Set(existing.map(p => p.barcode).filter(Boolean));
    const knownSkus = new Set(existing.map(p => p.sku).filter(Boolean));

    const results = [];
    let created = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || {};
      const lineNo = i + 2; // assuming row 1 is the CSV header

      const name = String(row.name || row.productName || '').trim();
      const categoryName = String(row.category || '').trim();
      const priceRaw = row.price ?? row.salePrice;
      const quantityRaw = row.quantity ?? row.currentStock ?? 0;

      if (!name) { results.push({ lineNo, ok: false, error: 'Missing name' }); continue; }
      if (!categoryName) { results.push({ lineNo, ok: false, error: 'Missing category' }); continue; }
      const price = Number(priceRaw);
      if (!Number.isFinite(price) || price < 0) {
        results.push({ lineNo, ok: false, error: 'Invalid price' }); continue;
      }
      const quantity = Number(quantityRaw);
      if (!Number.isFinite(quantity) || quantity < 0) {
        results.push({ lineNo, ok: false, error: 'Invalid quantity' }); continue;
      }

      // Find-or-create category by name.
      const key = categoryName.toLowerCase();
      let categoryId = categoryCache.get(key);
      if (!categoryId) {
        const cat = await Category.create({ businessId, name: categoryName, isActive: true });
        categoryId = cat._id;
        categoryCache.set(key, categoryId);
      }

      const barcode = row.barcode ? String(row.barcode).trim() : '';
      if (barcode && knownBarcodes.has(barcode)) {
        results.push({ lineNo, ok: false, error: `Duplicate barcode: ${barcode}` }); continue;
      }

      // Auto-SKU generation for rows without one.
      let sku = row.sku ? String(row.sku).trim() : '';
      if (!sku) sku = await generateSKU(businessId, settings.skuPrefix);
      if (knownSkus.has(sku)) {
        results.push({ lineNo, ok: false, error: `Duplicate SKU: ${sku}` }); continue;
      }

      // Best-effort expiry parse — invalid dates are silently dropped, not an error,
      // since expiry is optional.
      let expiryDate;
      if (row.expiry_date || row.expiryDate) {
        const d = new Date(row.expiry_date || row.expiryDate);
        if (!Number.isNaN(d.getTime())) expiryDate = d;
      }

      try {
        const created_doc = await Product.create({
          businessId,
          productName: name,
          category: categoryId,
          salePrice: price,
          costPrice: Number(row.costPrice || row.cost || 0) || 0,
          currentStock: quantity,
          barcode: barcode || undefined,
          sku,
          description: row.description ? String(row.description) : '',
          brand: row.brand ? String(row.brand) : '',
          expiryDate,
          unit: row.unit || 'piece',
          tax: Number(row.tax || 0) || 0,
          lowStockThreshold: Number(row.lowStockThreshold || row.low_stock_threshold || 5) || 5,
          isStockTracked: row.isStockTracked === false ? false : true,
          isActive: true,
        });
        if (barcode) knownBarcodes.add(barcode);
        knownSkus.add(sku);
        created += 1;
        results.push({ lineNo, ok: true, id: created_doc._id, name, sku });
      } catch (err) {
        results.push({ lineNo, ok: false, error: err.message });
      }
    }

    if (created > 0) {
      logActivity(req.user._id, req.user.name, 'create', 'products', businessId, null, `Bulk import: ${created} products created`);
    }

    res.status(201).json({
      success: true,
      data: { created, total: rows.length, results },
    });
  } catch (error) {
    next(error);
  }
};
