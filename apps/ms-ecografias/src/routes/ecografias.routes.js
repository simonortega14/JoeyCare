const express = require("express");
const router = express.Router();

const { upload } = require("../storageConfig");
const {
  uploadHandler,
  listByNeonatoHandler,
  getFileHandler,
} = require("../controllers/ecografias.controller");

router.post("/ecografias/upload", upload.single("file"), uploadHandler);

router.get("/neonatos/:neonatoId/ecografias", listByNeonatoHandler);

router.get("/ecografias/:ecografiaId/archivo", getFileHandler);

module.exports = router;
