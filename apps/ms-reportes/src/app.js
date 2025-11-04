import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { router as reportes } from './routes/reportes.routes.js';
import { notFound, onError } from './middleware/error.js';

export function buildApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '4mb' }));

  app.use('/api/reportes', reportes);

  app.use(notFound);
  app.use(onError);

  return app;
}
