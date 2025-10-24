import express from 'express';
import authRoutes from './routes/auth.routes.js';
import usuarioRoutes from './routes/usuario.routes.js';
import pacienteRoutes from './routes/paciente.routes.js';

const app = express();
app.use(express.json());

// Rutas
app.use('/api/usuarios/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);

// 👇 Mueve pacientes AQUÍ para que queden bajo /api/usuarios/...
app.use('/api/usuarios', pacienteRoutes);

// Health
app.get('/health', (_req, res) => res.json({ ok: true, svc: 'ms-usuarios' }));

// Manejo básico de errores
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal error' });
});

export default app;
