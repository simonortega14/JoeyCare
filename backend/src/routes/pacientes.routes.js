import { Router } from "express";
import pool from "../db.js";

const router = Router();

// Obtener todos los neonatos con filtros opcionales
router.get("/neonatos", async (req, res) => {
  try {
    const { peso_min, peso_max, edad_gestacional_min, edad_gestacional_max, edad_corregida_min, edad_corregida_max } = req.query;

    let query = "SELECT id, nombre, apellido, sexo, documento, fecha_nacimiento, edad_gestacional_sem, edad_corregida_sem, peso_nacimiento_g, peso_actual_g, perimetro_cefalico FROM neonato WHERE 1=1";
    let params = [];

    if (peso_min) {
      query += " AND peso_nacimiento_g >= ?";
      params.push(parseFloat(peso_min));
    }
    if (peso_max) {
      query += " AND peso_nacimiento_g <= ?";
      params.push(parseFloat(peso_max));
    }
    if (edad_gestacional_min) {
      query += " AND edad_gestacional_sem >= ?";
      params.push(parseInt(edad_gestacional_min));
    }
    if (edad_gestacional_max) {
      query += " AND edad_gestacional_sem <= ?";
      params.push(parseInt(edad_gestacional_max));
    }
    if (edad_corregida_min) {
      query += " AND edad_corregida_sem >= ?";
      params.push(parseInt(edad_corregida_min));
    }
    if (edad_corregida_max) {
      query += " AND edad_corregida_sem <= ?";
      params.push(parseInt(edad_corregida_max));
    }

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener los neonatos" });
  }
});

// Crear un nuevo neonato
router.post("/neonatos", async (req, res) => {
  try {
    const { nombre, apellido, documento, sexo, fecha_nacimiento, edad_gestacional_sem, edad_corregida_sem, peso_nacimiento_g, peso_actual_g, perimetro_cefalico } = req.body;

    if (!nombre || !apellido || !documento) {
      return res.status(400).json({ message: "Nombre, apellido y documento son obligatorios" });
    }

    const [result] = await pool.query(
      "INSERT INTO neonato (nombre, apellido, documento, sexo, fecha_nacimiento, edad_gestacional_sem, edad_corregida_sem, peso_nacimiento_g, peso_actual_g, perimetro_cefalico) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [nombre, apellido, documento, sexo || null, fecha_nacimiento || null, edad_gestacional_sem || null, edad_corregida_sem || null, peso_nacimiento_g || null, peso_actual_g || null, perimetro_cefalico || null]
    );

    res.status(201).json({
      id: result.insertId,
      nombre,
      apellido,
      documento,
      sexo,
      fecha_nacimiento,
      edad_gestacional_sem,
      edad_corregida_sem,
      peso_nacimiento_g,
      peso_actual_g,
      perimetro_cefalico,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al crear neonato" });
  }
});

// Obtener un neonato por ID
router.get("/neonatos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query("SELECT * FROM neonato WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Neonato no encontrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener neonato" });
  }
});

export default router;
