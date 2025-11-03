const pool = require("../db");

async function crearEcografia({
  neonato_id,
  uploader_medico_id,
  sede_id,
  fecha_hora,
  filepath,
  mime_type,
  size_bytes,
  thumbnail_path,
  dicom_metadata,
}) {
  const [result] = await pool.query(
    `
    INSERT INTO ecografias (
      neonato_id,
      fecha_hora,
      uploader_medico_id,
      sede_id,
      filepath,
      mime_type,
      size_bytes,
      thumbnail_path,
      dicom_metadata,
      creado_en
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
    [
      neonato_id,
      fecha_hora,
      uploader_medico_id,
      sede_id,
      filepath,
      mime_type,
      size_bytes,
      thumbnail_path,
      JSON.stringify(dicom_metadata || {}),
    ]
  );

  return result.insertId;
}

async function crearInstancia({
  ecografia_id,
  sop_instance_uid,
  filepath,
  mime_type,
  size_bytes,
  width,
  height,
  bit_depth,
  duration_ms,
  checksum_sha256,
  uploaded_by,
}) {
  const [result] = await pool.query(
    `
    INSERT INTO instancias (
      ecografia_id,
      sop_instance_uid,
      filepath,
      mime_type,
      size_bytes,
      width,
      height,
      bit_depth,
      duration_ms,
      checksum_sha256,
      uploaded_by,
      uploaded_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
    [
      ecografia_id,
      sop_instance_uid,
      filepath,
      mime_type,
      size_bytes,
      width,
      height,
      bit_depth,
      duration_ms,
      checksum_sha256,
      uploaded_by,
    ]
  );

  return result.insertId;
}

async function crearMetadatosDicom({
  instancia_id,
  dicom_core_json,
  manufacturer,
  model_name,
  software_versions,
  pixel_spacing_mm,
  transducer_freq_mhz,
  study_instance_uid,
  series_instance_uid,
  sop_instance_uid,
}) {
  await pool.query(
    `
    INSERT INTO metadatos_dicom (
      instancia_id,
      dicom_core_json,
      manufacturer,
      model_name,
      software_versions,
      pixel_spacing_mm,
      transducer_freq_mhz,
      study_instance_uid,
      series_instance_uid,
      sop_instance_uid
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      instancia_id,
      JSON.stringify(dicom_core_json || {}),
      manufacturer || null,
      model_name || null,
      software_versions || null,
      pixel_spacing_mm || null,
      transducer_freq_mhz || null,
      study_instance_uid || null,
      series_instance_uid || null,
      sop_instance_uid || null,
    ]
  );
}

async function resumenPorNeonato(neonatoId) {
  const [rows] = await pool.query(
    `
    SELECT
      e.id AS ecografia_id,
      e.neonato_id AS neonato_id,
      e.fecha_hora AS fecha_hora,
      CONCAT('Dr(a). ', m.nombre, ' ', m.apellido) AS descripcion,
      CASE
        WHEN f.cant_frames > 0 THEN 1
        ELSE 0
      END AS has_frames
    FROM ecografias e
    LEFT JOIN medicos m
      ON m.id = e.uploader_medico_id
    LEFT JOIN (
      SELECT ecografia_id, COUNT(*) AS cant_frames
      FROM instancias
      GROUP BY ecografia_id
    ) f
      ON f.ecografia_id = e.id
    WHERE e.neonato_id = ?
    ORDER BY e.fecha_hora DESC
    `,
    [neonatoId]
  );

  return rows.map(r => ({
    id: r.ecografia_id,
    neonato_id: r.neonato_id,
    timestamp: r.fecha_hora,
    descripcion: r.descripcion || "",
    has_frames: r.has_frames === 1,
  }));
}

async function getFirstInstanceFile(ecografiaId) {
  const [rows] = await pool.query(
    `
    SELECT filepath, mime_type
    FROM instancias
    WHERE ecografia_id = ?
    ORDER BY id ASC
    LIMIT 1
    `,
    [ecografiaId]
  );

  if (!rows.length) return null;
  return {
    filepath: rows[0].filepath,
    mime_type: rows[0].mime_type || "application/octet-stream",
  };
}

module.exports = {
  crearEcografia,
  crearInstancia,
  crearMetadatosDicom,
  resumenPorNeonato,
  getFirstInstanceFile,
};
