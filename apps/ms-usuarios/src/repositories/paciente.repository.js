import pool from '../config/db.js';
import { mapPaciente } from '../models/paciente.model.js';

// ✅ export nombrado: getPacienteById
export async function getPacienteById(id) {
  const [rows] = await pool.query(
    `SELECT * FROM neonato WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ? mapPaciente(rows[0]) : null;
}

// ✅ export nombrado: listPacientes (sin placeholders en LIMIT/OFFSET)
export async function listPacientes({ page = 1, size = 10, q = '' }) {
  const limit = Math.max(1, Math.min(100, Number(size)));
  const offset = (Math.max(1, Number(page)) - 1) * limit;

  const query = typeof q === 'string' ? q : '';
  const like = `%${query}%`;

  const [items] = await pool.query(
    `SELECT * FROM neonato
     WHERE (? = '' OR nombre LIKE ? OR apellido LIKE ? OR CAST(documento AS CHAR) LIKE ?)
     ORDER BY id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    [query, like, like, like]
  );

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total FROM neonato
     WHERE (? = '' OR nombre LIKE ? OR apellido LIKE ? OR CAST(documento AS CHAR) LIKE ?)`,
    [query, like, like, like]
  );

  return {
    items: items.map(mapPaciente),
    total: countRow.total,
    page: Number(page),
    size: limit
  };
}

// (Opcional) si alguna vez la necesitas de nuevo, puedes re-agregar:
// export async function listPacientesPorMedico(...) { ... }
