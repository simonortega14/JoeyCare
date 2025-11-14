import { Router } from "express";
import pool from "../db.js";

const router = Router();

// Obtener todos los neonatos con filtros opcionales
router.get("/neonatos", async (req, res) => {
  try {
    const { nombre, peso_min, peso_max, edad_gestacional_min, edad_gestacional_max, edad_corregida_min, edad_corregida_max } = req.query;

    let query = "SELECT id, nombre, apellido, sexo, documento, fecha_nacimiento, edad_gestacional_sem, edad_corregida_sem, peso_nacimiento_g, peso_actual_g, perimetro_cefalico FROM neonato WHERE 1=1";
    let params = [];

    if (nombre) {
      query += " AND (nombre LIKE ? OR apellido LIKE ?)";
      params.push(`%${nombre}%`, `%${nombre}%`);
    }
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

// Crear un nuevo neonato y su acudiente
router.post("/neonatos", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { nombre, apellido, documento, sexo, fecha_nacimiento, edad_gestacional_sem, edad_corregida_sem, peso_nacimiento_g, peso_actual_g, perimetro_cefalico,
            nombre_acudiente, apellido_acudiente, sexo_acudiente, parentesco, telefono, correo, medico_id } = req.body;

    if (!nombre || !apellido || !documento || !nombre_acudiente || !apellido_acudiente || !telefono || !correo || !medico_id) {
      return res.status(400).json({ message: "Nombre, apellido, documento del paciente, nombre, apellido, teléfono, correo del acudiente y médico son obligatorios" });
    }

    const [result] = await connection.query(
      "INSERT INTO neonato (nombre, apellido, documento, sexo, fecha_nacimiento, edad_gestacional_sem, edad_corregida_sem, peso_nacimiento_g, peso_actual_g, perimetro_cefalico, created_by_medico_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [nombre, apellido, documento, sexo || null, fecha_nacimiento || null, edad_gestacional_sem || null, edad_corregida_sem || null, peso_nacimiento_g || null, peso_actual_g || null, perimetro_cefalico || null, medico_id]
    );

    const neonatoId = result.insertId;

    await connection.query(
      "INSERT INTO acudiente (neonato_id, nombre, apellido, sexo, parentesco, telefono, correo) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [neonatoId, nombre_acudiente, apellido_acudiente, sexo_acudiente || null, parentesco || null, telefono, correo]
    );

    await connection.commit();

    res.status(201).json({
      id: neonatoId,
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
      created_by_medico_id: medico_id,
      acudiente: {
        nombre: nombre_acudiente,
        apellido: apellido_acudiente,
        sexo: sexo_acudiente,
        parentesco,
        telefono,
        correo
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: "Error al crear neonato y acudiente" });
  } finally {
    connection.release();
  }
});

// Obtener un neonato por ID con datos del acudiente
router.get("/neonatos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT n.*, a.nombre as nombre_acudiente, a.apellido as apellido_acudiente, a.parentesco, a.telefono, a.correo
      FROM neonato n
      LEFT JOIN acudiente a ON n.id = a.neonato_id
      WHERE n.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Neonato no encontrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener neonato" });
  }
});

// Actualizar datos del neonato (peso actual y perímetro cefálico)
router.post("/neonatos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { peso_actual_g, perimetro_cefalico } = req.body;

    // Validaciones básicas
    if (peso_actual_g !== undefined && (isNaN(peso_actual_g) || peso_actual_g < 0 || peso_actual_g > 10000)) {
      return res.status(400).json({ message: "Peso actual inválido" });
    }
    if (perimetro_cefalico !== undefined && (isNaN(perimetro_cefalico) || perimetro_cefalico < 0 || perimetro_cefalico > 100)) {
      return res.status(400).json({ message: "Perímetro cefálico inválido" });
    }

    const updateFields = [];
    const updateValues = [];

    if (peso_actual_g !== undefined) {
      updateFields.push("peso_actual_g = ?");
      updateValues.push(peso_actual_g);
    }
    if (perimetro_cefalico !== undefined) {
      updateFields.push("perimetro_cefalico = ?");
      updateValues.push(perimetro_cefalico);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No hay campos para actualizar" });
    }

    updateValues.push(id);

    const [result] = await pool.query(
      `UPDATE neonato SET ${updateFields.join(", ")}, actualizado_en = NOW() WHERE id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Neonato no encontrado" });
    }

    res.json({ message: "Neonato actualizado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar neonato" });
  }
});

// Actualizar datos del acudiente (teléfono y correo)
router.post("/acudientes/:neonatoId", async (req, res) => {
  try {
    const { neonatoId } = req.params;
    const { telefono, correo } = req.body;

    // Validaciones básicas
    if (telefono && !/^\+?[0-9\s\-\(\)]+$/.test(telefono)) {
      return res.status(400).json({ message: "Teléfono inválido" });
    }
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return res.status(400).json({ message: "Correo electrónico inválido" });
    }

    const updateFields = [];
    const updateValues = [];

    if (telefono !== undefined) {
      updateFields.push("telefono = ?");
      updateValues.push(telefono);
    }
    if (correo !== undefined) {
      updateFields.push("correo = ?");
      updateValues.push(correo);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No hay campos para actualizar" });
    }

    updateValues.push(neonatoId);

    const [result] = await pool.query(
      `UPDATE acudiente SET ${updateFields.join(", ")}, actualizado_en = NOW() WHERE neonato_id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Acudiente no encontrado" });
    }

    res.json({ message: "Acudiente actualizado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar acudiente" });
  }
});

export default router;
