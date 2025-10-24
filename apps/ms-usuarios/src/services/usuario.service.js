import { findMedicoById } from '../repositories/medico.repository.js';

export async function getProfileById(id) {
  return await findMedicoById(id);
}
