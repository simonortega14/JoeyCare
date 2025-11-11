import { Router } from "express";
import pool from "../db.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// Carpeta uploads
const uploadsDir = "uploads/";
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer: PNG, JPG y DCM
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    let finalName = file.originalname;
    let counter = 1;
    while (fs.existsSync(path.join(uploadsDir, finalName))) {
      finalName = `${base}-${counter}${ext}`;
      counter++;
    }
    cb(null, finalName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExts = ["image/png", "image/jpeg", "application/dicom"];
    if (allowedExts.includes(file.mimetype) || /\.dcm$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos PNG, JPG o DICOM"), false);
    }
  },
});

// Obtener todas las ecografías
router.get("/ecografias", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT e.id, e.neonato_id, e.fecha_hora, e.filepath, e.mime_type, e.size_bytes, e.thumbnail_path, e.dicom_metadata, e.creado_en, n.nombre, n.apellido, m.nombre as uploader_nombre, m.apellido as uploader_apellido FROM ecografias e JOIN neonato n ON e.neonato_id = n.id JOIN medicos m ON e.uploader_medico_id = m.id"
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener ecografías", error: error.message });
  }
});

// Obtener estadísticas del dashboard
router.get("/dashboard/stats", async (req, res) => {
  try {
    // Total de estudios ecográficos realizados
    const [totalStudies] = await pool.query("SELECT COUNT(*) as count FROM ecografias");

    // Pacientes neonatos únicos atendidos
    const [neonatalPatients] = await pool.query("SELECT COUNT(DISTINCT neonato_id) as count FROM ecografias");

    // Ecografías realizadas hoy
    const today = new Date().toISOString().split('T')[0];
    const [todayScans] = await pool.query("SELECT COUNT(*) as count FROM ecografias WHERE DATE(fecha_hora) = ?", [today]);

    // Pacientes con bajo peso al nacer (< 2500g)
    const [lowBirthWeight] = await pool.query("SELECT COUNT(DISTINCT n.id) as count FROM neonato n JOIN ecografias e ON n.id = e.neonato_id WHERE n.peso_nacimiento_g < 2500");

    // Pacientes prematuros (< 37 semanas)
    const [prematurePatients] = await pool.query("SELECT COUNT(DISTINCT n.id) as count FROM neonato n JOIN ecografias e ON n.id = e.neonato_id WHERE n.edad_gestacional_sem < 37");

    // Informes pendientes de firma
    const [pendingReports] = await pool.query("SELECT COUNT(*) as count FROM informes WHERE estado = 'borrador'");

    // Informes firmados hoy
    const [signedReportsToday] = await pool.query("SELECT COUNT(*) as count FROM informes WHERE estado = 'firmado' AND DATE(updated_at) = ?", [today]);

    // Pacientes que requieren seguimiento (última ecografía hace más de 7 días)
    const [patientsNeedingFollowup] = await pool.query(`
      SELECT COUNT(DISTINCT n.id) as count
      FROM neonato n
      WHERE n.id NOT IN (
        SELECT DISTINCT e.neonato_id
        FROM ecografias e
        WHERE e.fecha_hora >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      )
    `);

    // Pacientes sin ecografías
    const [patientsWithoutUltrasound] = await pool.query(`
      SELECT
        n.id,
        n.nombre,
        n.apellido,
        n.documento,
        n.fecha_nacimiento,
        n.edad_gestacional_sem,
        n.peso_nacimiento_g,
        DATEDIFF(CURDATE(), n.fecha_nacimiento) as dias_vida
      FROM neonato n
      WHERE n.id NOT IN (SELECT DISTINCT neonato_id FROM ecografias)
      ORDER BY n.fecha_nacimiento DESC
      LIMIT 5
    `);

    // Actividad reciente (últimas 5 ecografías)
    const [recentActivityRows] = await pool.query(`
      SELECT
        DATE_FORMAT(e.fecha_hora, '%H:%i') as time,
        CONCAT(n.nombre, ' ', n.apellido) as patient,
        CONCAT('Ecografía - ', n.documento) as study,
        CASE
          WHEN e.creado_en > DATE_SUB(NOW(), INTERVAL 1 HOUR) THEN 'En Proceso'
          ELSE 'Completado'
        END as status,
        n.edad_gestacional_sem as gestational_age,
        n.peso_nacimiento_g as birth_weight,
        e.id as estudio_id,
        n.id as patient_id,
        e.filepath as filename
      FROM ecografias e
      JOIN neonato n ON e.neonato_id = n.id
      ORDER BY e.fecha_hora DESC
      LIMIT 5
    `);

    // Estadísticas semanales (últimas 5 entradas)
    const [weeklyStatsRows] = await pool.query(`
      SELECT
        DATE(e.fecha_hora) as upload_date,
        DAYNAME(e.fecha_hora) as day_name,
        DAYOFWEEK(e.fecha_hora) as day_num,
        COUNT(*) as scans
      FROM ecografias e
      WHERE e.fecha_hora >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(e.fecha_hora), DAYOFWEEK(e.fecha_hora), DAYNAME(e.fecha_hora)
      ORDER BY upload_date DESC
      LIMIT 5
    `);

    // Mapear estadísticas semanales
    const dayMap = {
      'Monday': 'Lun',
      'Tuesday': 'Mar',
      'Wednesday': 'Mié',
      'Thursday': 'Jue',
      'Friday': 'Vie',
      'Saturday': 'Sáb',
      'Sunday': 'Dom'
    };

    const weeklyStats = [
      { day: 'Lun', scans: 0 },
      { day: 'Mar', scans: 0 },
      { day: 'Mié', scans: 0 },
      { day: 'Jue', scans: 0 },
      { day: 'Vie', scans: 0 },
      { day: 'Sáb', scans: 0 },
      { day: 'Dom', scans: 0 }
    ];

    weeklyStatsRows.forEach(row => {
      const dayKey = dayMap[row.day_name];
      const stat = weeklyStats.find(s => s.day === dayKey);
      if (stat) stat.scans = row.scans;
    });

    res.json({
      stats: {
        totalStudies: totalStudies[0].count,
        neonatalPatients: neonatalPatients[0].count,
        todayScans: todayScans[0].count,
        lowBirthWeight: lowBirthWeight[0].count,
        prematurePatients: prematurePatients[0].count,
        pendingReports: pendingReports[0].count,
        signedReportsToday: signedReportsToday[0].count,
        patientsNeedingFollowup: patientsNeedingFollowup[0].count
      },
      weeklyStats: weeklyStats,
      recentActivity: recentActivityRows,
      patientsWithoutUltrasound: patientsWithoutUltrasound,
      alerts: []
    });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener estadísticas", error: error.message });
  }
});

// Obtener actividad reciente
router.get("/dashboard/recent-activity", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        DATE_FORMAT(e.fecha_hora, '%H:%i') as time,
        CONCAT(n.nombre, ' ', n.apellido) as patient,
        CONCAT('Ecografía - ', n.documento) as study,
        CASE
          WHEN e.creado_en > DATE_SUB(NOW(), INTERVAL 1 HOUR) THEN 'En Proceso'
          ELSE 'Completado'
        END as status,
        n.edad_gestacional_sem as gestational_age,
        n.peso_nacimiento_g as birth_weight,
        n.fecha_nacimiento as birth_date,
        e.id as estudio_id
      FROM ecografias e
      JOIN neonato n ON e.neonato_id = n.id
      ORDER BY e.fecha_hora DESC
      LIMIT 4
    `);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener actividad reciente", error: error.message });
  }
});

// Obtener estadísticas semanales
router.get("/dashboard/weekly-stats", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        DATE(fecha_hora) as upload_date,
        DAYNAME(fecha_hora) as day_name,
        DAYOFWEEK(fecha_hora) as day_num,
        COUNT(*) as scans
      FROM ecografias
      WHERE fecha_hora >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(fecha_hora), DAYOFWEEK(fecha_hora), DAYNAME(fecha_hora)
      ORDER BY upload_date DESC
    `);

    // Mapear a formato esperado por el frontend
    const dayMap = {
      'Monday': 'Lun',
      'Tuesday': 'Mar',
      'Wednesday': 'Mié',
      'Thursday': 'Jue',
      'Friday': 'Vie',
      'Saturday': 'Sáb',
      'Sunday': 'Dom'
    };

    const weeklyStats = [
      { day: 'Lun', scans: 0 },
      { day: 'Mar', scans: 0 },
      { day: 'Mié', scans: 0 },
      { day: 'Jue', scans: 0 },
      { day: 'Vie', scans: 0 },
      { day: 'Sáb', scans: 0 },
      { day: 'Dom', scans: 0 }
    ];

    rows.forEach(row => {
      const dayKey = dayMap[row.day_name];
      const stat = weeklyStats.find(s => s.day === dayKey);
      if (stat) stat.scans = row.scans;
    });

    res.json(weeklyStats);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener estadísticas semanales", error: error.message });
  }
});

// Subir ecografía
router.post("/ecografias/:neonatoId", upload.single("imagen"), async (req, res) => {
  try {
    const { neonatoId } = req.params;
    const { uploader_medico_id, sede_id, fecha_hora } = req.body;
    if (!req.file) return res.status(400).json({ message: "Se requiere archivo" });

    const [neonatoRows] = await pool.query(
      "SELECT id FROM neonato WHERE id = ?",
      [neonatoId]
    );
    if (neonatoRows.length === 0) {
      fs.unlinkSync(path.join(uploadsDir, req.file.filename));
      return res.status(404).json({ message: "Neonato no encontrado" });
    }

    const [result] = await pool.query(
      "INSERT INTO ecografias (neonato_id, fecha_hora, uploader_medico_id, sede_id, filepath, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [neonatoId, fecha_hora || new Date(), uploader_medico_id, sede_id || null, req.file.filename, req.file.mimetype, req.file.size]
    );

    res.status(201).json({
      message: "Ecografía subida correctamente",
      id: result.insertId,
      neonato_id: neonatoId,
      filepath: req.file.filename,
    });

  } catch (error) {
    if (req.file && fs.existsSync(path.join(uploadsDir, req.file.filename))) {
      fs.unlinkSync(path.join(uploadsDir, req.file.filename));
    }
    res.status(500).json({ message: "Error al subir ecografía", error: error.message });
  }
});

// Obtener ecografías de un neonato
router.get("/neonatos/:id/ecografias", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      "SELECT e.*, m.nombre as uploader_nombre, m.apellido as uploader_apellido FROM ecografias e JOIN medicos m ON e.uploader_medico_id = m.id WHERE e.neonato_id = ?",
      [id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener ecografías del neonato", error: error.message });
  }
});

// Obtener informe por ecografia_id
router.get("/informes/:ecografiaId", async (req, res) => {
  try {
    const { ecografiaId } = req.params;
    const [rows] = await pool.query("SELECT * FROM informes WHERE ecografia_id = ?", [ecografiaId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Informe no encontrado" });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener informe", error: error.message });
  }
});

// Crear o actualizar informe
router.post("/informes", async (req, res) => {
  try {
    const { ecografia_id, titulo, contenido, hallazgos, conclusion, recomendaciones, firma_medico } = req.body;

    // Validar campos requeridos
    if (!ecografia_id || !titulo || !contenido || !hallazgos || !conclusion || !recomendaciones || !firma_medico) {
      return res.status(400).json({ message: "Todos los campos son requeridos" });
    }

    // Verificar que la ecografía existe
    const [ecografiaRows] = await pool.query("SELECT id FROM ecografias WHERE id = ?", [ecografia_id]);
    if (ecografiaRows.length === 0) {
      return res.status(404).json({ message: "Ecografía no encontrada" });
    }

    // Intentar insertar, si ya existe, actualizar
    const [result] = await pool.query(`
      INSERT INTO informes (ecografia_id, medico_id, titulo, contenido, hallazgos, conclusion, recomendaciones, firma_medico, fecha_informe)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        titulo = VALUES(titulo),
        contenido = VALUES(contenido),
        hallazgos = VALUES(hallazgos),
        conclusion = VALUES(conclusion),
        recomendaciones = VALUES(recomendaciones),
        firma_medico = VALUES(firma_medico),
        updated_at = NOW()
    `, [ecografia_id, 1, titulo, contenido, hallazgos, conclusion, recomendaciones, firma_medico]); // medico_id hardcoded as 1 for now

    res.status(201).json({
      message: "Informe guardado correctamente",
      id: result.insertId || ecografia_id
    });

  } catch (error) {
    res.status(500).json({ message: "Error al guardar informe", error: error.message });
  }
});

// Servir archivos
router.get("/uploads/:filename", (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).send("Archivo no encontrado");

  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".dcm") res.type("application/dicom");
  res.sendFile(path.resolve(filePath));
});

export default router;
