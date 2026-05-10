import Customer from '../models/Customer.js';
import Sale from '../models/Sale.js';
import { CustomerPayment } from '../models/OtherModels.js';
import { logActivity } from '../middleware/activityLog.js';

// @desc Get all customers
export const getCustomers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, type } = req.query;
    const businessId = req.user.businessId;
    const query = { businessId, isActive: true };

    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (type) query.customerType = type;

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .sort({ customerName: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: customers,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Search customers (for POS quick lookup)
export const searchCustomers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 1) return res.json({ success: true, data: [] });

    const customers = await Customer.find({
      businessId: req.user.businessId,
      isActive: true,
      $or: [
        { customerName: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
      ],
    })
      .select('customerName phone customerType priceLevel creditLimit currentBalance loyaltyPoints')
      .limit(10);

    res.json({ success: true, data: customers });
  } catch (error) {
    next(error);
  }
};

// @desc Quick add customer from POS
export const quickAddCustomer = async (req, res, next) => {
  try {
    const { customerName, phone } = req.body;
    if (!customerName || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required' });
    }

    const existing = await Customer.findOne({ businessId: req.user.businessId, phone });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Customer with this phone already exists' });
    }

    const customer = await Customer.create({
      customerName,
      phone,
      businessId: req.user.businessId,
      customerType: 'regular',
    });

    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

// @desc Create customer (full)
export const createCustomer = async (req, res, next) => {
  try {
    const data = { ...req.body, businessId: req.user.businessId };
    const existing = await Customer.findOne({ businessId: req.user.businessId, phone: data.phone });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Phone number already exists' });
    }

    const customer = await Customer.create(data);
    logActivity(req.user._id, req.user.name, 'create', 'customers', req.user.businessId, customer._id, `Created customer: ${customer.customerName}`);
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

// @desc Update customer
export const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, businessId: req.user.businessId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

// @desc Get customer purchase history
export const getCustomerHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const total = await Sale.countDocuments({ customerId: req.params.id, businessId: req.user.businessId, status: 'completed' });
    const sales = await Sale.find({ customerId: req.params.id, businessId: req.user.businessId, status: 'completed' })
      .sort({ saleDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json({ success: true, data: sales, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
};

// @desc Record customer payment
export const recordPayment = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const amount = Number(req.body.amount);
    const { method, notes } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero' });
    }

    const customer = await Customer.findOne({ _id: req.params.id, businessId });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const balance = customer.currentBalance || 0;
    if (amount > balance + 0.001) {
      return res.status(400).json({
        success: false,
        message: `Payment exceeds outstanding balance (Rs. ${balance.toFixed(2)})`,
      });
    }

    const payment = await CustomerPayment.create({
      customerId: customer._id,
      amount,
      method: method || 'cash',
      notes: notes || '',
      receivedBy: req.user._id,
      businessId,
    });

    customer.currentBalance = Math.max(0, balance - amount);
    await customer.save();

    res.json({ success: true, data: payment, customer });
  } catch (error) {
    next(error);
  }
};

// @desc Get customer statement
export const getCustomerStatement = async (req, res, next) => {
  try {
    const customerId = req.params.id;
    const businessId = req.user.businessId;

    const customer = await Customer.findOne({ _id: customerId, businessId });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const creditSales = await Sale.find({
      customerId, businessId, status: 'completed',
      'payments.method': 'credit',
    }).sort({ saleDate: -1 }).select('invoiceNo grandTotal payments saleDate');

    const payments = await CustomerPayment.find({ customerId, businessId }).sort({ createdAt: -1 });

    res.json({ success: true, data: { customer, creditSales, payments } });
  } catch (error) {
    next(error);
  }
};

// @desc Delete customer (soft) — block if outstanding balance
export const deleteCustomer = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const customer = await Customer.findOne({ _id: req.params.id, businessId });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    if ((customer.currentBalance || 0) > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot deactivate. Outstanding balance: Rs. ${customer.currentBalance.toFixed(2)}`,
      });
    }

    customer.isActive = false;
    await customer.save();
    res.json({ success: true, message: 'Customer deactivated' });
  } catch (error) {
    next(error);
  }
};
