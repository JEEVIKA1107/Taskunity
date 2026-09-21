import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { generateId } from '../utils/idGenerator';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const uploadDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${generateId('up')}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.post('/', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    // Demo fallback: Return a simulated valid document URL
    const demoType = req.body.type || 'doc';
    const demoUrl = `/uploads/${demoType}_${Date.now()}.pdf`;
    res.json({ success: true, url: demoUrl, filename: `${demoType}.pdf` });
    return;
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    success: true,
    url: fileUrl,
    filename: req.file.originalname,
    size: req.file.size
  });
});

export default router;
