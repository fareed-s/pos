import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Business from '../models/Business.js';
import { Subscription } from '../models/OtherModels.js';

// Protect routes - verify JWT
export const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    if (!token) {
      // Also check Authorization header for API access
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

// Ensure user belongs to the business they're accessing
export const protectWithBusiness = async (req, res, next) => {
  try {
    if (req.user.role === 'superadmin') {
      return next();
    }

    if (!req.user.businessId) {
      return res.status(403).json({ success: false, message: 'No business associated' });
    }

    const business = await Business.findById(req.user.businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    if (!business.isActive) {
      return res.status(403).json({ success: false, message: 'Business is deactivated' });
    }

    if (!business.isApproved) {
      return res.status(403).json({ success: false, message: 'Business pending approval' });
    }

    // Load subscription so view-only / expiry can be enforced.
    const subscription = await Subscription.findOne({ businessId: business._id });
    req.subscription = subscription || null;

    const now = Date.now();
    const isExpired = !!(subscription && subscription.endDate && subscription.endDate.getTime() < now);
    const isWriteMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);

    if (isExpired && isWriteMethod) {
      return res.status(403).json({
        success: false,
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Subscription expired. Read-only mode active. Please contact admin to renew.',
        expiredAt: subscription.endDate,
      });
    }

    req.business = business;
    req.businessId = business._id;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Role-based access
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized for this action`,
      });
    }
    next();
  };
};

// Per-staff permission gate.
//   requirePermission('products', 'edit')
// superadmin/businessadmin bypass; manager/cashier checked against User.permissions.
export const requirePermission = (module, action) => {
  return (req, res, next) => {
    const role = req.user?.role;
    if (role === 'superadmin' || role === 'businessadmin') return next();

    const perms = req.user?.permissions;
    let entry;
    if (perms instanceof Map) entry = perms.get(module);
    else if (perms && typeof perms === 'object') entry = perms[module];

    if (entry && entry[action]) return next();

    return res.status(403).json({
      success: false,
      code: 'PERMISSION_DENIED',
      message: `You do not have ${action} permission for ${module}`,
    });
  };
};

// Cookie options shared between login and logout so the browser drops/sets the same cookie
export const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  path: '/',
});

// Generate JWT token and set cookie
export const generateToken = (res, userId, role, businessId) => {
  const token = jwt.sign(
    { userId, role, businessId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const maxAge = (parseInt(process.env.COOKIE_MAX_AGE_DAYS) || 7) * 24 * 60 * 60 * 1000;

  res.cookie('token', token, { ...cookieOptions(), maxAge });

  return token;
};
