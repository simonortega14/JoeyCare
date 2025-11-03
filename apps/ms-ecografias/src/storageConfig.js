const path = require("path");
const fs = require("fs");
const multer = require("multer");

const STORAGE_ROOT =
  process.env.STORAGE_ROOT || "/var/joeycare/storage/ecografias";
const TMP_DIR = path.join(STORAGE_ROOT, "tmp");

function ensureTmpDir() {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    console.log(">>> [ms-ecografias] recreé TMP_DIR:", TMP_DIR);
  }
}
ensureTmpDir();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureTmpDir();
    cb(null, TMP_DIR);
  },
  filename: (req, file, cb) => {
    const clean = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}_${clean}`);
  },
});

const upload = multer({ storage });

module.exports = { upload, STORAGE_ROOT };
