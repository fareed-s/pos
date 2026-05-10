import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { logActivity } from '../middleware/activityLog.js';

// @desc Get all categories — includes a `productCount` field per category so the
// UI can render the product count chip without a second round-trip per card.
// Active products only; inactive ones are excluded so the count matches what
// the user actually sees on the Products page.
export const getCategories = async (req, res, next) => {
  try {
    const businessId = req.businessId || req.user.businessId;

    const [categories, counts] = await Promise.all([
      Category.find({ businessId })
        .populate('parentCategory', 'name')
        .sort({ sortOrder: 1, name: 1 })
        .lean(),
      Product.aggregate([
        { $match: { businessId, isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ]);

    const countMap = new Map(counts.map(c => [String(c._id), c.count]));
    const enriched = categories.map(c => ({ ...c, productCount: countMap.get(String(c._id)) || 0 }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
};

// @desc Get category tree (hierarchical)
export const getCategoryTree = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const categories = await Category.find({ businessId, isActive: true }).sort({ sortOrder: 1 });

    // Build tree
    const map = {};
    const tree = [];

    categories.forEach(cat => {
      map[cat._id.toString()] = { ...cat.toObject(), children: [] };
    });

    categories.forEach(cat => {
      if (cat.parentCategory && map[cat.parentCategory.toString()]) {
        map[cat.parentCategory.toString()].children.push(map[cat._id.toString()]);
      } else {
        tree.push(map[cat._id.toString()]);
      }
    });

    res.json({ success: true, data: tree });
  } catch (error) {
    next(error);
  }
};

// @desc Create category
export const createCategory = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const { name, parentCategory, description, image, sortOrder } = req.body;

    const escaped = String(name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await Category.findOne({ businessId, name: { $regex: new RegExp(`^${escaped}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Category name already exists' });
    }

    const category = await Category.create({
      name, parentCategory: parentCategory || null, description, image, sortOrder, businessId,
    });

    logActivity(req.user._id, req.user.name, 'create', 'categories', businessId, category._id, `Created category: ${name}`);

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

// @desc Update category
export const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, businessId: req.user.businessId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    logActivity(req.user._id, req.user.name, 'update', 'categories', req.user.businessId, category._id, `Updated category: ${category.name}`);

    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

// @desc Delete category
export const deleteCategory = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;

    // Check if products use this category
    const productCount = await Product.countDocuments({ category: req.params.id, businessId });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete. ${productCount} products use this category.`,
      });
    }

    // Check child categories
    const childCount = await Category.countDocuments({ parentCategory: req.params.id, businessId });
    if (childCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete. ${childCount} subcategories exist.`,
      });
    }

    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, businessId },
      { isActive: false },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, message: 'Category deactivated' });
  } catch (error) {
    next(error);
  }
};
