import * as pacienteSvc from '../services/paciente.service.js';

export async function getPaciente(req, res) {
  const paciente = await pacienteSvc.getById(Number(req.params.id));
  if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });
  res.json(paciente);
}

export async function listPacientes(req, res) {
  const { page = 1, size = 10, q = '' } = req.query;
  const data = await pacienteSvc.list({ page, size, q });
  res.json(data);
}
