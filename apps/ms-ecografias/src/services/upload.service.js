// src/services/upload.service.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

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

function uploadMiddleware(req, res, next) {
  const single = upload.single("file"); // campo form-data: "file"

  single(req, res, function (err) {
    if (err) {
      console.error("[ms-ecografias] multer error:", err);
      return res
        .status(500)
        .json({ error: "Error recibiendo archivo DICOM" });
    }

    if (req.file) {
      // genera ruta relativa tipo "2025/10/31/archivo-123.dcm"
      const STORAGE_ROOT_NORM = path.normalize(STORAGE_ROOT);
      const REL = path
        .relative(STORAGE_ROOT_NORM, req.file.path)
        .replace(/\\/g, "/"); // windows -> unix

      req.file._relativePathUnix = REL;
    }

    next();
  });
}

module.exports = {
  uploadMiddleware,
};
