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

    // Reportes pendientes de firma
    const [pendingReports] = await pool.query("SELECT COUNT(*) as count FROM reportes WHERE estado = 'borrador'");

    // Reportes firmados hoy
    const [signedReportsToday] = await pool.query("SELECT COUNT(*) as count FROM reportes WHERE estado = 'firmado' AND DATE(updated_at) = ?", [today]);

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

// Obtener detalles de una ecografía con información del paciente
router.get("/ecografias/:id/details", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT
        e.id,
        e.neonato_id,
        e.fecha_hora,
        e.filepath,
        e.mime_type,
        e.size_bytes,
        e.thumbnail_path,
        e.dicom_metadata,
        e.creado_en,
        n.nombre,
        n.apellido,
        n.documento,
        n.sexo,
        n.fecha_nacimiento,
        n.edad_gestacional_sem,
        n.edad_corregida_sem,
        n.peso_nacimiento_g,
        n.peso_actual_g,
        n.perimetro_cefalico,
        m.nombre as uploader_nombre,
        m.apellido as uploader_apellido
      FROM ecografias e
      JOIN neonato n ON e.neonato_id = n.id
      JOIN medicos m ON e.uploader_medico_id = m.id
      WHERE e.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Ecografía no encontrada" });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener detalles de la ecografía", error: error.message });
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

// Obtener KPIs de un médico
router.get("/medicos/:medicoId/kpis", async (req, res) => {
  try {
    const { medicoId } = req.params;

    // Pacientes creados por el médico
    const [pacientesRows] = await pool.query("SELECT COUNT(*) as count FROM neonato WHERE created_by_medico_id = ?", [medicoId]);
    const pacientesCreados = pacientesRows[0].count;

    // Ecografías subidas por el médico
    const [ecografiasRows] = await pool.query("SELECT COUNT(*) as count FROM ecografias WHERE uploader_medico_id = ?", [medicoId]);
    const ecografiasSubidas = ecografiasRows[0].count;

    // Reportes firmados por el médico (donde aparece en firma_medico)
    const [reportesRows] = await pool.query("SELECT COUNT(*) as count FROM reportes WHERE created_by_medico_id = ? OR updated_by_medico_id = ?", [medicoId, medicoId]);
    const reportesFirmados = reportesRows[0].count;

    res.json({
      pacientesCreados,
      ecografiasSubidas,
      reportesFirmados
    });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener KPIs", error: error.message });
  }
});

// Obtener todos los reportes con información completa
router.get("/reportes/all", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.id, r.titulo, r.contenido, r.hallazgos, r.conclusion, r.recomendaciones,
             r.firma_medico, r.fecha_reporte, r.estado, r.created_at, r.updated_at,
             r.created_by_medico_id, r.updated_by_medico_id,
             n.nombre as paciente_nombre, n.apellido as paciente_apellido, n.documento as paciente_documento,
             m.nombre as medico_nombre, m.apellido as medico_apellido,
             e.filepath, e.id as ecografia_id
      FROM reportes r
      JOIN ecografias e ON r.ecografia_id = e.id
      JOIN neonato n ON e.neonato_id = n.id
      LEFT JOIN medicos m ON r.created_by_medico_id = m.id
      ORDER BY r.updated_at DESC
    `);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener todos los reportes", error: error.message });
  }
});

// Obtener reporte por ecografia_id con información completa
router.get("/reportes/:ecografiaId", async (req, res) => {
  try {
    const { ecografiaId } = req.params;
    const [rows] = await pool.query(`
      SELECT r.*, n.id as paciente_id, n.nombre as paciente_nombre, n.apellido as paciente_apellido, n.documento as paciente_documento,
             m.nombre as medico_nombre, m.apellido as medico_apellido, e.filepath
      FROM reportes r
      JOIN ecografias e ON r.ecografia_id = e.id
      JOIN neonato n ON e.neonato_id = n.id
      LEFT JOIN medicos m ON r.created_by_medico_id = m.id
      WHERE r.ecografia_id = ?
    `, [ecografiaId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Reporte no encontrado" });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener reporte", error: error.message });
  }
});

// Obtener historial de reportes modificados por un médico
router.get("/reportes/history/:medicoId", async (req, res) => {
  try {
    const { medicoId } = req.params;
    const [rows] = await pool.query(`
      SELECT DISTINCT r.id, r.titulo, r.fecha_reporte, r.updated_at,
             e.id as ecografia_id, e.filepath, n.nombre as paciente_nombre, n.apellido as paciente_apellido
      FROM reportes r
      JOIN ecografias e ON r.ecografia_id = e.id
      JOIN neonato n ON e.neonato_id = n.id
      WHERE r.updated_by_medico_id = ? OR r.created_by_medico_id = ?
      ORDER BY r.updated_at DESC
      LIMIT 10
    `, [medicoId, medicoId]);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener historial de reportes", error: error.message });
  }
});

// Crear o actualizar reporte con manejo de estados
router.post("/reportes", async (req, res) => {
  try {
    const { ecografia_id, titulo, contenido, hallazgos, conclusion, recomendaciones, firma_medico, medico_id } = req.body;

    // Validar campos requeridos
    if (!ecografia_id || !contenido || !hallazgos || !conclusion || !recomendaciones || !firma_medico) {
      return res.status(400).json({ message: "Todos los campos son requeridos" });
    }

    // Verificar que la ecografía existe
    const [ecografiaRows] = await pool.query("SELECT id FROM ecografias WHERE id = ?", [ecografia_id]);
    if (ecografiaRows.length === 0) {
      return res.status(404).json({ message: "Ecografía no encontrada" });
    }

    // Usar medico_id del request o default
    const currentMedicoId = medico_id || 1;

    // Verificar si el reporte ya existe para manejar historial
    const [existingReport] = await pool.query("SELECT * FROM reportes WHERE ecografia_id = ?", [ecografia_id]);

    if (existingReport.length > 0) {
      // Obtener la versión actual
      const [versionResult] = await pool.query("SELECT MAX(version) as max_version FROM reportes_historial WHERE reporte_id = ?", [existingReport[0].id]);
      const currentVersion = versionResult[0].max_version || 0;

      // Insertar en historial antes de actualizar
      await pool.query(`
        INSERT INTO reportes_historial (reporte_id, version, datos_json, medico_id)
        VALUES (?, ?, ?, ?)
      `, [existingReport[0].id, currentVersion + 1, JSON.stringify(existingReport[0]), currentMedicoId]);
    }

    // Obtener información de la ecografía y paciente para el título estándar
    const [ecografiaInfo] = await pool.query(`
      SELECT e.filepath, n.nombre, n.apellido
      FROM ecografias e
      JOIN neonato n ON e.neonato_id = n.id
      WHERE e.id = ?
    `, [ecografia_id]);

    const tituloEstandar = ecografiaInfo.length > 0 ? `${ecografiaInfo[0].nombre} ${ecografiaInfo[0].apellido} - ${ecografiaInfo[0].filepath}` : titulo;

    // Crear o actualizar reporte con estado 'firmado'
    const [result] = await pool.query(`
      INSERT INTO reportes (ecografia_id, created_by_medico_id, titulo, contenido, hallazgos, conclusion, recomendaciones, firma_medico, fecha_reporte, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'firmado')
      ON DUPLICATE KEY UPDATE
        titulo = VALUES(titulo),
        contenido = VALUES(contenido),
        hallazgos = VALUES(hallazgos),
        conclusion = VALUES(conclusion),
        recomendaciones = VALUES(recomendaciones),
        firma_medico = VALUES(firma_medico),
        estado = 'firmado',
        updated_by_medico_id = VALUES(created_by_medico_id),
        updated_at = NOW()
    `, [ecografia_id, currentMedicoId, tituloEstandar, contenido, hallazgos, conclusion, recomendaciones, firma_medico]);

    res.status(200).json({
      message: "Reporte firmado correctamente",
      id: result.insertId || ecografia_id
    });

  } catch (error) {
    res.status(500).json({ message: "Error al guardar reporte", error: error.message });
  }
});

// Actualizar estado de un reporte
router.put("/reportes/:id/estado", async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, medico_id } = req.body;

    if (!['borrador', 'firmado', 'anulado'].includes(estado)) {
      return res.status(400).json({ message: "Estado inválido" });
    }

    // Obtener reporte actual para historial
    const [existingReport] = await pool.query("SELECT * FROM reportes WHERE id = ?", [id]);
    if (existingReport.length === 0) {
      return res.status(404).json({ message: "Reporte no encontrado" });
    }

    // Insertar en historial si es actualización
    const [versionResult] = await pool.query("SELECT MAX(version) as max_version FROM reportes_historial WHERE reporte_id = ?", [id]);
    const currentVersion = versionResult[0].max_version || 0;

    await pool.query(`
      INSERT INTO reportes_historial (reporte_id, version, datos_json, medico_id)
      VALUES (?, ?, ?, ?)
    `, [id, currentVersion + 1, JSON.stringify(existingReport[0]), medico_id || 1]);

    // Actualizar estado
    await pool.query("UPDATE reportes SET estado = ?, updated_by_medico_id = ?, updated_at = NOW() WHERE id = ?", [estado, medico_id || 1, id]);

    res.json({ message: "Estado actualizado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar estado", error: error.message });
  }
});

// Obtener historial de versiones de un reporte
router.get("/reportes/:reporteId/historial", async (req, res) => {
  try {
    const { reporteId } = req.params;
    const [rows] = await pool.query(`
      SELECT h.*, m.nombre as medico_nombre, m.apellido as medico_apellido
      FROM reportes_historial h
      JOIN medicos m ON h.medico_id = m.id
      WHERE h.reporte_id = ?
      ORDER BY h.version DESC
    `, [reporteId]);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener historial del reporte", error: error.message });
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
