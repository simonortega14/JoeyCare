import { getPacienteById, listPacientes } from '../repositories/paciente.repository.js';

export async function getById(id) {
  return await getPacienteById(id);
}

export async function list({ page, size, q }) {
  return await listPacientes({ page, size, q });
}

// Ya no usamos filtro por médico.
// export async function listByMedico(...) { ... }
