const crypto = require("crypto");
const {
  crearEcografia,
  crearInstancia,
  crearMetadatosDicom,
  resumenPorNeonato,
  getFirstInstanceFile,
} = require("../repos/ecografias.repo");

// === SUBIR ECOGRAFÍA ===
async function subirEcografia({
  neonato_id,
  uploader_medico_id,
  sede_id,
  fileInfo,
  dicomParsedMetadata = {},
}) {
  const now = new Date();

  const checksum_sha256 = crypto
    .createHash("sha256")
    .update(fileInfo.path + ":" + fileInfo.size)
    .digest("hex");

  const ecografiaId = await crearEcografia({
    neonato_id,
    uploader_medico_id,
    sede_id,
    fecha_hora: now,
    filepath: fileInfo.path,
    mime_type: fileInfo.mimetype,
    size_bytes: fileInfo.size,
    thumbnail_path: null,
    dicom_metadata: dicomParsedMetadata,
  });

  const sopUID =
    dicomParsedMetadata?.sop_instance_uid ||
    `local-${ecografiaId}-${Date.now()}`;

  const instanciaId = await crearInstancia({
    ecografia_id: ecografiaId,
    sop_instance_uid: sopUID,
    filepath: fileInfo.path,
    mime_type: fileInfo.mimetype,
    size_bytes: fileInfo.size,
    width: null,
    height: null,
    bit_depth: null,
    duration_ms: null,
    checksum_sha256,
    uploaded_by: uploader_medico_id,
  });

  await crearMetadatosDicom({
    instancia_id: instanciaId,
    dicom_core_json: dicomParsedMetadata || {},
    manufacturer: dicomParsedMetadata.manufacturer || null,
    model_name: dicomParsedMetadata.model_name || null,
    software_versions: dicomParsedMetadata.software_versions || null,
    pixel_spacing_mm: dicomParsedMetadata.pixel_spacing_mm || null,
    transducer_freq_mhz: dicomParsedMetadata.transducer_freq_mhz || null,
    study_instance_uid: dicomParsedMetadata.study_instance_uid || null,
    series_instance_uid: dicomParsedMetadata.series_instance_uid || null,
    sop_instance_uid: sopUID,
  });

  return {
    id: ecografiaId,
    neonato_id,
    timestamp: now,
    descripcion: `Subido por médico ${uploader_medico_id}`,
    has_frames: true,
    file_path: fileInfo.path,
  };
}

// === LISTAR POR NEONATO ===
async function listarEcografiasDeNeonato(neonatoId) {
  const lista = await resumenPorNeonato(neonatoId);
  return {
    items: lista,
    total: lista.length,
    page: 1,
    size: lista.length,
  };
}

// === OBTENER ARCHIVO ===
async function obtenerArchivoEcografia(ecografiaId) {
  // busca en DB la primera instancia asociada a esa ecografía
  const fileInfo = await getFirstInstanceFile(ecografiaId);
  if (!fileInfo) {
    return null;
  }

  return fileInfo; // { filepath: "...", mime_type: "..."}
}

module.exports = {
  subirEcografia,
  listarEcografiasDeNeonato,
  obtenerArchivoEcografia,
};
