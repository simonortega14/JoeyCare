import fs from 'fs';
import path from 'path';
import { pool } from '../config/db.js';
import { reportFolder } from '../lib/storage.js';

export class ReportesRepo {
  static async createAnotacion({ ecografia_id, neonato_id, medico_id, diagnostico, medidas }) {
    const [res] = await pool.execute(
      `INSERT INTO reportes_anotaciones
       (ecografia_id, neonato_id, medico_id, diagnostico, medidas, imagen_filename)
       VALUES (:ecografia_id, :neonato_id, :medico_id, :diagnostico, :medidas, NULL)`,
      {
        ecografia_id,
        neonato_id,
        medico_id,
        diagnostico: diagnostico ?? null,
        medidas: medidas ? JSON.stringify(medidas) : null
      }
    );
    return res.insertId;
  }

  static async attachImagen({ id, tmpPath, finalName = 'annotated.png' }) {
    const folder = reportFolder(id);
    const dest = path.join(folder, finalName);
    fs.renameSync(tmpPath, dest);
    await pool.execute(
      'UPDATE reportes_anotaciones SET imagen_filename=:f WHERE id=:id',
      { f: finalName, id }
    );
    return finalName;
  }

  static async getById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM reportes_anotaciones WHERE id=:id',
      { id }
    );
    return rows[0] || null;
  }

  static rowWithUrl(row) {
    return {
      ...row,
      imagen_url: row?.imagen_filename ? `/api/reportes/files/${row.id}/${row.imagen_filename}` : null
    };
  }

  static async listByNeonato(neonato_id, limit = 100) {
    const [rows] = await pool.execute(
      `SELECT * FROM reportes_anotaciones
       WHERE neonato_id=:neonato_id
       ORDER BY created_at DESC LIMIT :limit`,
      { neonato_id, limit: Number(limit) }
    );
    return rows.map(this.rowWithUrl);
  }

  static async listByEcografia(ecografia_id, limit = 100) {
    const [rows] = await pool.execute(
      `SELECT * FROM reportes_anotaciones
       WHERE ecografia_id=:ecografia_id
       ORDER BY created_at DESC LIMIT :limit`,
      { ecografia_id, limit: Number(limit) }
    );
    return rows.map(this.rowWithUrl);
  }

  static async update(id, { diagnostico, medidas }) {
    await pool.execute(
      'UPDATE reportes_anotaciones SET diagnostico=:diagnostico, medidas=:medidas WHERE id=:id',
      { diagnostico: diagnostico ?? null, medidas: medidas ? JSON.stringify(medidas) : null, id }
    );
  }

  static async metricsByMedico({ from, to }) {
    const qFrom = from ? `${from} 00:00:00` : '1970-01-01 00:00:00';
    const qTo   = to   ? `${to} 23:59:59`   : '2999-12-31 23:59:59';
    const [rows] = await pool.execute(
      `SELECT medico_id, COUNT(*) AS reportes
         FROM reportes_anotaciones
        WHERE created_at BETWEEN :from AND :to
        GROUP BY medico_id
        ORDER BY reportes DESC`,
      { from: qFrom, to: qTo }
    );
    return rows;
  }

  static async upsertInformeBorrador({ ecografia_id, medico_id, hallazgos }) {
    // Respeta UNIQUE(ecografia_id) de tu tabla `informes`
    await pool.execute(
      `INSERT INTO informes (ecografia_id, medico_id, fecha_informe, hallazgos, conclusion, estado)
       VALUES (:ecografia_id, :medico_id, NOW(), :hallazgos, NULL, 'borrador')
       ON DUPLICATE KEY UPDATE
         medico_id = VALUES(medico_id),
         fecha_informe = VALUES(fecha_informe),
         hallazgos = VALUES(hallazgos),
         estado = IF(estado='firmado', estado, 'borrador')`,
      { ecografia_id, medico_id, hallazgos: hallazgos ?? '' }
    );
  }
}
