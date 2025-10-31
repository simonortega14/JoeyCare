const db = require("../db/db");

// Lista ecografías detalladas de un neonato
async function findByNeonato(neonatoId) {
  const [rows] = await db.query(
    `SELECT
        e.id,
        e.neonato_id,
        e.fecha_hora,
        e.uploader_medico_id,
        e.filepath,
        e.mime_type,
        e.size_bytes
     FROM ecografias e
     WHERE e.neonato_id = ?
     ORDER BY e.fecha_hora DESC`,
    [neonatoId]
  );
  return rows;
}

// Inserta una nueva ecografía
async function insertEcografia({
  neonato_id,
  uploader_medico_id,
  relPath,
  mimeType,
  sizeBytes,
}) {
  const [result] = await db.query(
    `INSERT INTO ecografias
       (neonato_id, fecha_hora, uploader_medico_id,
        filepath, mime_type, size_bytes)
     VALUES (?, NOW(), ?, ?, ?, ?)`,
    [neonato_id, uploader_medico_id, relPath, mimeType, sizeBytes]
  );
  return result.insertId;
}

// Inserta la primera instancia asociada
async function insertInstancia({
  ecografia_id,
  relPath,
  mimeType,
  sizeBytes,
  uploader_medico_id,
}) {
  const sopUID = `1.2.840.${Date.now()}`; // dummy uid
  await db.query(
    `INSERT INTO instancias
       (ecografia_id, sop_instance_uid, filepath,
        mime_type, size_bytes, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      ecografia_id,
      sopUID,
      relPath,
      mimeType,
      sizeBytes,
      uploader_medico_id,
    ]
  );
}

// Resumen estilo visor (has_frames, descripción médico)
async function resumenPorNeonato(neonatoId) {
  const [rows] = await db.query(
    `SELECT
        e.id            AS ecografia_id,
        e.neonato_id    AS neonato_id,
        e.fecha_hora    AS fecha_hora,
        CONCAT('Dr(a). ', m.nombre, ' ', m.apellido) AS descripcion,
        CASE
          WHEN i.id IS NULL THEN 0
          ELSE 1
        END AS has_frames
     FROM ecografias e
     LEFT JOIN instancias i
       ON i.ecografia_id = e.id
     LEFT JOIN medicos m
       ON m.id = e.uploader_medico_id
     WHERE e.neonato_id = ?
     GROUP BY e.id
     ORDER BY e.fecha_hora DESC`,
    [neonatoId]
  );
  return rows;
}

module.exports = {
  findByNeonato,
  insertEcografia,
  insertInstancia,
  resumenPorNeonato,
};
