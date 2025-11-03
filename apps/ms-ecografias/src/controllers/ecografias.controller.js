const path = require("path");
const fs = require("fs"); // <-- FALTABA ESTO

const {
  listarEcografiasDeNeonato,
  obtenerArchivoEcografia,
  subirEcografia,
} = require("../services/ecografias.service");

// =======================================================
// POST /ecografias/upload
// =======================================================
async function uploadHandler(req, res, next) {
  try {
    const { neonato_id, uploader_medico_id, sede_id } = req.body;
    const fileInfo = req.file;

    if (!fileInfo) {
      return res.status(400).json({ error: "No se adjuntó archivo" });
    }

    const nuevaEco = await subirEcografia({
      neonato_id,
      uploader_medico_id,
      sede_id,
      fileInfo,
      dicomParsedMetadata: {},
    });

    res.status(201).json(nuevaEco);
  } catch (err) {
    console.error("[uploadHandler] error:", err);
    next(err);
  }
}

// =======================================================
// GET /neonatos/:neonatoId/ecografias
// =======================================================
async function listByNeonatoHandler(req, res, next) {
  try {
    const { neonatoId } = req.params;
    const data = await listarEcografiasDeNeonato(neonatoId);
    res.json(data);
  } catch (err) {
    console.error("[listByNeonatoHandler] error:", err);
    next(err);
  }
}

// =======================================================
// GET /ecografias/:ecografiaId/archivo
//  => devuelve el BINARIO real (DICOM / PNG / JPG)
// =======================================================
async function getFileHandler(req, res) {
  try {
    const { ecografiaId } = req.params;
    console.log("[getFileHandler] ecografiaId =", ecografiaId);

    // 1. Buscar info del archivo en DB (instancias + mime_type + filepath)
    const fileInfo = await obtenerArchivoEcografia(ecografiaId);
    console.log("[getFileHandler] fileInfo =", fileInfo);

    if (!fileInfo) {
      return res
        .status(404)
        .json({ message: "No se encontró archivo para esta ecografía" });
    }

    // Validar que tengamos filepath en DB
    if (!fileInfo.filepath) {
      console.error(
        "[getFileHandler] filepath vacío en DB para ecografiaId",
        ecografiaId
      );
      return res.status(500).json({
        message: "No hay ruta de archivo asociada en BD (filepath vacío)",
      });
    }

    let absPath = fileInfo.filepath;

    // Si la BD guarda rutas relativas tipo "26/scan-001.dcm",
    // las volvemos absolutas con STORAGE_ROOT.
    if (typeof absPath === "string" && !absPath.startsWith("/")) {
      const STORAGE_ROOT =
        process.env.STORAGE_ROOT || "/var/joeycare/storage/ecografias";
      absPath = path.join(STORAGE_ROOT, absPath);
    }

    console.log("[getFileHandler] absPath final =", absPath);

    // 2. Validar que sí exista físicamente
    if (!fs.existsSync(absPath)) {
      console.warn(
        "[getFileHandler] archivo no existe en disco:",
        absPath
      );
      return res.status(410).json({
        message:
          "El registro existe pero el archivo físico ya no está en disco",
        pathIntentado: absPath,
      });
    }

    // 3. Enviar headers correctos
    const mime = fileInfo.mime_type || "application/octet-stream";
    res.setHeader("Content-Type", mime);

    // 4. Hacer streaming del archivo al cliente
    const stream = fs.createReadStream(absPath);
    stream.on("error", (err) => {
      console.error("[getFileHandler] error leyendo archivo:", err);
      if (!res.headersSent) {
        res
          .status(500)
          .json({ message: "Error leyendo archivo desde disco" });
      }
    });

    stream.pipe(res);
  } catch (err) {
    console.error("[getFileHandler] EXCEPCION:", err);
    res.status(500).json({
      message: "Error interno recuperando el archivo de la ecografía",
      detail: err.message,
    });
  }
}

// =======================================================
// (opcional) GET /ecografias/:ecografiaId/archivo-legacy
// Versión vieja basada en res.sendFile()
// =======================================================
async function getArchivoHandler(req, res, next) {
  try {
    const { ecografiaId } = req.params;
    const fileInfo = await obtenerArchivoEcografia(ecografiaId);

    if (!fileInfo) {
      return res.status(404).json({ error: "Archivo no encontrado" });
    }

    if (!fileInfo.filepath) {
      return res.status(500).json({
        error: "No hay ruta de archivo asociada en BD",
      });
    }

    let absPath = fileInfo.filepath;
    if (typeof absPath === "string" && !absPath.startsWith("/")) {
      const STORAGE_ROOT =
        process.env.STORAGE_ROOT || "/var/joeycare/storage/ecografias";
      absPath = path.join(STORAGE_ROOT, absPath);
    }

    res
      .type(fileInfo.mime_type || "application/octet-stream")
      .sendFile(path.resolve(absPath));
  } catch (err) {
    console.error("[getArchivoHandler] error:", err);
    next(err);
  }
}

module.exports = {
  uploadHandler,
  listByNeonatoHandler,
  getFileHandler,     // <- esta es la que vamos a usar desde el front
  getArchivoHandler,  // <- si quieres dejar la versión vieja
};
