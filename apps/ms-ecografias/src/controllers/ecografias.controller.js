const path = require("path");
const fs = require("fs");
const {
  subirEcografia,
  listarEcografiasDeNeonato,
  obtenerArchivoEcografia,
} = require("../services/ecografias.service");
const { STORAGE_ROOT } = require("../storageConfig");

async function uploadHandler(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Falta campo 'file' en form-data" });
    }

    const { neonato_id, uploader_medico_id, sede_id } = req.body;

    if (!neonato_id) {
      return res
        .status(400)
        .json({ error: "neonato_id es obligatorio en form-data" });
    }

    // 1. Asegurar carpeta final del neonato
    const targetDir = path.join(
      STORAGE_ROOT,
      neonato_id.toString() // ej: /var/joeycare/storage/ecografias/1
    );
    fs.mkdirSync(targetDir, { recursive: true });

    // 2. Construir nueva ruta final del archivo
    const finalPath = path.join(targetDir, path.basename(req.file.path));

    // 3. Mover archivo desde /tmp/... → /<neonato_id>/...
    fs.renameSync(req.file.path, finalPath);

    // 4. Llamar la capa de negocio con la ruta FINAL
    const created = await subirEcografia({
      neonato_id,
      uploader_medico_id,
      sede_id: sede_id || null,
      fileInfo: {
        path: finalPath,                 // OJO: ya no es req.file.path original
        mimetype: req.file.mimetype,
        size: req.file.size,
        originalname: req.file.originalname,
        filename: path.basename(finalPath),
      },
      dicomParsedMetadata: {}, // luego lo llenamos con tags DICOM si quieres
    });

    return res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

async function listByNeonatoHandler(req, res, next) {
  try {
    const { neonatoId } = req.params;
    const data = await listarEcografiasDeNeonato(neonatoId);

    return res.json({
      items: data,
      total: data.length,
      page: 1,
      size: data.length,
    });
  } catch (err) {
    next(err);
  }
}

async function getFileHandler(req, res, next) {
  try {
    const { ecografiaId } = req.params;
    const fileInfo = await obtenerArchivoEcografia(ecografiaId);

    if (!fileInfo) {
      return res
        .status(404)
        .json({ error: "No hay instancias para esta ecografía" });
    }

    if (!fs.existsSync(fileInfo.filepath)) {
      return res
        .status(410)
        .json({ error: "Archivo faltante en disco" });
    }

    res.setHeader("Content-Type", fileInfo.mime_type);
    return res.sendFile(path.resolve(fileInfo.filepath));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadHandler,
  listByNeonatoHandler,
  getFileHandler,
};
