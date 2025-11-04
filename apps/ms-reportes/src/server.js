import { buildApp } from './app.js';
import { env } from './config/env.js';

const app = buildApp();
app.listen(env.port, () => {
  console.log(`ms-reportes escuchando en :${env.port}`);
});
