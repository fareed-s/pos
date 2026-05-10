import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

// Storage strategy:
//   1. If CLOUDINARY_CLOUD_NAME / _API_KEY / _API_SECRET are set → upload to Cloudinary.
//   2. Otherwise → save to <repo>/backend/uploads and serve via express.static.
//
// Both paths return the same response shape: `{ url, mimeType, size }`. Callers and
// downstream consumers (Sale.udharProofImage / .udharProofVoice) don't need to care
// which backend produced the URL.

const cloudinaryEnabled = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  // eslint-disable-next-line no-console
  console.log('[upload] Cloudinary enabled — proofs will be uploaded to cloud storage');
} else {
  // eslint-disable-next-line no-console
  console.log('[upload] Cloudinary not configured — proofs will be stored locally in /uploads');
}

// 8 MB cap — image is already client-side compressed; audio is opus/webm so this is plenty.
const limits = { fileSize: 8 * 1024 * 1024 };

const imageFilter = (_req, file, cb) => {
  const ok = /^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype);
  cb(ok ? null : new Error('Only image files are allowed'), ok);
};

const audioFilter = (_req, file, cb) => {
  const ok = /^audio\/(webm|ogg|mpeg|mp4|wav|x-m4a|aac)/i.test(file.mimetype);
  cb(ok ? null : new Error('Only audio files are allowed'), ok);
};

// ─── Disk fallback ────────────────────────────────────────────────────────────
const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };

const buildDiskStorage = (kind) => multer.diskStorage({
  destination: (req, _file, cb) => {
    const businessId = req.user?.businessId?.toString() || 'shared';
    const dir = path.join(UPLOAD_ROOT, businessId, kind);
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase().slice(0, 8) || '';
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, safe);
  },
});

// ─── Multer instances ─────────────────────────────────────────────────────────
// When Cloudinary is on, we keep the file in memory and stream it to Cloudinary
// after multer hands it off. memoryStorage avoids creating a temp file on disk.
const memory = multer.memoryStorage();

export const uploadKhataImage = cloudinaryEnabled
  ? multer({ storage: memory, limits, fileFilter: imageFilter }).single('file')
  : multer({ storage: buildDiskStorage('khata'), limits, fileFilter: imageFilter }).single('file');

export const uploadKhataVoice = cloudinaryEnabled
  ? multer({ storage: memory, limits, fileFilter: audioFilter }).single('file')
  : multer({ storage: buildDiskStorage('khata'), limits, fileFilter: audioFilter }).single('file');

// ─── Cloudinary stream helper ─────────────────────────────────────────────────
// We use upload_stream so we can pass the in-memory buffer without writing to disk.
// resource_type:'auto' lets Cloudinary detect images vs. video (audio is treated as
// video in Cloudinary's data model). folder = pos-system/<businessId>/<kind>.
const cloudinaryUpload = (buffer, { businessId, kind, mimeType }) => new Promise((resolve, reject) => {
  const folder = `pos-system/${businessId}/${kind}`;
  const isAudio = /^audio\//i.test(mimeType || '');
  const opts = {
    folder,
    resource_type: isAudio ? 'video' : 'auto',
    use_filename: false,
    overwrite: false,
  };
  const stream = cloudinary.uploader.upload_stream(opts, (err, result) => {
    if (err) return reject(err);
    resolve(result);
  });
  stream.end(buffer);
});

// ─── Local-storage URL builder ────────────────────────────────────────────────
const buildLocalUrl = (req, file) => {
  const businessId = req.user?.businessId?.toString() || 'shared';
  const kind = path.basename(path.dirname(file.path));
  return `/uploads/${businessId}/${kind}/${file.filename}`;
};

// ─── Route handler ────────────────────────────────────────────────────────────
export const handleKhataMedia = async (req, res, next) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  try {
    if (cloudinaryEnabled) {
      const businessId = req.user?.businessId?.toString() || 'shared';
      // Pull `kind` from the URL ('image' or 'voice') instead of the (absent) folder name
      // since memory storage doesn't produce a path.
      const kind = req.path.includes('voice') ? 'khata-voice' : 'khata-image';
      const result = await cloudinaryUpload(req.file.buffer, {
        businessId,
        kind,
        mimeType: req.file.mimetype,
      });
      return res.json({
        success: true,
        data: {
          url: result.secure_url,
          publicId: result.public_id,
          mimeType: req.file.mimetype,
          size: req.file.size,
          provider: 'cloudinary',
        },
      });
    }

    // Local fallback
    res.json({
      success: true,
      data: {
        url: buildLocalUrl(req, req.file),
        mimeType: req.file.mimetype,
        size: req.file.size,
        provider: 'local',
      },
    });
  } catch (err) {
    next(err);
  }
};
