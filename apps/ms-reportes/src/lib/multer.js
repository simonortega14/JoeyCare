import multer from 'multer';
import path from 'path';
import { STORAGE_ROOT, ensureStorage } from './storage.js';

ensureStorage();

export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, STORAGE_ROOT),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '.png') || '.png';
      cb(null, `tmp_${Date.now()}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});
