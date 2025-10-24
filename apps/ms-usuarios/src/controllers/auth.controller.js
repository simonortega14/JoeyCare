import { login } from '../services/auth.service.js';

export async function postLogin(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email y password son requeridos' });

  const result = await login({ email, password });
  if (!result) return res.status(401).json({ error: 'Credenciales inválidas' });

  return res.json(result);
}
