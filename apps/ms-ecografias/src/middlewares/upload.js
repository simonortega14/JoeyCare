import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const storageRoot = process.env.STORAGE_ROOT || './storage/ecografias';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const now = new Date();
    const dir = path.join(
      storageRoot,
      String(now.getUTCFullYear()),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      String(now.getUTCDate()).padStart(2, '0')
    );
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${uuidv4()}${ext}`);
  }
});

export const upload = multer({ storage });
