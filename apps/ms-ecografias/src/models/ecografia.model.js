export function mapEcografia(row) {
  return {
    id: row.id,
    neonato_id: row.neonato_id,
    fecha_hora: row.fecha_hora,
    uploader_medico_id: row.uploader_medico_id,
    sede_id: row.sede_id,
    filepath: row.filepath,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    thumbnail_path: row.thumbnail_path,
    dicom_metadata: row.dicom_metadata, // JSON en MySQL 8
    creado_en: row.creado_en
  };
}
