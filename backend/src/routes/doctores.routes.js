import { Router } from "express";
import pool from "../db.js";

const router = Router();

// Obtener todos los medicos
router.get("/medicos", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT m.id, m.nombre, m.apellido, m.email, m.activo, m.creado_en, m.actualizado_en,
             r.nombre as rol, e.nombre as especialidad, s.nombre as sede, s.ciudad
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
      "SELECT m.*, r.nombre as rol, e.nombre as especialidad, s.nombre as sede, s.ciudad FROM medicos m JOIN roles r ON m.rol_id = r.id JOIN especialidades e ON m.especialidad_id = e.id JOIN sedes s ON m.sede_id = s.id WHERE m.email = ? AND m.hash_password = ? AND m.activo = TRUE",
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
      rol: medico.rol,
      especialidad: medico.especialidad,
      sede: medico.sede,
      ciudad: medico.ciudad,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error en el login" });
  }
});


export default router;
