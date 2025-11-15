import request from "supertest";
import express from "express";
import doctoresRoutes from "../routes/doctores.routes.js";
import pool from "../db.js";

const app = express();
app.use(express.json());
app.use("/api", doctoresRoutes);

describe("Rutas de Doctores/Médicos", () => {
  afterAll(async () => {
    await pool.end();
  });

  describe("GET /api/medicos", () => {
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

  describe("GET /api/sedes", () => {
    it("Debe devolver lista de sedes", async () => {
      const res = await request(app).get("/api/sedes");
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty("id");
        expect(res.body[0]).toHaveProperty("nombre");
        expect(res.body[0]).toHaveProperty("ciudad");
      }
    });
  });

  describe("GET /api/especialidades", () => {
    it("Debe devolver lista de especialidades", async () => {
      const res = await request(app).get("/api/especialidades");
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty("id");
        expect(res.body[0]).toHaveProperty("nombre");
      }
    });
  });

  describe("POST /api/medicos", () => {
    it("Debe crear un nuevo médico con todos los campos requeridos", async () => {
      const nuevoMedico = {
        rol_id: 2,
        especialidad_id: 1,
        sede_id: 1,
        nombre: "Carlos",
        apellido: "Rodríguez",
        email: `test${Date.now()}@test.com`,
        hash_password: "hashedpassword123"
      };

      const res = await request(app)
        .post("/api/medicos")
        .send(nuevoMedico);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.nombre).toBe(nuevoMedico.nombre);
      expect(res.body.email).toBe(nuevoMedico.email);
    });

    it("Debe rechazar médico sin campos requeridos", async () => {
      const medicoIncompleto = {
        nombre: "Juan"
      };

      const res = await request(app)
        .post("/api/medicos")
        .send(medicoIncompleto);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("message");
    });
  });

  describe("POST /api/medicos/login", () => {
    let testMedicoEmail;
    let testMedicoPassword = "testpassword123";

    beforeAll(async () => {
      testMedicoEmail = `logintest${Date.now()}@test.com`;
      
      await pool.query(
        "INSERT INTO medicos (rol_id, especialidad_id, sede_id, nombre, apellido, email, hash_password, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [2, 1, 1, "Test", "Login", testMedicoEmail, testMedicoPassword, true]
      );
    });

    it("Debe hacer login con credenciales correctas", async () => {
      const res = await request(app)
        .post("/api/medicos/login")
        .send({
          email: testMedicoEmail,
          password: testMedicoPassword
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("nombre");
      expect(res.body).toHaveProperty("email");
      expect(res.body).toHaveProperty("rol");
      expect(res.body).toHaveProperty("especialidad");
      expect(res.body.email).toBe(testMedicoEmail);
    });

    it("Debe rechazar login con credenciales incorrectas", async () => {
      const res = await request(app)
        .post("/api/medicos/login")
        .send({
          email: testMedicoEmail,
          password: "wrongpassword"
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty("message");
    });

    it("Debe rechazar login sin email o password", async () => {
      const res = await request(app)
        .post("/api/medicos/login")
        .send({
          email: testMedicoEmail
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /api/medicos/pendientes", () => {
    it("Debe devolver lista de médicos pendientes de aprobación", async () => {
      const res = await request(app).get("/api/medicos/pendientes");
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("PUT /api/medicos/:id/aprobar", () => {
    it("Debe aprobar un médico pendiente", async () => {
      const [result] = await pool.query(
        "INSERT INTO medicos (rol_id, especialidad_id, sede_id, nombre, apellido, email, hash_password, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [2, 1, 1, "Pendiente", "Aprobar", `aprobar${Date.now()}@test.com`, "hash123", false]
      );

      const medicoId = result.insertId;

      const res = await request(app).put(`/api/medicos/${medicoId}/aprobar`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("message");

      const [rows] = await pool.query("SELECT activo FROM medicos WHERE id = ?", [medicoId]);
      expect(rows[0].activo).toBe(1);
    });
  });

  describe("DELETE /api/medicos/:id", () => {
    it("Debe eliminar un médico (rechazar solicitud)", async () => {
      const [result] = await pool.query(
        "INSERT INTO medicos (rol_id, especialidad_id, sede_id, nombre, apellido, email, hash_password) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [2, 1, 1, "Temporal", "Delete", `delete${Date.now()}@test.com`, "hash123"]
      );

      const medicoId = result.insertId;

      const res = await request(app).delete(`/api/medicos/${medicoId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("message");

      const [rows] = await pool.query("SELECT * FROM medicos WHERE id = ?", [medicoId]);
      expect(rows.length).toBe(0);
    });
  });
});