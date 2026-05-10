import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Business from '../models/Business.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Supplier from '../models/Supplier.js';
import { Settings, Subscription, Location } from '../models/OtherModels.js';
import { ExpenseCategory } from '../models/Expense.js';

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    await Promise.all([
      User.deleteMany({}), Business.deleteMany({}), Category.deleteMany({}),
      Product.deleteMany({}), Customer.deleteMany({}), Supplier.deleteMany({}),
      Settings.deleteMany({}), Subscription.deleteMany({}), Location.deleteMany({}),
      ExpenseCategory.deleteMany({}),
    ]);

    // SuperAdmin
    await User.create({ name: 'Super Admin', email: 'superadmin@possystem.com', password: 'SuperAdmin@123', role: 'superadmin', phone: '03001234567' });

    // Business
    const business = await Business.create({
      name: 'M Mukhtar Bakers & General Store', email: 'mukhtar.bakers@gmail.com', phone: '03009876543',
      ownerName: 'Mukhtar Bhai', businessType: 'retail',
      address: { street: 'Main Bazaar', city: 'Lahore', state: 'Punjab', country: 'Pakistan' },
      isApproved: true, approvedAt: new Date(),
    });
    const B = business._id;

    // Users
    await User.create({ name: 'Mukhtar Bhai (Owner)', email: 'mukhtar@bakery.com', password: 'Mukhtar@123', role: 'businessadmin', businessId: B, phone: '03009876543' });
    await User.create({ name: 'Ahmed Bhai (Purchasing)', email: 'ahmed@bakery.com', password: 'Ahmed@123', role: 'manager', businessId: B, phone: '03001112222', maxDiscountPercent: 15 });
    await User.create({ name: 'Bilal (Bakery Counter)', email: 'bilal@bakery.com', password: 'Bilal@123', role: 'cashier', businessId: B, phone: '03003334444', maxDiscountPercent: 5 });
    await User.create({ name: 'Usman (Store Counter)', email: 'usman@bakery.com', password: 'Usman@123', role: 'cashier', businessId: B, phone: '03005556666', maxDiscountPercent: 5 });

    // Settings
    await Settings.create({ businessId: B, taxRate: 0, taxInclusive: true, currency: 'PKR', currencySymbol: 'Rs.', invoicePrefix: 'MM', skuPrefix: 'MM', maxCashierDiscount: 5, allowNegativeStock: false, requireCustomer: false });

    const subEnd = new Date(); subEnd.setFullYear(subEnd.getFullYear() + 1); subEnd.setHours(23, 59, 59, 999);
    await Subscription.create({
      businessId: B,
      plan: 'yearly',
      price: 0,
      currency: 'PKR',
      durationDays: 365,
      startDate: new Date(),
      endDate: subEnd,
      maxProducts: -1, maxStaff: -1, maxLocations: -1,
      isActive: true,
      notes: 'Seeded test business',
    });
    await Location.create({ name: 'Bakery Shop', businessId: B, isDefault: true, address: { city: 'Lahore', street: 'Main Bazaar' } });
    await Location.create({ name: 'General Store', businessId: B, isDefault: false, address: { city: 'Lahore', street: 'Main Bazaar' } });

    const expCats = ['Rent', 'Bijli/Electricity', 'Gas Bill', 'Workers Salary', 'Transport/Delivery', 'Bakery Raw Material', 'Packaging', 'Maintenance', 'Miscellaneous'];
    await ExpenseCategory.insertMany(expCats.map(name => ({ name, isDefault: true, businessId: B })));

    // Categories
    const bakery = await Category.create({ name: 'Bakery Items', businessId: B, sortOrder: 1 });
    const bread = await Category.create({ name: 'Bread / Roti', parentCategory: bakery._id, businessId: B, sortOrder: 1 });
    const cakes = await Category.create({ name: 'Cakes', parentCategory: bakery._id, businessId: B, sortOrder: 2 });
    const biscuits = await Category.create({ name: 'Biscuits / Cookies', parentCategory: bakery._id, businessId: B, sortOrder: 3 });
    const rusks = await Category.create({ name: 'Rusk / Toast', parentCategory: bakery._id, businessId: B, sortOrder: 4 });
    const patties = await Category.create({ name: 'Patties / Samosa / Rolls', parentCategory: bakery._id, businessId: B, sortOrder: 5 });
    const pastry = await Category.create({ name: 'Pastry / Cream Rolls', parentCategory: bakery._id, businessId: B, sortOrder: 7 });
    const mithai = await Category.create({ name: 'Mithai / Sweets', parentCategory: bakery._id, businessId: B, sortOrder: 8 });
    const drinks_bk = await Category.create({ name: 'Tea / Coffee / Drinks', parentCategory: bakery._id, businessId: B, sortOrder: 9 });

    const general = await Category.create({ name: 'General Store', businessId: B, sortOrder: 2 });
    const gheeOil = await Category.create({ name: 'Ghee / Oil', parentCategory: general._id, businessId: B, sortOrder: 1 });
    const daalCat = await Category.create({ name: 'Daal / Pulses', parentCategory: general._id, businessId: B, sortOrder: 2 });
    const maslaCat = await Category.create({ name: 'Masala / Spices', parentCategory: general._id, businessId: B, sortOrder: 3 });
    const sugarAtta = await Category.create({ name: 'Sugar / Atta / Rice', parentCategory: general._id, businessId: B, sortOrder: 4 });
    const milkDairy = await Category.create({ name: 'Milk / Dairy', parentCategory: general._id, businessId: B, sortOrder: 5 });
    const beverages = await Category.create({ name: 'Beverages / Drinks', parentCategory: general._id, businessId: B, sortOrder: 6 });
    const snacks = await Category.create({ name: 'Chips / Snacks / Namkeen', parentCategory: general._id, businessId: B, sortOrder: 7 });
    const cleaning = await Category.create({ name: 'Cleaning / Detergent', parentCategory: general._id, businessId: B, sortOrder: 8 });
    const eggs = await Category.create({ name: 'Eggs / Ande', parentCategory: general._id, businessId: B, sortOrder: 10 });
    const frozen = await Category.create({ name: 'Frozen Foods', parentCategory: general._id, businessId: B, sortOrder: 9 });
    const personal = await Category.create({ name: 'Personal Care', parentCategory: general._id, businessId: B, sortOrder: 11 });
    const stationery = await Category.create({ name: 'Stationery', parentCategory: general._id, businessId: B, sortOrder: 12 });
    const baby = await Category.create({ name: 'Baby Care', parentCategory: general._id, businessId: B, sortOrder: 13 });
    const misc = await Category.create({ name: 'Miscellaneous', parentCategory: general._id, businessId: B, sortOrder: 14 });

    // Suppliers
    const supFlour = await Supplier.create({ supplierName: 'Lahore Flour Mills', phone: '03111234567', paymentTerms: 'COD', businessId: B, rating: 4 });
    const supGhee = await Supplier.create({ supplierName: 'Dalda/Ghee Supplier', phone: '03112345678', paymentTerms: 'Net 15', businessId: B, rating: 5 });
    const supGeneral = await Supplier.create({ supplierName: 'Metro Cash & Carry', phone: '03113456789', paymentTerms: 'COD', businessId: B, rating: 4 });
    const supMasala = await Supplier.create({ supplierName: 'Shan Masala Distributor', phone: '03114567890', paymentTerms: 'Net 30', businessId: B, rating: 5 });
    const supDairy = await Supplier.create({ supplierName: 'Olpers/Milk Supplier', phone: '03115678901', paymentTerms: 'COD', businessId: B, rating: 4 });
    const supBakery = await Supplier.create({ supplierName: 'Bakery Raw Material Wala', phone: '03116789012', paymentTerms: 'COD', businessId: B, rating: 3 });

    // Products
    const products = [
      { productName: 'Double Roti (White Bread)', sku: 'BK-001', category: bread._id, costPrice: 100, salePrice: 130, currentStock: 50, lowStockThreshold: 10, unit: 'piece', isFeatured: true, supplier: supFlour._id, businessId: B },
      { productName: 'Milk Bread', sku: 'BK-002', category: bread._id, costPrice: 120, salePrice: 160, currentStock: 30, lowStockThreshold: 8, unit: 'piece', isFeatured: true, supplier: supFlour._id, businessId: B },
      { productName: 'Brown Bread (Whole Wheat)', sku: 'BK-003', category: bread._id, costPrice: 110, salePrice: 150, currentStock: 25, lowStockThreshold: 5, unit: 'piece', supplier: supFlour._id, businessId: B },
      { productName: 'Garlic Bread', sku: 'BK-004', category: bread._id, costPrice: 140, salePrice: 200, currentStock: 20, lowStockThreshold: 5, unit: 'piece', businessId: B },
      { productName: 'Bun / Gol Roti (Pack 4)', sku: 'BK-005', category: bread._id, costPrice: 60, salePrice: 80, currentStock: 40, lowStockThreshold: 10, unit: 'pack', isFeatured: true, businessId: B },
      { productName: 'Kulcha (Single)', sku: 'BK-006', category: bread._id, costPrice: 15, salePrice: 25, currentStock: 100, lowStockThreshold: 20, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Naan (Tandoori)', sku: 'BK-007', category: bread._id, costPrice: 15, salePrice: 20, currentStock: 80, lowStockThreshold: 20, unit: 'piece', businessId: B },
      { productName: 'Pound Cake (1 lb)', sku: 'BK-010', category: cakes._id, costPrice: 350, salePrice: 500, currentStock: 15, lowStockThreshold: 3, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Chocolate Cake (1 lb)', sku: 'BK-011', category: cakes._id, costPrice: 450, salePrice: 650, currentStock: 10, lowStockThreshold: 2, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Vanilla Cake (1 lb)', sku: 'BK-012', category: cakes._id, costPrice: 400, salePrice: 600, currentStock: 10, lowStockThreshold: 2, unit: 'piece', businessId: B },
      { productName: 'Cup Cake (Single)', sku: 'BK-014', category: cakes._id, costPrice: 40, salePrice: 60, currentStock: 50, lowStockThreshold: 10, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Zeera Biscuit (1 kg)', sku: 'BK-020', category: biscuits._id, costPrice: 250, salePrice: 350, currentStock: 20, lowStockThreshold: 5, unit: 'kg', isFeatured: true, businessId: B },
      { productName: 'Khatai Biscuit (1 kg)', sku: 'BK-021', category: biscuits._id, costPrice: 300, salePrice: 420, currentStock: 20, lowStockThreshold: 5, unit: 'kg', businessId: B },
      { productName: 'Nan Khatai (1 kg)', sku: 'BK-024', category: biscuits._id, costPrice: 350, salePrice: 480, currentStock: 15, lowStockThreshold: 3, unit: 'kg', businessId: B },
      { productName: 'Sweet Rusk (1 kg)', sku: 'BK-030', category: rusks._id, costPrice: 180, salePrice: 260, currentStock: 30, lowStockThreshold: 8, unit: 'kg', isFeatured: true, businessId: B },
      { productName: 'Cake Rusk (1 kg)', sku: 'BK-015', category: rusks._id, costPrice: 200, salePrice: 300, currentStock: 25, lowStockThreshold: 5, unit: 'kg', businessId: B },
      { productName: 'Chicken Patty', sku: 'BK-040', category: patties._id, costPrice: 30, salePrice: 50, currentStock: 60, lowStockThreshold: 15, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Aloo Samosa', sku: 'BK-041', category: patties._id, costPrice: 15, salePrice: 25, currentStock: 80, lowStockThreshold: 20, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Chicken Roll', sku: 'BK-042', category: patties._id, costPrice: 40, salePrice: 60, currentStock: 40, lowStockThreshold: 10, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Pizza Slice', sku: 'BK-044', category: patties._id, costPrice: 60, salePrice: 100, currentStock: 20, lowStockThreshold: 5, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Cream Roll', sku: 'BK-050', category: pastry._id, costPrice: 35, salePrice: 50, currentStock: 30, lowStockThreshold: 8, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Chocolate Pastry', sku: 'BK-051', category: pastry._id, costPrice: 50, salePrice: 80, currentStock: 25, lowStockThreshold: 5, unit: 'piece', businessId: B },
      { productName: 'Cold Sandwich', sku: 'BK-053', category: pastry._id, costPrice: 60, salePrice: 100, currentStock: 15, lowStockThreshold: 5, unit: 'piece', businessId: B },
      // General Store
      { productName: 'Dalda Ghee (1 kg)', sku: 'GS-001', category: gheeOil._id, costPrice: 580, salePrice: 620, currentStock: 30, lowStockThreshold: 5, unit: 'piece', isFeatured: true, supplier: supGhee._id, businessId: B },
      { productName: 'Dalda Ghee (2.5 kg)', sku: 'GS-002', category: gheeOil._id, costPrice: 1400, salePrice: 1520, currentStock: 20, lowStockThreshold: 5, unit: 'piece', supplier: supGhee._id, businessId: B },
      { productName: 'Dalda Ghee (5 kg)', sku: 'GS-003', category: gheeOil._id, costPrice: 2750, salePrice: 2950, currentStock: 10, lowStockThreshold: 3, unit: 'piece', supplier: supGhee._id, businessId: B },
      { productName: 'Habib Cooking Oil (1 ltr)', sku: 'GS-004', category: gheeOil._id, costPrice: 380, salePrice: 420, currentStock: 40, lowStockThreshold: 8, unit: 'piece', isFeatured: true, supplier: supGhee._id, businessId: B },
      { productName: 'Habib Cooking Oil (5 ltr)', sku: 'GS-006', category: gheeOil._id, costPrice: 1800, salePrice: 1950, currentStock: 10, lowStockThreshold: 3, unit: 'piece', supplier: supGhee._id, businessId: B },
      { productName: 'Chana Daal (1 kg)', sku: 'GS-010', category: daalCat._id, costPrice: 280, salePrice: 320, currentStock: 30, lowStockThreshold: 5, unit: 'kg', isFeatured: true, supplier: supGeneral._id, businessId: B },
      { productName: 'Masoor Daal (1 kg)', sku: 'GS-011', category: daalCat._id, costPrice: 320, salePrice: 380, currentStock: 25, lowStockThreshold: 5, unit: 'kg', supplier: supGeneral._id, businessId: B },
      { productName: 'Moong Daal (1 kg)', sku: 'GS-012', category: daalCat._id, costPrice: 340, salePrice: 400, currentStock: 20, lowStockThreshold: 5, unit: 'kg', supplier: supGeneral._id, businessId: B },
      { productName: 'Mash Daal (1 kg)', sku: 'GS-013', category: daalCat._id, costPrice: 520, salePrice: 580, currentStock: 15, lowStockThreshold: 3, unit: 'kg', supplier: supGeneral._id, businessId: B },
      { productName: 'White Chana (1 kg)', sku: 'GS-015', category: daalCat._id, costPrice: 300, salePrice: 350, currentStock: 20, lowStockThreshold: 5, unit: 'kg', businessId: B },
      { productName: 'Shan Biryani Masala', sku: 'GS-020', category: maslaCat._id, costPrice: 85, salePrice: 100, currentStock: 50, lowStockThreshold: 10, unit: 'piece', isFeatured: true, supplier: supMasala._id, businessId: B },
      { productName: 'Shan Qorma Masala', sku: 'GS-021', category: maslaCat._id, costPrice: 85, salePrice: 100, currentStock: 40, lowStockThreshold: 10, unit: 'piece', supplier: supMasala._id, businessId: B },
      { productName: 'Shan Nihari Masala', sku: 'GS-022', category: maslaCat._id, costPrice: 85, salePrice: 100, currentStock: 30, lowStockThreshold: 8, unit: 'piece', supplier: supMasala._id, businessId: B },
      { productName: 'Red Chilli Powder (Laal Mirch) 200g', sku: 'GS-024', category: maslaCat._id, costPrice: 120, salePrice: 160, currentStock: 30, lowStockThreshold: 5, unit: 'piece', businessId: B },
      { productName: 'Haldi Powder 200g', sku: 'GS-025', category: maslaCat._id, costPrice: 100, salePrice: 130, currentStock: 25, lowStockThreshold: 5, unit: 'piece', businessId: B },
      { productName: 'Garam Masala 200g', sku: 'GS-026', category: maslaCat._id, costPrice: 150, salePrice: 200, currentStock: 20, lowStockThreshold: 5, unit: 'piece', businessId: B },
      { productName: 'Namak / Salt (800g)', sku: 'GS-029', category: maslaCat._id, costPrice: 30, salePrice: 40, currentStock: 50, lowStockThreshold: 10, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Cheeni / Sugar (1 kg)', sku: 'GS-040', category: sugarAtta._id, costPrice: 140, salePrice: 160, currentStock: 50, lowStockThreshold: 10, unit: 'kg', isFeatured: true, supplier: supGeneral._id, businessId: B },
      { productName: 'Cheeni / Sugar (5 kg)', sku: 'GS-041', category: sugarAtta._id, costPrice: 680, salePrice: 750, currentStock: 20, lowStockThreshold: 5, unit: 'piece', supplier: supGeneral._id, businessId: B },
      { productName: 'Atta / Flour (10 kg)', sku: 'GS-042', category: sugarAtta._id, costPrice: 900, salePrice: 1000, currentStock: 25, lowStockThreshold: 5, unit: 'piece', isFeatured: true, supplier: supFlour._id, businessId: B },
      { productName: 'Basmati Rice (5 kg)', sku: 'GS-044', category: sugarAtta._id, costPrice: 1200, salePrice: 1400, currentStock: 15, lowStockThreshold: 3, unit: 'piece', isFeatured: true, supplier: supGeneral._id, businessId: B },
      { productName: 'Maida (1 kg)', sku: 'GS-046', category: sugarAtta._id, costPrice: 100, salePrice: 130, currentStock: 15, lowStockThreshold: 3, unit: 'kg', supplier: supFlour._id, businessId: B },
      { productName: 'Olpers Milk (1 ltr)', sku: 'GS-050', category: milkDairy._id, costPrice: 220, salePrice: 250, currentStock: 40, lowStockThreshold: 10, unit: 'piece', isFeatured: true, supplier: supDairy._id, businessId: B },
      { productName: 'Tarang (200ml)', sku: 'GS-052', category: milkDairy._id, costPrice: 50, salePrice: 60, currentStock: 50, lowStockThreshold: 10, unit: 'piece', isFeatured: true, supplier: supDairy._id, businessId: B },
      { productName: 'Dahi / Yogurt (500g)', sku: 'GS-053', category: milkDairy._id, costPrice: 100, salePrice: 120, currentStock: 20, lowStockThreshold: 5, unit: 'piece', businessId: B },
      { productName: 'Butter (200g)', sku: 'GS-054', category: milkDairy._id, costPrice: 200, salePrice: 250, currentStock: 15, lowStockThreshold: 3, unit: 'piece', businessId: B },
      { productName: 'Tapal Danedar (200g)', sku: 'GS-060', category: beverages._id, costPrice: 250, salePrice: 290, currentStock: 30, lowStockThreshold: 8, unit: 'piece', isFeatured: true, supplier: supGeneral._id, businessId: B },
      { productName: 'Pepsi (1.5 ltr)', sku: 'GS-063', category: beverages._id, costPrice: 130, salePrice: 150, currentStock: 30, lowStockThreshold: 8, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Coca Cola (1.5 ltr)', sku: 'GS-064', category: beverages._id, costPrice: 130, salePrice: 150, currentStock: 30, lowStockThreshold: 8, unit: 'piece', businessId: B },
      { productName: 'Mineral Water (1.5 ltr)', sku: 'GS-067', category: beverages._id, costPrice: 40, salePrice: 60, currentStock: 48, lowStockThreshold: 12, unit: 'piece', businessId: B },
      { productName: 'Lays Chips (Large)', sku: 'GS-070', category: snacks._id, costPrice: 80, salePrice: 100, currentStock: 30, lowStockThreshold: 8, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Nimko / Namkeen (250g)', sku: 'GS-072', category: snacks._id, costPrice: 80, salePrice: 120, currentStock: 20, lowStockThreshold: 5, unit: 'piece', businessId: B },
      { productName: 'Surf Excel (1 kg)', sku: 'GS-080', category: cleaning._id, costPrice: 350, salePrice: 400, currentStock: 15, lowStockThreshold: 3, unit: 'piece', supplier: supGeneral._id, businessId: B },
      { productName: 'Lifebuoy Soap', sku: 'GS-083', category: cleaning._id, costPrice: 70, salePrice: 90, currentStock: 25, lowStockThreshold: 5, unit: 'piece', businessId: B },
      { productName: 'Ande / Eggs (1 dozen)', sku: 'GS-090', category: eggs._id, costPrice: 260, salePrice: 300, currentStock: 20, lowStockThreshold: 5, unit: 'dozen', isFeatured: true, businessId: B },
      { productName: 'Matchbox (Pack 10)', sku: 'GS-100', category: misc._id, costPrice: 20, salePrice: 30, currentStock: 30, lowStockThreshold: 10, unit: 'pack', businessId: B },
      { productName: 'Plastic Bags (Bundle)', sku: 'GS-102', category: misc._id, costPrice: 150, salePrice: 200, currentStock: 10, lowStockThreshold: 3, unit: 'piece', businessId: B },
      { productName: 'Tissue Box', sku: 'GS-103', category: misc._id, costPrice: 100, salePrice: 130, currentStock: 20, lowStockThreshold: 5, unit: 'piece', businessId: B },

      // ─── More Bakery Items ───
      { productName: 'Sandwich Bread Sliced (Large)', sku: 'BK-110', category: bread._id, costPrice: 150, salePrice: 200, currentStock: 30, lowStockThreshold: 6, unit: 'piece', isFeatured: true, supplier: supFlour._id, businessId: B },
      { productName: 'Burger Bun (Pack 6)', sku: 'BK-111', category: bread._id, costPrice: 90, salePrice: 130, currentStock: 25, lowStockThreshold: 5, unit: 'pack', businessId: B },
      { productName: 'Hot Dog Bun (Pack 6)', sku: 'BK-112', category: bread._id, costPrice: 95, salePrice: 140, currentStock: 20, lowStockThreshold: 5, unit: 'pack', businessId: B },
      { productName: 'Sesame Bun (Pack 4)', sku: 'BK-113', category: bread._id, costPrice: 80, salePrice: 120, currentStock: 25, lowStockThreshold: 5, unit: 'pack', businessId: B },
      { productName: 'Pita Bread (Pack 4)', sku: 'BK-114', category: bread._id, costPrice: 90, salePrice: 130, currentStock: 20, lowStockThreshold: 5, unit: 'pack', businessId: B },

      { productName: 'Black Forest Cake (1 lb)', sku: 'BK-120', category: cakes._id, costPrice: 600, salePrice: 850, currentStock: 8, lowStockThreshold: 2, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Strawberry Cake (1 lb)', sku: 'BK-121', category: cakes._id, costPrice: 550, salePrice: 800, currentStock: 8, lowStockThreshold: 2, unit: 'piece', businessId: B },
      { productName: 'Birthday Cake (2 lb)', sku: 'BK-122', category: cakes._id, costPrice: 1100, salePrice: 1500, currentStock: 5, lowStockThreshold: 1, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Cheesecake Slice', sku: 'BK-123', category: cakes._id, costPrice: 120, salePrice: 180, currentStock: 30, lowStockThreshold: 8, unit: 'piece', businessId: B },
      { productName: 'Brownie (Pack 4)', sku: 'BK-124', category: cakes._id, costPrice: 200, salePrice: 300, currentStock: 20, lowStockThreshold: 5, unit: 'pack', isFeatured: true, businessId: B },

      { productName: 'Coconut Biscuit (1 kg)', sku: 'BK-130', category: biscuits._id, costPrice: 280, salePrice: 380, currentStock: 18, lowStockThreshold: 4, unit: 'kg', businessId: B },
      { productName: 'Chocolate Chip Cookie (1 kg)', sku: 'BK-131', category: biscuits._id, costPrice: 380, salePrice: 520, currentStock: 15, lowStockThreshold: 3, unit: 'kg', isFeatured: true, businessId: B },
      { productName: 'Almond Biscuit (1 kg)', sku: 'BK-132', category: biscuits._id, costPrice: 420, salePrice: 580, currentStock: 12, lowStockThreshold: 3, unit: 'kg', businessId: B },
      { productName: 'Pista Biscuit (1 kg)', sku: 'BK-133', category: biscuits._id, costPrice: 480, salePrice: 650, currentStock: 10, lowStockThreshold: 3, unit: 'kg', businessId: B },

      { productName: 'Donut Glazed', sku: 'BK-150', category: pastry._id, costPrice: 30, salePrice: 50, currentStock: 40, lowStockThreshold: 10, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Donut Chocolate', sku: 'BK-151', category: pastry._id, costPrice: 35, salePrice: 60, currentStock: 35, lowStockThreshold: 10, unit: 'piece', businessId: B },
      { productName: 'Muffin Chocolate', sku: 'BK-152', category: pastry._id, costPrice: 40, salePrice: 70, currentStock: 30, lowStockThreshold: 8, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Croissant Plain', sku: 'BK-153', category: pastry._id, costPrice: 50, salePrice: 80, currentStock: 25, lowStockThreshold: 5, unit: 'piece', businessId: B },
      { productName: 'Croissant Chocolate', sku: 'BK-154', category: pastry._id, costPrice: 60, salePrice: 100, currentStock: 25, lowStockThreshold: 5, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Eclair', sku: 'BK-155', category: pastry._id, costPrice: 45, salePrice: 70, currentStock: 20, lowStockThreshold: 5, unit: 'piece', businessId: B },
      { productName: 'Fruit Tart', sku: 'BK-156', category: pastry._id, costPrice: 80, salePrice: 130, currentStock: 15, lowStockThreshold: 3, unit: 'piece', businessId: B },

      // Mithai / Sweets
      { productName: 'Gulab Jamun (1 kg)', sku: 'BK-200', category: mithai._id, costPrice: 380, salePrice: 520, currentStock: 18, lowStockThreshold: 4, unit: 'kg', isFeatured: true, businessId: B },
      { productName: 'Jalebi (1 kg)', sku: 'BK-201', category: mithai._id, costPrice: 320, salePrice: 450, currentStock: 15, lowStockThreshold: 3, unit: 'kg', isFeatured: true, businessId: B },
      { productName: 'Barfi (1 kg)', sku: 'BK-202', category: mithai._id, costPrice: 600, salePrice: 850, currentStock: 12, lowStockThreshold: 3, unit: 'kg', businessId: B },
      { productName: 'Ladoo (1 kg)', sku: 'BK-203', category: mithai._id, costPrice: 480, salePrice: 700, currentStock: 14, lowStockThreshold: 3, unit: 'kg', businessId: B },
      { productName: 'Rasmalai (Pack 6)', sku: 'BK-204', category: mithai._id, costPrice: 350, salePrice: 500, currentStock: 10, lowStockThreshold: 2, unit: 'pack', isFeatured: true, businessId: B },
      { productName: 'Kheer (250g)', sku: 'BK-205', category: mithai._id, costPrice: 80, salePrice: 130, currentStock: 25, lowStockThreshold: 5, unit: 'piece', businessId: B },
      { productName: 'Cham Cham (1 kg)', sku: 'BK-206', category: mithai._id, costPrice: 520, salePrice: 750, currentStock: 8, lowStockThreshold: 2, unit: 'kg', businessId: B },
      { productName: 'Halwa Sohan (1 kg)', sku: 'BK-207', category: mithai._id, costPrice: 700, salePrice: 1000, currentStock: 6, lowStockThreshold: 2, unit: 'kg', businessId: B },

      // Tea / Coffee shop drinks
      { productName: 'Chai / Tea Cup', sku: 'BK-300', category: drinks_bk._id, costPrice: 20, salePrice: 50, currentStock: 200, lowStockThreshold: 50, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Doodh Patti Cup', sku: 'BK-301', category: drinks_bk._id, costPrice: 30, salePrice: 70, currentStock: 100, lowStockThreshold: 25, unit: 'piece', businessId: B },
      { productName: 'Coffee Cup', sku: 'BK-302', category: drinks_bk._id, costPrice: 50, salePrice: 120, currentStock: 80, lowStockThreshold: 20, unit: 'piece', businessId: B },
      { productName: 'Lassi (Glass)', sku: 'BK-303', category: drinks_bk._id, costPrice: 40, salePrice: 80, currentStock: 60, lowStockThreshold: 15, unit: 'piece', isFeatured: true, businessId: B },

      // ─── More General Store Items ───
      { productName: 'Sufi Cooking Oil (5 ltr)', sku: 'GS-110', category: gheeOil._id, costPrice: 1850, salePrice: 2050, currentStock: 12, lowStockThreshold: 3, unit: 'piece', supplier: supGhee._id, businessId: B },
      { productName: 'Khalis Desi Ghee (1 kg)', sku: 'GS-111', category: gheeOil._id, costPrice: 1200, salePrice: 1500, currentStock: 10, lowStockThreshold: 2, unit: 'piece', isFeatured: true, supplier: supGhee._id, businessId: B },
      { productName: 'Mustard Oil (1 ltr)', sku: 'GS-112', category: gheeOil._id, costPrice: 320, salePrice: 400, currentStock: 18, lowStockThreshold: 5, unit: 'piece', supplier: supGhee._id, businessId: B },

      { productName: 'Lobia Daal (1 kg)', sku: 'GS-115', category: daalCat._id, costPrice: 280, salePrice: 350, currentStock: 18, lowStockThreshold: 4, unit: 'kg', supplier: supGeneral._id, businessId: B },
      { productName: 'Toor Daal (1 kg)', sku: 'GS-116', category: daalCat._id, costPrice: 360, salePrice: 420, currentStock: 15, lowStockThreshold: 4, unit: 'kg', supplier: supGeneral._id, businessId: B },
      { productName: 'Black Chana (1 kg)', sku: 'GS-117', category: daalCat._id, costPrice: 280, salePrice: 340, currentStock: 25, lowStockThreshold: 5, unit: 'kg', supplier: supGeneral._id, businessId: B },

      { productName: 'National Achar / Pickle (1 kg)', sku: 'GS-130', category: maslaCat._id, costPrice: 380, salePrice: 480, currentStock: 18, lowStockThreshold: 4, unit: 'piece', isFeatured: true, supplier: supMasala._id, businessId: B },
      { productName: 'Tomato Ketchup (Bottle 800g)', sku: 'GS-131', category: maslaCat._id, costPrice: 320, salePrice: 400, currentStock: 20, lowStockThreshold: 5, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Soya Sauce (Bottle)', sku: 'GS-132', category: maslaCat._id, costPrice: 220, salePrice: 280, currentStock: 15, lowStockThreshold: 4, unit: 'piece', businessId: B },
      { productName: 'Knorr Chicken Cube (Pack)', sku: 'GS-133', category: maslaCat._id, costPrice: 60, salePrice: 90, currentStock: 30, lowStockThreshold: 10, unit: 'piece', businessId: B },
      { productName: 'Black Pepper (200g)', sku: 'GS-134', category: maslaCat._id, costPrice: 250, salePrice: 320, currentStock: 18, lowStockThreshold: 4, unit: 'piece', businessId: B },
      { productName: 'Cardamom / Elaichi (50g)', sku: 'GS-135', category: maslaCat._id, costPrice: 200, salePrice: 280, currentStock: 25, lowStockThreshold: 5, unit: 'piece', businessId: B },

      { productName: 'Brown Sugar (1 kg)', sku: 'GS-145', category: sugarAtta._id, costPrice: 180, salePrice: 220, currentStock: 25, lowStockThreshold: 5, unit: 'kg', businessId: B },
      { productName: 'Sela Rice (5 kg)', sku: 'GS-146', category: sugarAtta._id, costPrice: 1100, salePrice: 1300, currentStock: 12, lowStockThreshold: 3, unit: 'piece', supplier: supGeneral._id, businessId: B },
      { productName: 'Super Kernel Basmati (10 kg)', sku: 'GS-147', category: sugarAtta._id, costPrice: 2400, salePrice: 2750, currentStock: 8, lowStockThreshold: 2, unit: 'piece', isFeatured: true, supplier: supGeneral._id, businessId: B },
      { productName: 'Atta / Flour (20 kg)', sku: 'GS-148', category: sugarAtta._id, costPrice: 1750, salePrice: 1950, currentStock: 10, lowStockThreshold: 3, unit: 'piece', supplier: supFlour._id, businessId: B },
      { productName: 'Besan (1 kg)', sku: 'GS-149', category: sugarAtta._id, costPrice: 220, salePrice: 280, currentStock: 20, lowStockThreshold: 5, unit: 'kg', supplier: supFlour._id, businessId: B },

      { productName: 'Nestle Milk Pack (250ml)', sku: 'GS-160', category: milkDairy._id, costPrice: 70, salePrice: 90, currentStock: 60, lowStockThreshold: 15, unit: 'piece', supplier: supDairy._id, businessId: B },
      { productName: 'Cheese Slice Adams (200g)', sku: 'GS-161', category: milkDairy._id, costPrice: 280, salePrice: 350, currentStock: 18, lowStockThreshold: 4, unit: 'piece', supplier: supDairy._id, businessId: B },
      { productName: 'Cream (200ml)', sku: 'GS-162', category: milkDairy._id, costPrice: 120, salePrice: 160, currentStock: 25, lowStockThreshold: 5, unit: 'piece', supplier: supDairy._id, businessId: B },
      { productName: 'Lassi Pouch (500ml)', sku: 'GS-163', category: milkDairy._id, costPrice: 60, salePrice: 90, currentStock: 30, lowStockThreshold: 8, unit: 'piece', supplier: supDairy._id, businessId: B },

      { productName: '7Up (1.5 ltr)', sku: 'GS-170', category: beverages._id, costPrice: 130, salePrice: 150, currentStock: 25, lowStockThreshold: 5, unit: 'piece', businessId: B },
      { productName: 'Sprite (1.5 ltr)', sku: 'GS-171', category: beverages._id, costPrice: 130, salePrice: 150, currentStock: 25, lowStockThreshold: 5, unit: 'piece', businessId: B },
      { productName: 'Mountain Dew (1.5 ltr)', sku: 'GS-172', category: beverages._id, costPrice: 130, salePrice: 150, currentStock: 25, lowStockThreshold: 5, unit: 'piece', businessId: B },
      { productName: 'Lipton Yellow Label (200g)', sku: 'GS-173', category: beverages._id, costPrice: 280, salePrice: 350, currentStock: 25, lowStockThreshold: 5, unit: 'piece', isFeatured: true, supplier: supGeneral._id, businessId: B },
      { productName: 'Nestle Fruita Juice (1L)', sku: 'GS-174', category: beverages._id, costPrice: 200, salePrice: 250, currentStock: 30, lowStockThreshold: 8, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Tang Orange Powder (1 kg)', sku: 'GS-175', category: beverages._id, costPrice: 480, salePrice: 600, currentStock: 12, lowStockThreshold: 3, unit: 'piece', businessId: B },

      { productName: 'Slanty (Large)', sku: 'GS-180', category: snacks._id, costPrice: 80, salePrice: 100, currentStock: 30, lowStockThreshold: 8, unit: 'piece', businessId: B },
      { productName: 'Kurkure (Large)', sku: 'GS-181', category: snacks._id, costPrice: 80, salePrice: 100, currentStock: 30, lowStockThreshold: 8, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Cheetos (Large)', sku: 'GS-182', category: snacks._id, costPrice: 80, salePrice: 100, currentStock: 25, lowStockThreshold: 8, unit: 'piece', businessId: B },
      { productName: 'Chocolate Bar (Dairy Milk)', sku: 'GS-183', category: snacks._id, costPrice: 100, salePrice: 130, currentStock: 50, lowStockThreshold: 10, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Snickers Bar', sku: 'GS-184', category: snacks._id, costPrice: 120, salePrice: 160, currentStock: 30, lowStockThreshold: 8, unit: 'piece', businessId: B },
      { productName: 'Chewing Gum (Pack)', sku: 'GS-185', category: snacks._id, costPrice: 50, salePrice: 80, currentStock: 60, lowStockThreshold: 15, unit: 'piece', businessId: B },

      { productName: 'Dettol Liquid (500ml)', sku: 'GS-190', category: cleaning._id, costPrice: 320, salePrice: 400, currentStock: 18, lowStockThreshold: 4, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Harpic Toilet Cleaner (500ml)', sku: 'GS-191', category: cleaning._id, costPrice: 280, salePrice: 350, currentStock: 20, lowStockThreshold: 5, unit: 'piece', businessId: B },
      { productName: 'Vim Bar (Pack 4)', sku: 'GS-192', category: cleaning._id, costPrice: 120, salePrice: 160, currentStock: 25, lowStockThreshold: 5, unit: 'pack', businessId: B },
      { productName: 'Tide Detergent (1 kg)', sku: 'GS-193', category: cleaning._id, costPrice: 380, salePrice: 450, currentStock: 18, lowStockThreshold: 4, unit: 'piece', supplier: supGeneral._id, businessId: B },
      { productName: 'Capri Soap', sku: 'GS-194', category: cleaning._id, costPrice: 80, salePrice: 110, currentStock: 30, lowStockThreshold: 8, unit: 'piece', businessId: B },

      { productName: 'Brown Eggs (Half Dozen)', sku: 'GS-200', category: eggs._id, costPrice: 140, salePrice: 170, currentStock: 25, lowStockThreshold: 5, unit: 'pack', businessId: B },
      { productName: 'Free-Range Eggs (1 dozen)', sku: 'GS-201', category: eggs._id, costPrice: 320, salePrice: 380, currentStock: 15, lowStockThreshold: 3, unit: 'dozen', businessId: B },

      // Frozen Foods
      { productName: 'Frozen Chicken Nuggets (500g)', sku: 'GS-210', category: frozen._id, costPrice: 380, salePrice: 480, currentStock: 18, lowStockThreshold: 4, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Frozen Samosa (Pack 12)', sku: 'GS-211', category: frozen._id, costPrice: 250, salePrice: 320, currentStock: 20, lowStockThreshold: 5, unit: 'pack', businessId: B },
      { productName: 'Frozen Paratha (Pack 5)', sku: 'GS-212', category: frozen._id, costPrice: 200, salePrice: 260, currentStock: 25, lowStockThreshold: 6, unit: 'pack', isFeatured: true, businessId: B },
      { productName: 'Frozen Fish Fillet (500g)', sku: 'GS-213', category: frozen._id, costPrice: 480, salePrice: 600, currentStock: 12, lowStockThreshold: 3, unit: 'piece', businessId: B },
      { productName: 'Frozen Mixed Vegetables (500g)', sku: 'GS-214', category: frozen._id, costPrice: 200, salePrice: 260, currentStock: 18, lowStockThreshold: 4, unit: 'piece', businessId: B },

      // Personal Care
      { productName: 'Head & Shoulders Shampoo (200ml)', sku: 'GS-220', category: personal._id, costPrice: 380, salePrice: 480, currentStock: 18, lowStockThreshold: 4, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Sunsilk Shampoo (200ml)', sku: 'GS-221', category: personal._id, costPrice: 280, salePrice: 360, currentStock: 22, lowStockThreshold: 5, unit: 'piece', businessId: B },
      { productName: 'Colgate Toothpaste (200g)', sku: 'GS-222', category: personal._id, costPrice: 220, salePrice: 280, currentStock: 30, lowStockThreshold: 8, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Sensodyne Toothpaste (100g)', sku: 'GS-223', category: personal._id, costPrice: 320, salePrice: 400, currentStock: 18, lowStockThreshold: 4, unit: 'piece', businessId: B },
      { productName: 'Toothbrush (Soft)', sku: 'GS-224', category: personal._id, costPrice: 80, salePrice: 130, currentStock: 40, lowStockThreshold: 10, unit: 'piece', businessId: B },
      { productName: 'Disposable Razor (Pack 5)', sku: 'GS-225', category: personal._id, costPrice: 180, salePrice: 250, currentStock: 25, lowStockThreshold: 5, unit: 'pack', businessId: B },
      { productName: 'Deodorant Spray (200ml)', sku: 'GS-226', category: personal._id, costPrice: 350, salePrice: 450, currentStock: 18, lowStockThreshold: 4, unit: 'piece', businessId: B },
      { productName: 'Hand Wash Liquid (250ml)', sku: 'GS-227', category: personal._id, costPrice: 180, salePrice: 240, currentStock: 25, lowStockThreshold: 5, unit: 'piece', businessId: B },

      // Stationery
      { productName: 'Ball Pen Pack (10)', sku: 'GS-240', category: stationery._id, costPrice: 80, salePrice: 130, currentStock: 30, lowStockThreshold: 8, unit: 'pack', businessId: B },
      { productName: 'A4 Paper Ream (500 sheets)', sku: 'GS-241', category: stationery._id, costPrice: 850, salePrice: 1100, currentStock: 12, lowStockThreshold: 3, unit: 'piece', businessId: B },
      { productName: 'Notebook (200 pages)', sku: 'GS-242', category: stationery._id, costPrice: 120, salePrice: 180, currentStock: 35, lowStockThreshold: 8, unit: 'piece', isFeatured: true, businessId: B },
      { productName: 'Pencil Pack (12)', sku: 'GS-243', category: stationery._id, costPrice: 100, salePrice: 150, currentStock: 25, lowStockThreshold: 6, unit: 'pack', businessId: B },
      { productName: 'Glue Stick (Pack 3)', sku: 'GS-244', category: stationery._id, costPrice: 80, salePrice: 120, currentStock: 30, lowStockThreshold: 8, unit: 'pack', businessId: B },
      { productName: 'Stapler (Small)', sku: 'GS-245', category: stationery._id, costPrice: 220, salePrice: 320, currentStock: 15, lowStockThreshold: 3, unit: 'piece', businessId: B },

      // Baby Care
      { productName: 'Pampers Diapers (Pack 30)', sku: 'GS-260', category: baby._id, costPrice: 1100, salePrice: 1350, currentStock: 12, lowStockThreshold: 3, unit: 'pack', isFeatured: true, businessId: B },
      { productName: 'Cerelac (400g)', sku: 'GS-261', category: baby._id, costPrice: 850, salePrice: 1050, currentStock: 15, lowStockThreshold: 3, unit: 'piece', businessId: B },
      { productName: 'Baby Wipes (Pack 80)', sku: 'GS-262', category: baby._id, costPrice: 280, salePrice: 380, currentStock: 20, lowStockThreshold: 5, unit: 'pack', businessId: B },
      { productName: 'Johnson Baby Soap', sku: 'GS-263', category: baby._id, costPrice: 180, salePrice: 240, currentStock: 25, lowStockThreshold: 5, unit: 'piece', businessId: B },
      { productName: 'Baby Powder (200g)', sku: 'GS-264', category: baby._id, costPrice: 220, salePrice: 300, currentStock: 18, lowStockThreshold: 4, unit: 'piece', businessId: B },

      // Misc additions
      { productName: 'Battery AA (Pack 4)', sku: 'GS-280', category: misc._id, costPrice: 180, salePrice: 240, currentStock: 25, lowStockThreshold: 5, unit: 'pack', businessId: B },
      { productName: 'Mosquito Coil (Pack 10)', sku: 'GS-281', category: misc._id, costPrice: 100, salePrice: 140, currentStock: 30, lowStockThreshold: 8, unit: 'pack', businessId: B },
      { productName: 'Lighter', sku: 'GS-282', category: misc._id, costPrice: 25, salePrice: 50, currentStock: 100, lowStockThreshold: 25, unit: 'piece', businessId: B },
      { productName: 'Paan Masala', sku: 'GS-283', category: misc._id, costPrice: 60, salePrice: 100, currentStock: 50, lowStockThreshold: 15, unit: 'piece', businessId: B },
      { productName: 'Phone Charger Cable', sku: 'GS-284', category: misc._id, costPrice: 250, salePrice: 400, currentStock: 15, lowStockThreshold: 3, unit: 'piece', businessId: B },
      { productName: 'Earphones (Wired)', sku: 'GS-285', category: misc._id, costPrice: 350, salePrice: 550, currentStock: 12, lowStockThreshold: 3, unit: 'piece', businessId: B },
    ];

    await Product.insertMany(products);

    // Customers
    await Customer.insertMany([
      { customerName: 'Walk-in Customer', phone: '0000000000', customerType: 'walk-in', businessId: B },
      { customerName: 'Haji Sahab (Regular)', phone: '03211234567', customerType: 'regular', creditLimit: 10000, currentBalance: 2500, businessId: B },
      { customerName: 'Nazia Bibi', phone: '03229876543', customerType: 'regular', creditLimit: 5000, businessId: B },
      { customerName: 'Hotel Al-Madina', phone: '03015551234', customerType: 'wholesale', priceLevel: 'wholesale', creditLimit: 50000, currentBalance: 12500, businessId: B },
      { customerName: 'School Canteen', phone: '03441234567', customerType: 'wholesale', priceLevel: 'wholesale', creditLimit: 20000, businessId: B },
      { customerName: 'Asad VIP Customer', phone: '03331112233', customerType: 'vip', creditLimit: 30000, businessId: B, loyaltyPoints: 250 },
      { customerName: 'Imran Karyana', phone: '03452223344', customerType: 'wholesale', priceLevel: 'wholesale', creditLimit: 40000, currentBalance: 8500, businessId: B },
      { customerName: 'Fatima Bibi', phone: '03007778899', customerType: 'regular', creditLimit: 3000, businessId: B },
      { customerName: 'Adnan Tea Stall', phone: '03124445566', customerType: 'regular', creditLimit: 8000, currentBalance: 1200, businessId: B },
      { customerName: 'Bismillah Restaurant', phone: '03219998877', customerType: 'wholesale', priceLevel: 'wholesale', creditLimit: 60000, currentBalance: 18000, businessId: B },
    ]);

    console.log('\n✅ M Mukhtar Bakers & General Store - Data Ready!');
    console.log('\n--- LOGIN ---');
    console.log('Mukhtar Bhai (Owner):    mukhtar@bakery.com / Mukhtar@123');
    console.log('Ahmed Bhai (Purchasing): ahmed@bakery.com / Ahmed@123');
    console.log('Bilal (Bakery Counter):  bilal@bakery.com / Bilal@123');
    console.log('Usman (Store Counter):   usman@bakery.com / Usman@123');
    console.log('---\n');
    process.exit(0);
  } catch (error) { console.error('Seed error:', error); process.exit(1); }
};

seed();
