const service = require("../services/ecografias.service");

function sendError(res, err) {
  console.error("[ms-ecografias] Controller error:", err);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || "Error interno",
  });
}

// GET /api/ecografias?neonato_id=13
async function listPorQuery(req, res) {
  try {
    const { neonato_id } = req.query;
    const data = await service.listEcografiasDeNeonato(neonato_id);
    res.json(data);
  } catch (err) {
    sendError(res, err);
  }
}

// GET /api/ecografias/neonatos/:neonatoId
async function listPorNeonato(req, res) {
  try {
    const { neonatoId } = req.params;
    const data = await service.listResumenPorNeonato(neonatoId);
    res.json(data);
  } catch (err) {
    sendError(res, err);
  }
}

// POST /api/ecografias/upload
async function uploadEcografia(req, res) {
  try {
    const { neonato_id, uploader_medico_id } = req.body;

    const resultado = await service.registrarUpload({
      neonato_id,
      uploader_medico_id,
      storedFile: req.file,
      storageRoot: req.app.get("STORAGE_ROOT"),
    });

    res.status(201).json(resultado);
  } catch (err) {
    sendError(res, err);
  }
}

module.exports = {
  listPorQuery,
  listPorNeonato,
  uploadEcografia,
};
