const express = require("express");
const router = express.Router();
const { upload } = require("../storageConfig");
const {
  uploadHandler,
  listByNeonatoHandler,
  getFileHandler,
} = require("../controllers/ecografias.controller");

// subir archivo
router.post("/ecografias/upload", upload.single("file"), uploadHandler);

// listar ecografías de un neonato
router.get("/neonatos/:neonatoId/ecografias", listByNeonatoHandler);

// devolver binario (.dcm, .png, .jpg) de UNA ecografía
router.get("/ecografias/:ecografiaId/archivo", getFileHandler);

module.exports = router;
