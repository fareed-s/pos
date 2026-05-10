// Additive seeder — populates every "empty" business (under 10 products) with a
// rich bakery + general-store catalog. Safe to re-run: it find-or-creates
// categories and skips any product whose SKU already exists for that business.
//
// Usage:
//   node seeds/seed-products.js                # all businesses with < 10 products
//   node seeds/seed-products.js --email=foo@bar.com   # single business by admin email
//   node seeds/seed-products.js --id=<businessId>     # single business by id
//   node seeds/seed-products.js --all                 # all businesses regardless of count

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Business from '../models/Business.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Supplier from '../models/Supplier.js';

dotenv.config();

// ─── Args ───
const args = process.argv.slice(2);
const argEmail = args.find(a => a.startsWith('--email='))?.slice(8);
const argId = args.find(a => a.startsWith('--id='))?.slice(5);
const argAll = args.includes('--all');

// ─── Catalog templates ───
// Sub-categories nested under two top-level groups: Bakery + General Store.
const CATEGORY_TREE = [
  { name: 'Bakery Items', sortOrder: 1, children: [
    { name: 'Bread / Roti', sortOrder: 1 },
    { name: 'Cakes', sortOrder: 2 },
    { name: 'Biscuits / Cookies', sortOrder: 3 },
    { name: 'Rusk / Toast', sortOrder: 4 },
    { name: 'Patties / Samosa / Rolls', sortOrder: 5 },
    { name: 'Pastry / Cream Rolls', sortOrder: 6 },
    { name: 'Mithai / Sweets', sortOrder: 7 },
    { name: 'Tea / Coffee / Drinks', sortOrder: 8 },
  ]},
  { name: 'General Store', sortOrder: 2, children: [
    { name: 'Ghee / Oil', sortOrder: 1 },
    { name: 'Daal / Pulses', sortOrder: 2 },
    { name: 'Masala / Spices', sortOrder: 3 },
    { name: 'Sugar / Atta / Rice', sortOrder: 4 },
    { name: 'Milk / Dairy', sortOrder: 5 },
    { name: 'Beverages / Drinks', sortOrder: 6 },
    { name: 'Chips / Snacks / Namkeen', sortOrder: 7 },
    { name: 'Cleaning / Detergent', sortOrder: 8 },
    { name: 'Eggs / Ande', sortOrder: 9 },
    { name: 'Frozen Foods', sortOrder: 10 },
    { name: 'Personal Care', sortOrder: 11 },
    { name: 'Stationery', sortOrder: 12 },
    { name: 'Baby Care', sortOrder: 13 },
    { name: 'Miscellaneous', sortOrder: 14 },
  ]},
];

const SUPPLIERS = [
  { supplierName: 'Lahore Flour Mills', phone: '03111234567', paymentTerms: 'COD', rating: 4 },
  { supplierName: 'Dalda/Ghee Supplier',  phone: '03112345678', paymentTerms: 'Net 15', rating: 5 },
  { supplierName: 'Metro Cash & Carry',   phone: '03113456789', paymentTerms: 'COD', rating: 4 },
  { supplierName: 'Shan Masala Distributor', phone: '03114567890', paymentTerms: 'Net 30', rating: 5 },
  { supplierName: 'Olpers/Milk Supplier',  phone: '03115678901', paymentTerms: 'COD', rating: 4 },
  { supplierName: 'Bakery Raw Material Wala', phone: '03116789012', paymentTerms: 'COD', rating: 3 },
];

// Each entry: [productName, sku, categoryName, costPrice, salePrice, stock, lowAt, unit, isFeatured?]
const PRODUCT_TEMPLATES = [
  // Bread
  ['Double Roti (White Bread)', 'BK-001', 'Bread / Roti', 100, 130, 50, 10, 'piece', true],
  ['Milk Bread', 'BK-002', 'Bread / Roti', 120, 160, 30, 8, 'piece', true],
  ['Brown Bread (Whole Wheat)', 'BK-003', 'Bread / Roti', 110, 150, 25, 5, 'piece'],
  ['Garlic Bread', 'BK-004', 'Bread / Roti', 140, 200, 20, 5, 'piece'],
  ['Bun / Gol Roti (Pack 4)', 'BK-005', 'Bread / Roti', 60, 80, 40, 10, 'pack', true],
  ['Kulcha (Single)', 'BK-006', 'Bread / Roti', 15, 25, 100, 20, 'piece', true],
  ['Naan (Tandoori)', 'BK-007', 'Bread / Roti', 15, 20, 80, 20, 'piece'],
  ['Sandwich Bread Sliced (Large)', 'BK-008', 'Bread / Roti', 150, 200, 30, 6, 'piece', true],
  ['Burger Bun (Pack 6)', 'BK-009', 'Bread / Roti', 90, 130, 25, 5, 'pack'],
  ['Hot Dog Bun (Pack 6)', 'BK-010', 'Bread / Roti', 95, 140, 20, 5, 'pack'],

  // Cakes
  ['Pound Cake (1 lb)', 'BK-020', 'Cakes', 350, 500, 15, 3, 'piece', true],
  ['Chocolate Cake (1 lb)', 'BK-021', 'Cakes', 450, 650, 10, 2, 'piece', true],
  ['Vanilla Cake (1 lb)', 'BK-022', 'Cakes', 400, 600, 10, 2, 'piece'],
  ['Cup Cake (Single)', 'BK-023', 'Cakes', 40, 60, 50, 10, 'piece', true],
  ['Black Forest Cake (1 lb)', 'BK-024', 'Cakes', 600, 850, 8, 2, 'piece', true],
  ['Birthday Cake (2 lb)', 'BK-025', 'Cakes', 1100, 1500, 5, 1, 'piece', true],
  ['Cheesecake Slice', 'BK-026', 'Cakes', 120, 180, 30, 8, 'piece'],
  ['Brownie (Pack 4)', 'BK-027', 'Cakes', 200, 300, 20, 5, 'pack', true],

  // Biscuits
  ['Zeera Biscuit (1 kg)', 'BK-030', 'Biscuits / Cookies', 250, 350, 20, 5, 'kg', true],
  ['Khatai Biscuit (1 kg)', 'BK-031', 'Biscuits / Cookies', 300, 420, 20, 5, 'kg'],
  ['Nan Khatai (1 kg)', 'BK-032', 'Biscuits / Cookies', 350, 480, 15, 3, 'kg'],
  ['Coconut Biscuit (1 kg)', 'BK-033', 'Biscuits / Cookies', 280, 380, 18, 4, 'kg'],
  ['Chocolate Chip Cookie (1 kg)', 'BK-034', 'Biscuits / Cookies', 380, 520, 15, 3, 'kg', true],
  ['Almond Biscuit (1 kg)', 'BK-035', 'Biscuits / Cookies', 420, 580, 12, 3, 'kg'],

  // Rusk
  ['Sweet Rusk (1 kg)', 'BK-040', 'Rusk / Toast', 180, 260, 30, 8, 'kg', true],
  ['Cake Rusk (1 kg)', 'BK-041', 'Rusk / Toast', 200, 300, 25, 5, 'kg'],

  // Patties / Rolls
  ['Chicken Patty', 'BK-050', 'Patties / Samosa / Rolls', 30, 50, 60, 15, 'piece', true],
  ['Aloo Samosa', 'BK-051', 'Patties / Samosa / Rolls', 15, 25, 80, 20, 'piece', true],
  ['Chicken Roll', 'BK-052', 'Patties / Samosa / Rolls', 40, 60, 40, 10, 'piece', true],
  ['Pizza Slice', 'BK-053', 'Patties / Samosa / Rolls', 60, 100, 20, 5, 'piece', true],

  // Pastry
  ['Cream Roll', 'BK-060', 'Pastry / Cream Rolls', 35, 50, 30, 8, 'piece', true],
  ['Chocolate Pastry', 'BK-061', 'Pastry / Cream Rolls', 50, 80, 25, 5, 'piece'],
  ['Cold Sandwich', 'BK-062', 'Pastry / Cream Rolls', 60, 100, 15, 5, 'piece'],
  ['Donut Glazed', 'BK-063', 'Pastry / Cream Rolls', 30, 50, 40, 10, 'piece', true],
  ['Donut Chocolate', 'BK-064', 'Pastry / Cream Rolls', 35, 60, 35, 10, 'piece'],
  ['Muffin Chocolate', 'BK-065', 'Pastry / Cream Rolls', 40, 70, 30, 8, 'piece', true],
  ['Croissant Plain', 'BK-066', 'Pastry / Cream Rolls', 50, 80, 25, 5, 'piece'],
  ['Croissant Chocolate', 'BK-067', 'Pastry / Cream Rolls', 60, 100, 25, 5, 'piece', true],

  // Mithai
  ['Gulab Jamun (1 kg)', 'BK-070', 'Mithai / Sweets', 380, 520, 18, 4, 'kg', true],
  ['Jalebi (1 kg)', 'BK-071', 'Mithai / Sweets', 320, 450, 15, 3, 'kg', true],
  ['Barfi (1 kg)', 'BK-072', 'Mithai / Sweets', 600, 850, 12, 3, 'kg'],
  ['Ladoo (1 kg)', 'BK-073', 'Mithai / Sweets', 480, 700, 14, 3, 'kg'],
  ['Rasmalai (Pack 6)', 'BK-074', 'Mithai / Sweets', 350, 500, 10, 2, 'pack', true],
  ['Cham Cham (1 kg)', 'BK-075', 'Mithai / Sweets', 520, 750, 8, 2, 'kg'],

  // Cafe drinks
  ['Chai / Tea Cup', 'BK-080', 'Tea / Coffee / Drinks', 20, 50, 200, 50, 'piece', true],
  ['Doodh Patti Cup', 'BK-081', 'Tea / Coffee / Drinks', 30, 70, 100, 25, 'piece'],
  ['Coffee Cup', 'BK-082', 'Tea / Coffee / Drinks', 50, 120, 80, 20, 'piece'],
  ['Lassi (Glass)', 'BK-083', 'Tea / Coffee / Drinks', 40, 80, 60, 15, 'piece', true],

  // ─── General Store ───
  ['Dalda Ghee (1 kg)', 'GS-001', 'Ghee / Oil', 580, 620, 30, 5, 'piece', true],
  ['Dalda Ghee (2.5 kg)', 'GS-002', 'Ghee / Oil', 1400, 1520, 20, 5, 'piece'],
  ['Habib Cooking Oil (1 ltr)', 'GS-003', 'Ghee / Oil', 380, 420, 40, 8, 'piece', true],
  ['Habib Cooking Oil (5 ltr)', 'GS-004', 'Ghee / Oil', 1800, 1950, 10, 3, 'piece'],
  ['Khalis Desi Ghee (1 kg)', 'GS-005', 'Ghee / Oil', 1200, 1500, 10, 2, 'piece', true],
  ['Mustard Oil (1 ltr)', 'GS-006', 'Ghee / Oil', 320, 400, 18, 5, 'piece'],

  ['Chana Daal (1 kg)', 'GS-010', 'Daal / Pulses', 280, 320, 30, 5, 'kg', true],
  ['Masoor Daal (1 kg)', 'GS-011', 'Daal / Pulses', 320, 380, 25, 5, 'kg'],
  ['Moong Daal (1 kg)', 'GS-012', 'Daal / Pulses', 340, 400, 20, 5, 'kg'],
  ['Mash Daal (1 kg)', 'GS-013', 'Daal / Pulses', 520, 580, 15, 3, 'kg'],
  ['Toor Daal (1 kg)', 'GS-014', 'Daal / Pulses', 360, 420, 15, 4, 'kg'],
  ['Black Chana (1 kg)', 'GS-015', 'Daal / Pulses', 280, 340, 25, 5, 'kg'],

  ['Shan Biryani Masala', 'GS-020', 'Masala / Spices', 85, 100, 50, 10, 'piece', true],
  ['Shan Qorma Masala', 'GS-021', 'Masala / Spices', 85, 100, 40, 10, 'piece'],
  ['Shan Nihari Masala', 'GS-022', 'Masala / Spices', 85, 100, 30, 8, 'piece'],
  ['Red Chilli Powder 200g', 'GS-023', 'Masala / Spices', 120, 160, 30, 5, 'piece'],
  ['Haldi Powder 200g', 'GS-024', 'Masala / Spices', 100, 130, 25, 5, 'piece'],
  ['Garam Masala 200g', 'GS-025', 'Masala / Spices', 150, 200, 20, 5, 'piece'],
  ['Salt Iodized (800g)', 'GS-026', 'Masala / Spices', 30, 40, 50, 10, 'piece', true],
  ['National Achar 1kg', 'GS-027', 'Masala / Spices', 380, 480, 18, 4, 'piece', true],
  ['Tomato Ketchup 800g', 'GS-028', 'Masala / Spices', 320, 400, 20, 5, 'piece', true],

  ['Sugar (1 kg)', 'GS-040', 'Sugar / Atta / Rice', 140, 160, 50, 10, 'kg', true],
  ['Sugar (5 kg)', 'GS-041', 'Sugar / Atta / Rice', 680, 750, 20, 5, 'piece'],
  ['Atta / Flour (10 kg)', 'GS-042', 'Sugar / Atta / Rice', 900, 1000, 25, 5, 'piece', true],
  ['Atta / Flour (20 kg)', 'GS-043', 'Sugar / Atta / Rice', 1750, 1950, 10, 3, 'piece'],
  ['Basmati Rice (5 kg)', 'GS-044', 'Sugar / Atta / Rice', 1200, 1400, 15, 3, 'piece', true],
  ['Super Kernel Basmati (10 kg)', 'GS-045', 'Sugar / Atta / Rice', 2400, 2750, 8, 2, 'piece', true],
  ['Maida (1 kg)', 'GS-046', 'Sugar / Atta / Rice', 100, 130, 15, 3, 'kg'],
  ['Besan (1 kg)', 'GS-047', 'Sugar / Atta / Rice', 220, 280, 20, 5, 'kg'],

  ['Olpers Milk (1 ltr)', 'GS-050', 'Milk / Dairy', 220, 250, 40, 10, 'piece', true],
  ['Tarang (200ml)', 'GS-051', 'Milk / Dairy', 50, 60, 50, 10, 'piece', true],
  ['Dahi / Yogurt (500g)', 'GS-052', 'Milk / Dairy', 100, 120, 20, 5, 'piece'],
  ['Butter (200g)', 'GS-053', 'Milk / Dairy', 200, 250, 15, 3, 'piece'],
  ['Cheese Slice (200g)', 'GS-054', 'Milk / Dairy', 280, 350, 18, 4, 'piece'],
  ['Cream (200ml)', 'GS-055', 'Milk / Dairy', 120, 160, 25, 5, 'piece'],

  ['Tapal Tea (200g)', 'GS-060', 'Beverages / Drinks', 250, 290, 30, 8, 'piece', true],
  ['Pepsi (1.5 ltr)', 'GS-061', 'Beverages / Drinks', 130, 150, 30, 8, 'piece', true],
  ['Coca Cola (1.5 ltr)', 'GS-062', 'Beverages / Drinks', 130, 150, 30, 8, 'piece'],
  ['7Up (1.5 ltr)', 'GS-063', 'Beverages / Drinks', 130, 150, 25, 5, 'piece'],
  ['Mineral Water (1.5 ltr)', 'GS-064', 'Beverages / Drinks', 40, 60, 48, 12, 'piece'],
  ['Lipton Yellow (200g)', 'GS-065', 'Beverages / Drinks', 280, 350, 25, 5, 'piece'],
  ['Nestle Fruita Juice 1L', 'GS-066', 'Beverages / Drinks', 200, 250, 30, 8, 'piece', true],

  ['Lays Chips (Large)', 'GS-070', 'Chips / Snacks / Namkeen', 80, 100, 30, 8, 'piece', true],
  ['Slanty (Large)', 'GS-071', 'Chips / Snacks / Namkeen', 80, 100, 30, 8, 'piece'],
  ['Kurkure (Large)', 'GS-072', 'Chips / Snacks / Namkeen', 80, 100, 30, 8, 'piece', true],
  ['Cheetos (Large)', 'GS-073', 'Chips / Snacks / Namkeen', 80, 100, 25, 8, 'piece'],
  ['Dairy Milk Bar', 'GS-074', 'Chips / Snacks / Namkeen', 100, 130, 50, 10, 'piece', true],
  ['Snickers Bar', 'GS-075', 'Chips / Snacks / Namkeen', 120, 160, 30, 8, 'piece'],
  ['Chewing Gum (Pack)', 'GS-076', 'Chips / Snacks / Namkeen', 50, 80, 60, 15, 'piece'],

  ['Surf Excel (1 kg)', 'GS-080', 'Cleaning / Detergent', 350, 400, 15, 3, 'piece'],
  ['Lifebuoy Soap', 'GS-081', 'Cleaning / Detergent', 70, 90, 25, 5, 'piece'],
  ['Dettol Liquid 500ml', 'GS-082', 'Cleaning / Detergent', 320, 400, 18, 4, 'piece', true],
  ['Harpic 500ml', 'GS-083', 'Cleaning / Detergent', 280, 350, 20, 5, 'piece'],
  ['Vim Bar (Pack 4)', 'GS-084', 'Cleaning / Detergent', 120, 160, 25, 5, 'pack'],
  ['Tide Detergent (1 kg)', 'GS-085', 'Cleaning / Detergent', 380, 450, 18, 4, 'piece'],

  ['Eggs (1 dozen)', 'GS-090', 'Eggs / Ande', 260, 300, 20, 5, 'dozen', true],
  ['Brown Eggs (Half Dozen)', 'GS-091', 'Eggs / Ande', 140, 170, 25, 5, 'pack'],

  ['Frozen Chicken Nuggets (500g)', 'GS-100', 'Frozen Foods', 380, 480, 18, 4, 'piece', true],
  ['Frozen Samosa (Pack 12)', 'GS-101', 'Frozen Foods', 250, 320, 20, 5, 'pack'],
  ['Frozen Paratha (Pack 5)', 'GS-102', 'Frozen Foods', 200, 260, 25, 6, 'pack', true],
  ['Frozen Fish Fillet (500g)', 'GS-103', 'Frozen Foods', 480, 600, 12, 3, 'piece'],

  ['Head & Shoulders Shampoo', 'GS-110', 'Personal Care', 380, 480, 18, 4, 'piece', true],
  ['Sunsilk Shampoo', 'GS-111', 'Personal Care', 280, 360, 22, 5, 'piece'],
  ['Colgate Toothpaste 200g', 'GS-112', 'Personal Care', 220, 280, 30, 8, 'piece', true],
  ['Sensodyne 100g', 'GS-113', 'Personal Care', 320, 400, 18, 4, 'piece'],
  ['Toothbrush (Soft)', 'GS-114', 'Personal Care', 80, 130, 40, 10, 'piece'],
  ['Disposable Razor (Pack 5)', 'GS-115', 'Personal Care', 180, 250, 25, 5, 'pack'],
  ['Deodorant Spray', 'GS-116', 'Personal Care', 350, 450, 18, 4, 'piece'],
  ['Hand Wash Liquid', 'GS-117', 'Personal Care', 180, 240, 25, 5, 'piece'],

  ['Ball Pen Pack (10)', 'GS-120', 'Stationery', 80, 130, 30, 8, 'pack'],
  ['A4 Paper Ream', 'GS-121', 'Stationery', 850, 1100, 12, 3, 'piece'],
  ['Notebook (200 pages)', 'GS-122', 'Stationery', 120, 180, 35, 8, 'piece', true],
  ['Pencil Pack (12)', 'GS-123', 'Stationery', 100, 150, 25, 6, 'pack'],
  ['Glue Stick (Pack 3)', 'GS-124', 'Stationery', 80, 120, 30, 8, 'pack'],

  ['Pampers Diapers (Pack 30)', 'GS-130', 'Baby Care', 1100, 1350, 12, 3, 'pack', true],
  ['Cerelac (400g)', 'GS-131', 'Baby Care', 850, 1050, 15, 3, 'piece'],
  ['Baby Wipes (Pack 80)', 'GS-132', 'Baby Care', 280, 380, 20, 5, 'pack'],
  ['Johnson Baby Soap', 'GS-133', 'Baby Care', 180, 240, 25, 5, 'piece'],
  ['Baby Powder 200g', 'GS-134', 'Baby Care', 220, 300, 18, 4, 'piece'],

  ['Matchbox (Pack 10)', 'GS-140', 'Miscellaneous', 20, 30, 30, 10, 'pack'],
  ['Plastic Bags (Bundle)', 'GS-141', 'Miscellaneous', 150, 200, 10, 3, 'piece'],
  ['Tissue Box', 'GS-142', 'Miscellaneous', 100, 130, 20, 5, 'piece'],
  ['Battery AA (Pack 4)', 'GS-143', 'Miscellaneous', 180, 240, 25, 5, 'pack'],
  ['Mosquito Coil (Pack 10)', 'GS-144', 'Miscellaneous', 100, 140, 30, 8, 'pack'],
  ['Lighter', 'GS-145', 'Miscellaneous', 25, 50, 100, 25, 'piece'],
  ['Phone Charger Cable', 'GS-146', 'Miscellaneous', 250, 400, 15, 3, 'piece'],
  ['Earphones (Wired)', 'GS-147', 'Miscellaneous', 350, 550, 12, 3, 'piece'],
];

const CUSTOMER_TEMPLATES = [
  { customerName: 'Walk-in Customer', phone: '0000000000', customerType: 'walk-in' },
  { customerName: 'Haji Sahab', phone: '03211234567', customerType: 'regular', creditLimit: 10000, currentBalance: 2500 },
  { customerName: 'Nazia Bibi', phone: '03229876543', customerType: 'regular', creditLimit: 5000 },
  { customerName: 'Hotel Al-Madina', phone: '03015551234', customerType: 'wholesale', priceLevel: 'wholesale', creditLimit: 50000, currentBalance: 12500 },
  { customerName: 'School Canteen', phone: '03441234567', customerType: 'wholesale', priceLevel: 'wholesale', creditLimit: 20000 },
  { customerName: 'Asad VIP', phone: '03331112233', customerType: 'vip', creditLimit: 30000, loyaltyPoints: 250 },
  { customerName: 'Imran Karyana', phone: '03452223344', customerType: 'wholesale', priceLevel: 'wholesale', creditLimit: 40000, currentBalance: 8500 },
  { customerName: 'Bismillah Restaurant', phone: '03219998877', customerType: 'wholesale', priceLevel: 'wholesale', creditLimit: 60000, currentBalance: 18000 },
];

// ─── Per-business seeder ───
async function seedBusiness(business) {
  const B = business._id;
  console.log(`\n→ Seeding "${business.name}" (${business.email})…`);

  // 1. Categories — find-or-create top-level then children
  const catMap = {}; // name → _id
  for (const top of CATEGORY_TREE) {
    let topDoc = await Category.findOne({ businessId: B, name: top.name, parentCategory: null });
    if (!topDoc) topDoc = await Category.create({ businessId: B, name: top.name, sortOrder: top.sortOrder });
    catMap[top.name] = topDoc._id;

    for (const child of top.children) {
      let childDoc = await Category.findOne({ businessId: B, name: child.name, parentCategory: topDoc._id });
      if (!childDoc) childDoc = await Category.create({ businessId: B, name: child.name, parentCategory: topDoc._id, sortOrder: child.sortOrder });
      catMap[child.name] = childDoc._id;
    }
  }
  console.log(`   ${Object.keys(catMap).length} categories ready`);

  // 2. Suppliers — find-or-create by name
  const supMap = {};
  for (const s of SUPPLIERS) {
    let doc = await Supplier.findOne({ businessId: B, supplierName: s.supplierName });
    if (!doc) doc = await Supplier.create({ ...s, businessId: B });
    supMap[s.supplierName] = doc._id;
  }
  console.log(`   ${Object.keys(supMap).length} suppliers ready`);

  // 3. Products — skip if SKU already exists for this business
  const existingSkus = new Set(
    (await Product.find({ businessId: B }).select('sku')).map(p => p.sku)
  );
  const fresh = [];
  for (const [name, sku, catName, cost, sale, stock, lowAt, unit, isFeatured = false] of PRODUCT_TEMPLATES) {
    if (existingSkus.has(sku)) continue;
    fresh.push({
      productName: name, sku, businessId: B,
      category: catMap[catName],
      costPrice: cost, salePrice: sale,
      currentStock: stock, lowStockThreshold: lowAt,
      unit, isFeatured, isStockTracked: true, isActive: true,
    });
  }
  if (fresh.length > 0) {
    await Product.insertMany(fresh);
    console.log(`   inserted ${fresh.length} new products (${existingSkus.size} already existed)`);
  } else {
    console.log(`   all products already present, skipped`);
  }

  // 4. Customers — find-or-create by phone
  let custCreated = 0;
  for (const c of CUSTOMER_TEMPLATES) {
    const exists = await Customer.findOne({ businessId: B, phone: c.phone });
    if (!exists) { await Customer.create({ ...c, businessId: B }); custCreated++; }
  }
  console.log(`   ${custCreated} new customers (${CUSTOMER_TEMPLATES.length - custCreated} already existed)`);
}

// ─── Main ───
async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pos_system');
  console.log('Connected to MongoDB');

  let targets = [];
  if (argId) {
    const b = await Business.findById(argId);
    if (b) targets = [b];
  } else if (argEmail) {
    // Match by business email OR by linked admin user email
    const b = await Business.findOne({ email: argEmail.toLowerCase() });
    if (b) {
      targets = [b];
    } else {
      const u = await User.findOne({ email: argEmail.toLowerCase(), role: 'businessadmin' });
      if (u?.businessId) {
        const b2 = await Business.findById(u.businessId);
        if (b2) targets = [b2];
      }
    }
  } else if (argAll) {
    targets = await Business.find({});
  } else {
    // Default: all businesses with fewer than 10 products
    const all = await Business.find({});
    for (const b of all) {
      const count = await Product.countDocuments({ businessId: b._id });
      if (count < 10) targets.push(b);
    }
  }

  if (targets.length === 0) {
    console.log('No matching businesses found.');
    process.exit(0);
  }

  console.log(`Targeting ${targets.length} business${targets.length === 1 ? '' : 'es'}:`);
  targets.forEach(t => console.log(`  • ${t.name} (${t.email})`));

  for (const b of targets) await seedBusiness(b);

  console.log('\n✅ Done.');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
