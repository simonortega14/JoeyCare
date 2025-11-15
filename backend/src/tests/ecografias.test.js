import request from "supertest";
import express from "express";
import ecografiasRoutes from "../routes/ecografias.routes.js";
import pool from "../db.js";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());
app.use("/api", ecografiasRoutes);

describe("Rutas de Ecografías", () => {
  afterAll(async () => {
    await pool.end();
  });

  describe("GET /api/ecografias", () => {
    it("Debe devolver lista de ecografías", async () => {
      const res = await request(app).get("/api/ecografias");
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /api/dashboard/stats", () => {
    it("Debe devolver estadísticas del dashboard", async () => {
      const res = await request(app).get("/api/dashboard/stats");
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("stats");
      expect(res.body.stats).toHaveProperty("totalStudies");
      expect(res.body.stats).toHaveProperty("neonatalPatients");
      expect(res.body.stats).toHaveProperty("todayScans");
      expect(res.body).toHaveProperty("weeklyStats");
      expect(Array.isArray(res.body.weeklyStats)).toBe(true);
      expect(res.body).toHaveProperty("recentActivity");
    });

    it("Las estadísticas semanales deben tener 7 días", async () => {
      const res = await request(app).get("/api/dashboard/stats");
      
      expect(res.body.weeklyStats.length).toBe(7);
      
      // Verificar que cada día tiene la estructura correcta
      res.body.weeklyStats.forEach(stat => {
        expect(stat).toHaveProperty("day");
        expect(stat).toHaveProperty("scans");
        expect(typeof stat.scans).toBe("number");
      });
    });
  });

  describe("GET /api/dashboard/recent-activity", () => {
    it("Debe devolver actividad reciente", async () => {
      const res = await request(app).get("/api/dashboard/recent-activity");
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      
      // Verificar estructura si hay datos
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty("time");
        expect(res.body[0]).toHaveProperty("patient");
        expect(res.body[0]).toHaveProperty("study");
        expect(res.body[0]).toHaveProperty("status");
      }
    });
  });

  describe("GET /api/dashboard/weekly-stats", () => {
    it("Debe devolver estadísticas semanales", async () => {
      const res = await request(app).get("/api/dashboard/weekly-stats");
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(7);
      
      // Verificar días de la semana
      const dias = res.body.map(s => s.day);
      expect(dias).toContain("Lun");
      expect(dias).toContain("Vie");
      expect(dias).toContain("Dom");
    });
  });

  describe("GET /api/neonatos/:id/ecografias", () => {
    it("Debe devolver ecografías de un neonato específico", async () => {
      // Primero crear un neonato
      const documento = Math.floor(Math.random() * 999999999);
      const [result] = await pool.query(
        "INSERT INTO neonato (nombre, apellido, documento, created_by_medico_id) VALUES (?, ?, ?, ?)",
        ["Test", "Ecografia", documento.toString(), 1]
      );

      const neonatoId = result.insertId;

      const res = await request(app).get(`/api/neonatos/${neonatoId}/ecografias`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /api/ecografias/:id/details", () => {
    it("Debe devolver 404 para ecografía inexistente", async () => {
      const res = await request(app).get("/api/ecografias/99999/details");
      
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty("message");
    });
  });

  describe("GET /api/medicos/:medicoId/kpis", () => {
    it("Debe devolver KPIs de un médico", async () => {
      const res = await request(app).get("/api/medicos/1/kpis");
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("pacientesCreados");
      expect(res.body).toHaveProperty("ecografiasSubidas");
      expect(res.body).toHaveProperty("reportesFirmados");
      expect(typeof res.body.pacientesCreados).toBe("number");
      expect(typeof res.body.ecografiasSubidas).toBe("number");
      expect(typeof res.body.reportesFirmados).toBe("number");
    });
  });

  describe("GET /api/reportes/all", () => {
    it("Debe devolver todos los reportes", async () => {
      const res = await request(app).get("/api/reportes/all");
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /api/reportes/ecografia/:ecografiaId", () => {
    it("Debe devolver 404 para ecografía sin reporte", async () => {
      const res = await request(app).get("/api/reportes/ecografia/99999");
      
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty("message");
    });
  });

  describe("GET /api/reportes/:id", () => {
    it("Debe devolver 404 para reporte inexistente", async () => {
      const res = await request(app).get("/api/reportes/99999");
      
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty("message");
    });
  });

  describe("POST /api/reportes - Validaciones", () => {
    it("Debe rechazar reporte sin campos requeridos", async () => {
      const reporteIncompleto = {
        ecografia_id: 1,
        titulo: "Test"
        // Faltan campos requeridos
      };

      const res = await request(app)
        .post("/api/reportes")
        .send(reporteIncompleto);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("message");
    });

    it("Debe rechazar reporte con ecografía inexistente", async () => {
      const reporteInvalido = {
        ecografia_id: 99999,
        titulo: "Test",
        contenido: "Contenido test",
        hallazgos: "Hallazgos test",
        conclusion: "Conclusión test",
        recomendaciones: "Recomendaciones test",
        firma_medico: "Dr. Test"
      };

      const res = await request(app)
        .post("/api/reportes")
        .send(reporteInvalido);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty("message");
    });
  });

  describe("PUT /api/reportes/:id/estado", () => {
    it("Debe rechazar estado inválido", async () => {
      const res = await request(app)
        .put("/api/reportes/1/estado")
        .send({ estado: "invalido", medico_id: 1 });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("message");
    });

    it("Debe rechazar actualización de reporte inexistente", async () => {
      const res = await request(app)
        .put("/api/reportes/99999/estado")
        .send({ estado: "firmado", medico_id: 1 });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("GET /api/reportes/history/:medicoId", () => {
    it("Debe devolver historial de reportes de un médico", async () => {
      const res = await request(app).get("/api/reportes/history/1");
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /api/reportes/:reporteId/historial", () => {
    it("Debe devolver historial de versiones de un reporte", async () => {
      const res = await request(app).get("/api/reportes/1/historial");
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /api/uploads/:filename", () => {
    it("Debe devolver 404 para archivo inexistente", async () => {
      const res = await request(app).get("/api/uploads/archivo-inexistente.png");
      
      expect(res.statusCode).toBe(404);
    });
  });
});