import { getProfileById } from '../services/usuario.service.js';

export async function getMe(req, res) {
  const me = await getProfileById(req.user.id);
  if (!me) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(me);
}

export async function getMisPacientes(req, res) {
  const { page = 1, size = 10, q = '' } = req.query;
  // Pacientes según ecografías subidas por el médico (uploader_medico_id)
  const data = await (await import('../services/paciente.service.js'))
    .listByMedico({ medicoId: req.user.id, page, size, q });
  res.json(data);
}
