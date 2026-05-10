import express from 'express';
import { protect, protectWithBusiness } from '../middleware/auth.js';
import { uploadKhataImage, uploadKhataVoice, handleKhataMedia } from '../controllers/uploadController.js';

const router = express.Router();

router.use(protect, protectWithBusiness);

// Multer middleware throws on file-filter rejection; wrap so we surface the error message.
const wrap = (mw) => (req, res, next) => mw(req, res, (err) => {
  if (err) return res.status(400).json({ success: false, message: err.message });
  next();
});

router.post('/khata/image', wrap(uploadKhataImage), handleKhataMedia);
router.post('/khata/voice', wrap(uploadKhataVoice), handleKhataMedia);

export default router;
