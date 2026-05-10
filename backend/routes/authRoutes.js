import express from 'express';
import { login, getMe, logout, updateProfile, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate, loginSchema } from '../validators/index.js';

const router = express.Router();

// Public self-registration is disabled. Users are provisioned by Super Admin only.
router.post('/register', (req, res) => res.status(403).json({
  success: false,
  message: 'Public registration is disabled. Please contact support to get an account.',
}));
router.post('/login', validate(loginSchema), login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

export default router;
