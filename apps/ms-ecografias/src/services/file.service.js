import path from 'path';
import fs from 'fs';

export function getPublicPath(absFilePath) {
  // Devuelve ruta relativa desde STORAGE_ROOT para exponer vía /files
  const root = path.resolve(process.env.STORAGE_ROOT || './storage/ecografias');
  const abs = path.resolve(absFilePath);
  return path.relative(root, abs).replaceAll('\\','/');
}

export function ensureExists(p) {
  fs.mkdirSync(p, { recursive: true });
}
