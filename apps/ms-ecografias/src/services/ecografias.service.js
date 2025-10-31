const path = require("path");
const repo = require("../repos/ecografias.repo");

function buildPublicURL(relativePath) {
  // nginx expone /files/* apuntando al volumen compartido
  return `/files/${relativePath}`.replace(/\\/g, "/");
}

// GET /api/ecografias?neonato_id=13
async function listEcografiasDeNeonato(neonatoId) {
  if (!neonatoId) {
    const err = new Error("Falta neonato_id");
    err.statusCode = 400;
    throw err;
  }

  const rows = await repo.findByNeonato(neonatoId);

  const items = rows.map((row) => ({
    id: row.id,
    neonato_id: row.neonato_id,
    fecha_hora: row.fecha_hora,
    uploader_medico_id: row.uploader_medico_id,
    size_bytes: row.size_bytes,
    mime_type: row.mime_type,
    file_url: buildPublicURL(row.filepath),
  }));

  return {
    items,
    total: items.length,
  };
}

// GET /api/ecografias/neonatos/:neonatoId
async function listResumenPorNeonato(neonatoId) {
  if (!neonatoId) {
    const err = new Error("Falta neonatoId");
    err.statusCode = 400;
    throw err;
  }
  const resumen = await repo.resumenPorNeonato(neonatoId);
  return resumen;
}

// POST /api/ecografias/upload
async function registrarUpload({
  neonato_id,
  uploader_medico_id,
  storedFile,
  storageRoot,
}) {
  if (!neonato_id || !uploader_medico_id) {
    const err = new Error(
      "neonato_id y uploader_medico_id son obligatorios"
    );
    err.statusCode = 400;
    throw err;
  }
  if (!storedFile) {
    const err = new Error("No se recibió archivo");
    err.statusCode = 400;
    throw err;
  }

  // filepath relativo que guardamos en DB
  // ej: "2025/10/31/eco-1761880.dcm"
  const relPath = path
    .relative(storageRoot, storedFile.path)
    .replace(/\\/g, "/");

  const ecografia_id = await repo.insertEcografia({
    neonato_id,
    uploader_medico_id,
    relPath,
    mimeType: storedFile.mimetype,
    sizeBytes: storedFile.size,
  });

  await repo.insertInstancia({
    ecografia_id,
    relPath,
    mimeType: storedFile.mimetype,
    sizeBytes: storedFile.size,
    uploader_medico_id,
  });

  return {
    message: "Ecografía subida correctamente",
    ecografia_id,
    neonato_id,
    relative_path: relPath,
    file_url: buildPublicURL(relPath),
  };
}

module.exports = {
  listEcografiasDeNeonato,
  listResumenPorNeonato,
  registrarUpload,
};
