import pool from '../config/db.js';
import { mapEcografia } from '../models/ecografia.model.js';

export async function insertEcografia({
  neonato_id, uploader_medico_id, sede_id, fecha_hora,
  filepath, mime_type, size_bytes, thumbnail_path = null, dicom_metadata = null
}) {
  const [result] = await pool.query(
    `INSERT INTO ecografias
     (neonato_id, fecha_hora, uploader_medico_id, sede_id, filepath, mime_type, size_bytes, thumbnail_path, dicom_metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [neonato_id, fecha_hora, uploader_medico_id, sede_id ?? null, filepath, mime_type, size_bytes, thumbnail_path, dicom_metadata]
  );
  const [rows] = await pool.query(`SELECT * FROM ecografias WHERE id = ?`, [result.insertId]);
  return mapEcografia(rows[0]);
}

export async function getEcografiaById(id) {
  const [rows] = await pool.query(`SELECT * FROM ecografias WHERE id = ? LIMIT 1`, [id]);
  return rows[0] ? mapEcografia(rows[0]) : null;
}

export async function listEcografias({ neonato_id = null, page = 1, size = 10 }) {
  const limit = Math.max(1, Math.min(100, Number(size)));
  const offset = (Math.max(1, Number(page)) - 1) * limit;

  if (neonato_id) {
    const [items] = await pool.query(
      `SELECT * FROM ecografias WHERE neonato_id = ?
       ORDER BY fecha_hora DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [neonato_id]
    );
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM ecografias WHERE neonato_id = ?`, [neonato_id]);
    return { items: items.map(mapEcografia), total, page: Number(page), size: limit };
  }

  const [items] = await pool.query(
    `SELECT * FROM ecografias
     ORDER BY fecha_hora DESC
     LIMIT ${limit} OFFSET ${offset}`
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM ecografias`);
  return { items: items.map(mapEcografia), total, page: Number(page), size: limit };
}
