import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';

export const STORAGE_ROOT = env.storage;

export function ensureStorage() {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

export function reportFolder(reportId) {
  const folder = path.join(STORAGE_ROOT, String(reportId));
  fs.mkdirSync(folder, { recursive: true });
  return folder;
}

export function reportFilePath(reportId, filename) {
  return path.join(reportFolder(reportId), filename);
}
