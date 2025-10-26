import express from 'express';
import path from 'path';
import fs from 'fs';

import ecografiaRoutes from './routes/ecografia.routes.js';
import visorRoutes from './routes/visor.routes.js';

const app = express();
app.use(express.json());

// asegurar carpeta storage
const storageRoot = process.env.STORAGE_ROOT || './storage/ecografias';
fs.mkdirSync(storageRoot, { recursive: true });

// rutas API existentes
app.use('/api/ecografias', ecografiaRoutes);

// rutas nuevas para el visor
app.use('/api/visor', visorRoutes);

// healthcheck
app.get('/health', (_req, res) => res.json({ ok: true, svc: 'ms-ecografias' }));

// servir archivos públicos (DICOM/PNG/etc)
app.use('/files', express.static(path.resolve(storageRoot)));

// error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .json({ error: err.message || 'Internal error' });
});

export default app;
