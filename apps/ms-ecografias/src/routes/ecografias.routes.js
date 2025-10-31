const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const ctrl = require("../controllers/ecografias.controller");

const router = express.Router();

// ---------- Multer config ----------
const STORAGE_ROOT =
  process.env.STORAGE_ROOT || "/var/joeycare/storage/ecografias";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const now = new Date();
    const dir = path.join(
      STORAGE_ROOT,
      `${now.getFullYear()}`,
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0")
    );
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || ".dcm";
    const base = path.basename(file.originalname, ext);
    const unique = Date.now();
    cb(null, `${base}-${unique}${ext}`);
  },
});

const upload = multer({ storage });

// ---------- Middleware para exponer STORAGE_ROOT al controller ----------
router.use((req, res, next) => {
  // esto deja disponible req.app.get("STORAGE_ROOT")
  req.app.set("STORAGE_ROOT", STORAGE_ROOT);
  next();
});

// ---------- Rutas ----------

// GET /api/ecografias?neonato_id=13
router.get("/", ctrl.listPorQuery);

// GET /api/ecografias/neonatos/:neonatoId
router.get("/neonatos/:neonatoId", ctrl.listPorNeonato);

// POST /api/ecografias/upload
router.post("/upload", upload.single("file"), ctrl.uploadEcografia);

module.exports = router;
