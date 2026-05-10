import User from '../models/User.js';
import Business from '../models/Business.js';
import { Settings, Subscription } from '../models/OtherModels.js';
import { generateToken, cookieOptions } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLog.js';

// Public self-registration is disabled. The route handler in authRoutes already
// returns 403 — keep this stub so any stale imports do not break.
export const register = async (_req, res) =>
  res.status(403).json({ success: false, message: 'Public registration is disabled.' });

// @desc Login
// @route POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    let businessData = null;
    if (user.businessId) {
      const business = await Business.findById(user.businessId);
      businessData = business;
    }

    const token = generateToken(res, user._id, user.role, user.businessId);

    if (user.businessId) {
      logActivity(user._id, user.name, 'login', 'auth', user.businessId, null, 'User logged in');
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          businessId: user.businessId,
        },
        business: businessData,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get current user
// @route GET /api/auth/me
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    let business = null;
    let settings = null;
    let subscription = null;

    if (user.businessId) {
      business = await Business.findById(user.businessId);
      settings = await Settings.findOne({ businessId: user.businessId });
      const sub = await Subscription.findOne({ businessId: user.businessId });
      if (sub) subscription = sub.toJSON();
    }

    res.json({
      success: true,
      data: { user, business, settings, subscription },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Logout
// @route POST /api/auth/logout
export const logout = async (req, res) => {
  res.clearCookie('token', cookieOptions());
  res.json({ success: true, message: 'Logged out successfully' });
};

// @desc Update profile
// @route PUT /api/auth/profile
export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, avatar },
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc Change password
// @route PUT /api/auth/change-password
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};
