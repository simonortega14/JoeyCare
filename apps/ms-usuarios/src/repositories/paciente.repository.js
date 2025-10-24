import pool from '../config/db.js';
import { mapPaciente } from '../models/paciente.model.js';

export async function getPacienteById(id) {
  const [rows] = await pool.query(`SELECT * FROM neonato WHERE id = :id LIMIT 1`, { id });
  return rows[0] ? mapPaciente(rows[0]) : null;
}

export async function listPacientes({ page = 1, size = 10, q = '' }) {
  const limit = Math.max(1, Math.min(100, Number(size)));
  const offset = (Math.max(1, Number(page)) - 1) * limit;
  const like = `%${q}%`;

  const [items] = await pool.query(
    `SELECT * FROM neonato
     WHERE (:q = '' OR nombre LIKE :like OR apellido LIKE :like OR CAST(documento AS CHAR) LIKE :like)
     ORDER BY id DESC
     LIMIT :limit OFFSET :offset`,
    { q, like, limit, offset }
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM neonato
     WHERE (:q = '' OR nombre LIKE :like OR apellido LIKE :like OR CAST(documento AS CHAR) LIKE :like)`,
    { q, like }
  );

  return {
    items: items.map(mapPaciente),
    total,
    page: Number(page),
    size: limit
  };
}

/**
 * Pacientes "asignados" al médico = neonatos con ecografías subidas por ese médico.
 * (Usa tu esquema actual: ecografias.uploader_medico_id y ecografias.neonato_id)
 */
export async function listPacientesPorMedico({ medicoId, page = 1, size = 10, q = '' }) {
  const limit = Math.max(1, Math.min(100, Number(size)));
  const offset = (Math.max(1, Number(page)) - 1) * limit;
  const like = `%${q}%`;

  const [items] = await pool.query(
    `SELECT DISTINCT n.*
     FROM neonato n
     INNER JOIN ecografias e ON e.neonato_id = n.id
     WHERE e.uploader_medico_id = :medicoId
       AND (:q = '' OR n.nombre LIKE :like OR n.apellido LIKE :like OR CAST(n.documento AS CHAR) LIKE :like)
     ORDER BY n.id DESC
     LIMIT :limit OFFSET :offset`,
    { medicoId, q, like, limit, offset }
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(DISTINCT n.id) AS total
     FROM neonato n
     INNER JOIN ecografias e ON e.neonato_id = n.id
     WHERE e.uploader_medico_id = :medicoId
       AND (:q = '' OR n.nombre LIKE :like OR n.apellido LIKE :like OR CAST(n.documento AS CHAR) LIKE :like)`,
    { medicoId, q, like }
  );

  return {
    items: items.map(mapPaciente),
    total,
    page: Number(page),
    size: limit
  };
}
