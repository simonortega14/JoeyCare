import { getProfileById } from '../services/usuario.service.js';
import * as pacienteSvc from '../services/paciente.service.js';

export async function getMe(req, res) {
  const me = await getProfileById(req.user.id);
  if (!me) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(me);
}

// Ahora lista TODOS los pacientes (sin filtrar por médico)
export async function getMisPacientes(req, res) {
  const { page = 1, size = 10, q = '' } = req.query;
  const data = await pacienteSvc.list({ page, size, q });
  res.json(data);
}
