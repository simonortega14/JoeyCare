import express from 'express';
import path from 'path';
import fs from 'fs';
import ecografiaRoutes from './routes/ecografia.routes.js';

const app = express();
app.use(express.json());

// Asegurar carpeta de storage
const storageRoot = process.env.STORAGE_ROOT || './storage/ecografias';
fs.mkdirSync(storageRoot, { recursive: true });

// Rutas API
app.use('/api/ecografias', ecografiaRoutes);

// Health
app.get('/health', (_req, res) => res.json({ ok: true, svc: 'ms-ecografias' }));

// Sirve archivos (solo lectura) — opcional
app.use('/files', express.static(path.resolve(storageRoot)));

// Error handler básico
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal error' });
});

export default app;
