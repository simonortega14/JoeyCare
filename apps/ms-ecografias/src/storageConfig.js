const path = require("path");
const fs = require("fs");
const multer = require("multer");

const STORAGE_ROOT =
  process.env.STORAGE_ROOT || "/var/joeycare/storage/ecografias";

// carpeta temporal donde primero cae todo
const TMP_DIR = path.join(STORAGE_ROOT, "tmp");

// helper para asegurar que TMP_DIR exista SIEMPRE
function ensureTmpDir() {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    console.log(">>> [ms-ecografias] recreé TMP_DIR:", TMP_DIR);
  }
}

ensureTmpDir();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // por si alguien volvió a borrar el volumen en caliente
    ensureTmpDir();
    cb(null, TMP_DIR);
  },

  filename: function (req, file, cb) {
    const clean = file.originalname.replace(/\s+/g, "_");
    const finalName = Date.now() + "_" + clean;
    cb(null, finalName);
  },
});

const upload = multer({ storage });

module.exports = {
  upload,
  STORAGE_ROOT,
};
