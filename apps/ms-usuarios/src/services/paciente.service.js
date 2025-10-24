import { getPacienteById, listPacientes, listPacientesPorMedico } from '../repositories/paciente.repository.js';

export async function getById(id) {
  return await getPacienteById(id);
}
export async function list({ page, size, q }) {
  return await listPacientes({ page, size, q });
}
export async function listByMedico({ medicoId, page, size, q }) {
  return await listPacientesPorMedico({ medicoId, page, size, q });
}
