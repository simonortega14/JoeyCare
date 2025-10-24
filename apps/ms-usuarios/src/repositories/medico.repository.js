import pool from '../config/db.js';
import { mapMedico } from '../models/medico.model.js';

export async function findMedicoByEmail(email) {
  const [rows] = await pool.query(
    `SELECT * FROM medicos WHERE email = :email LIMIT 1`,
    { email }
  );
  return rows[0] ? mapMedico(rows[0]) : null;
}

export async function findMedicoById(id) {
  const [rows] = await pool.query(`SELECT * FROM medicos WHERE id = :id LIMIT 1`, { id });
  return rows[0] ? mapMedico(rows[0]) : null;
}
