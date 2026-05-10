# POS Management System

**Multi-Tenant SaaS Point of Sale System** for Shops, Retailers & Wholesalers.  
MERN Stack (MongoDB, Express, React 18, Node.js) · 90+ files · 17 pages · 25+ models · 100+ API endpoints

---

## Quick Start

```bash
# Install
cd backend && npm install && cd ../frontend && npm install

# Configure backend/.env with MongoDB URI

# Seed demo data
cd backend && npm run seed

# Run (two terminals)
cd backend && npm run dev
cd frontend && npm run dev
```

Open **http://localhost:5173** · Docker: `docker-compose up --build -d`

## Demo Logins

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@possystem.com | SuperAdmin@123 |
| Business Admin | admin@store.com | Admin@123 |
| Manager | manager@store.com | Manager@123 |
| Cashier | cashier@store.com | Cashier@123 |

## All Features

- **Auth**: JWT httpOnly cookies, 4 roles, permission matrix, multi-tenant isolation
- **SuperAdmin**: Global stats, business approval/rejection, plan management
- **Products**: CRUD, variants, barcode, auto-SKU, categories (hierarchical), featured items
- **Inventory**: Stock tracking, low-stock alerts, adjustments with audit log, reorder suggestions
- **POS Terminal**: Full-screen, search/scan, cart, 4 payment methods, split pay, hold/resume, receipts, keyboard shortcuts
- **Sales**: History with filters, void with stock reversal, return/refund (full/partial)
- **Purchases**: PO creation (draft/order), stock receiving, payment tracking, supplier ledger, auto-reorder
- **Suppliers**: CRUD, rating, payment terms, outstanding balance tracking
- **Customers**: CRM, credit system (udhar), loyalty points, purchase history, statements, wholesale pricing
- **Expenses**: CRUD with categories, pie chart breakdown, recurring flag
- **Cash Register**: Open/close shift, cash in/out, expected vs actual reconciliation
- **Reports**: Sales summary, by product/category/cashier/customer, P&L, inventory valuation, tax, receivable/payable
- **Settings**: Business profile, tax config, receipt design (live preview), system config, loyalty program
- **Activity Log**: Full audit trail, module filtering, color-coded actions
- **Dark Mode**: System-wide toggle with CSS variable support
- **UI**: DM Sans + Outfit + JetBrains Mono, navy sidebar, staggered animations, responsive
- **DevOps**: Docker + Nginx + GitHub Actions CI/CD

## Tech

Backend: Node.js · Express · MongoDB · Mongoose · JWT · Zod · Helmet · bcrypt  
Frontend: React 18 · Vite · Tailwind CSS · Recharts · React Router v6 · SweetAlert2  
DevOps: Docker · Nginx · GitHub Actions
