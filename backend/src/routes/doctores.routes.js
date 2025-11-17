import { Router } from "express";
import pool from "../db.js";
import multer from "multer";
import path from "path";

const router = Router();

// Configurar multer para subir fotos de perfil
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Obtener todos los medicos
router.get("/medicos", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT m.id, m.nombre, m.apellido, m.email, m.activo, m.creado_en, m.actualizado_en,
             r.nombre as rol, e.nombre as especialidad, e.descripcion as especialidad_descripcion,
             s.nombre as sede, s.institucion as sede_institucion, s.ciudad as sede_ciudad, s.direccion as sede_direccion
      FROM medicos m
      JOIN roles r ON m.rol_id = r.id
      JOIN especialidades e ON m.especialidad_id = e.id
      JOIN sedes s ON m.sede_id = s.id
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener los medicos" });
  }
});

// Crear un nuevo medico
router.post("/medicos", async (req, res) => {
  try {
    const { rol_id, especialidad_id, sede_id, nombre, apellido, email, hash_password } = req.body;

    if (!rol_id || !especialidad_id || !sede_id || !nombre || !apellido || !email || !hash_password) {
      return res.status(400).json({ message: "Todos los campos obligatorios deben estar llenos" });
    }

    const [result] = await pool.query(
      "INSERT INTO medicos (rol_id, especialidad_id, sede_id, nombre, apellido, email, hash_password) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [rol_id, especialidad_id, sede_id, nombre, apellido, email, hash_password]
    );

    res.status(201).json({
      id: result.insertId,
      nombre,
      apellido,
      email,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al crear el medico" });
  }
});

// Login de medico
router.post("/medicos/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email y contraseña son obligatorios" });
    }

    const [rows] = await pool.query(
      "SELECT m.*, r.nombre as rol, e.nombre as especialidad, e.descripcion as especialidad_descripcion, s.nombre as sede, s.institucion as sede_institucion, s.ciudad as sede_ciudad, s.direccion as sede_direccion FROM medicos m JOIN roles r ON m.rol_id = r.id JOIN especialidades e ON m.especialidad_id = e.id JOIN sedes s ON m.sede_id = s.id WHERE m.email = ? AND m.hash_password = ? AND m.activo = TRUE",
      [email, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    // Devolvemos los datos del medico con joins
    const medico = rows[0];
    res.json({
      id: medico.id,
      nombre: medico.nombre,
      apellido: medico.apellido,
      email: medico.email,
      rol_id: medico.rol_id,
      rol: medico.rol,
      especialidad: medico.especialidad,
      especialidad_descripcion: medico.especialidad_descripcion,
      sede: medico.sede,
      sede_institucion: medico.sede_institucion,
      sede_ciudad: medico.sede_ciudad,
      sede_direccion: medico.sede_direccion,
      foto_perfil: medico.foto_perfil,
      activo: medico.activo,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error en el login" });
  }
});

// Actualizar foto de perfil
router.put("/medicos/:id/foto", upload.single('foto'), async (req, res) => {
  try {
    const { id } = req.params;
    const fotoPath = req.file ? req.file.filename : null;

    if (!fotoPath) {
      return res.status(400).json({ message: "No se proporcionó una foto" });
    }

    await pool.query(
      "UPDATE medicos SET foto_perfil = ? WHERE id = ?",
      [fotoPath, id]
    );

    res.json({ message: "Foto de perfil actualizada", foto_perfil: fotoPath });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar foto de perfil" });
  }
});

// Obtener todas las sedes
router.get("/sedes", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, nombre, ciudad FROM sedes");
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener sedes" });
  }
});

// Obtener todas las especialidades
router.get("/especialidades", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, nombre FROM especialidades");
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener especialidades" });
  }
});

// Obtener médicos pendientes (no activos)
router.get("/medicos/pendientes", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT m.id, m.nombre, m.apellido, m.email,
             r.nombre as rol, e.nombre as especialidad, s.nombre as sede
      FROM medicos m
      JOIN roles r ON m.rol_id = r.id
      JOIN especialidades e ON m.especialidad_id = e.id
      JOIN sedes s ON m.sede_id = s.id
      WHERE m.activo = FALSE
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener médicos pendientes" });
  }
});

// Aprobar médico
router.put("/medicos/:id/aprobar", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE medicos SET activo = TRUE WHERE id = ?", [id]);
    res.json({ message: "Médico aprobado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al aprobar médico" });
  }
});

// Rechazar médico
router.delete("/medicos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM medicos WHERE id = ?", [id]);
    res.json({ message: "Solicitud rechazada correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al rechazar médico" });
  }
});

export default router;
