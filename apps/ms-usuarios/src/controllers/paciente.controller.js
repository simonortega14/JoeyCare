import * as pacienteSvc from '../services/paciente.service.js';

export async function getPaciente(req, res) {
  const paciente = await pacienteSvc.getById(Number(req.params.id));
  if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });
  res.json(paciente);
}

export async function listPacientes(req, res) {
  const page = Number(req.query.page ?? 1);
  const size = Number(req.query.size ?? 10);
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const data = await pacienteSvc.list({ page, size, q });
  res.json(data);
}

