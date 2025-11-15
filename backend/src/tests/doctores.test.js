import request from "supertest";
import express from "express";
import doctoresRoutes from "../routes/doctores.routes.js";
import pool from "../db.js";

const app = express();
app.use(express.json());
app.use("/api", doctoresRoutes);

describe("GET /api/medicos", () => {
  // Cerrar la conexión después de todos los tests
  afterAll(async () => {
    await pool.end();
  });

  it("Debe devolver una lista de médicos", async () => {
    const res = await request(app).get("/api/medicos");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    if (res.body.length > 0) {
      const medico = res.body[0];
      expect(medico).toHaveProperty("id");
      expect(medico).toHaveProperty("nombre");
      expect(medico).toHaveProperty("apellido");
      expect(medico).toHaveProperty("email");
      expect(medico).toHaveProperty("rol");
      expect(medico).toHaveProperty("especialidad");
      expect(medico).toHaveProperty("sede");
    }
  });
});