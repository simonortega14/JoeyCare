import pool from '../config/db.js';
import { mapMedico } from '../models/medico.model.js';

export async function findMedicoById(id) {
  const [rows] = await pool.query(`SELECT * FROM medicos WHERE id = ? LIMIT 1`, [id]);
  return rows[0] ? mapMedico(rows[0]) : null;
}
