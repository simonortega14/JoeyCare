// src/services/paciente.service.js
import {
  repoListNeonatos,
  repoGetNeonatoById,
} from '../repositories/neonato.repository.js';

import { mapNeonato } from '../models/neonato.model.js';

export async function listPacientes({ page = 1, size = 10, q = null }) {
  const offset = (page - 1) * size;

  const { rows, total, limit, currentPage } = await repoListNeonatos({
    q,
    limit: size,
    offset,
  });

  const items = rows.map(mapNeonato);

  return {
    items,
    total,
    page: currentPage,
    size: limit,
  };
}

export async function getPacienteById(id) {
  const row = await repoGetNeonatoById(id);
  if (!row) return null;
  return mapNeonato(row);
}
