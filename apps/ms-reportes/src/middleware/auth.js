import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    // Esperamos medico_id en el token (o id/userId como fallback)
    const medico_id = payload.medico_id || payload.userId || payload.id;
    if (!medico_id) return res.status(403).json({ error: 'Token sin medico_id' });

    req.user = { ...payload, medico_id };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
