import request from "supertest";
import express from "express";
import pacientesRoutes from "../routes/pacientes.routes.js";
import pool from "../db.js";

const app = express();
app.use(express.json());
app.use("/api", pacientesRoutes);

describe("Rutas de Pacientes (Neonatos)", () => {
  afterAll(async () => {
    await pool.end();
  });

  describe("GET /api/neonatos", () => {
    it("Debe devolver lista de neonatos", async () => {
      const res = await request(app).get("/api/neonatos");
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("Debe devolver neonatos con la estructura correcta", async () => {
      const res = await request(app).get("/api/neonatos");
      
      if (res.body.length > 0) {
        const neonato = res.body[0];
        expect(neonato).toHaveProperty("id");
        expect(neonato).toHaveProperty("nombre");
        expect(neonato).toHaveProperty("apellido");
        expect(neonato).toHaveProperty("documento");
      }
    });

    it("Debe filtrar por nombre", async () => {
      const res = await request(app).get("/api/neonatos?nombre=Test");
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("Debe filtrar por peso", async () => {
      const res = await request(app).get("/api/neonatos?peso_min=2000&peso_max=4000");
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("POST /api/neonatos", () => {
    it("Debe crear un nuevo neonato con acudiente", async () => {
      const nuevoNeonato = {
        nombre: "Bebé",
        apellido: "Test",
        documento: `${Date.now()}`,
        sexo: "M",
        fecha_nacimiento: "2024-01-15",
        edad_gestacional_sem: 38,
        peso_nacimiento_g: 3200,
        peso_actual_g: 3300,
        perimetro_cefalico: 35.5,
        nombre_acudiente: "Madre",
        apellido_acudiente: "Test",
        sexo_acudiente: "F",
        parentesco: "M",
        telefono: "3001234567",
        correo: `acudiente${Date.now()}@test.com`,
        medico_id: 1
      };

      const res = await request(app)
        .post("/api/neonatos")
        .send(nuevoNeonato);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.nombre).toBe(nuevoNeonato.nombre);
      expect(res.body).toHaveProperty("acudiente");
      expect(res.body.acudiente.nombre).toBe(nuevoNeonato.nombre_acudiente);
    });

    it("Debe rechazar neonato sin campos requeridos", async () => {
      const neonatoIncompleto = {
        nombre: "Bebé"
        // Faltan campos requeridos
      };

      const res = await request(app)
        .post("/api/neonatos")
        .send(neonatoIncompleto);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("message");
    });

    it("Debe rechazar neonato sin datos de acudiente", async () => {
      const neonatoSinAcudiente = {
        nombre: "Bebé",
        apellido: "Test",
        documento: `${Date.now()}`,
        medico_id: 1
        // Faltan datos de acudiente
      };

      const res = await request(app)
        .post("/api/neonatos")
        .send(neonatoSinAcudiente);

      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /api/neonatos/:id", () => {
    it("Debe devolver un neonato específico con datos del acudiente", async () => {
      // Primero crear un neonato
      const nuevoNeonato = {
        nombre: "Bebé",
        apellido: "GetTest",
        documento: `${Date.now()}`,
        sexo: "F",
        fecha_nacimiento: "2024-01-15",
        edad_gestacional_sem: 38,
        peso_nacimiento_g: 3000,
        nombre_acudiente: "Padre",
        apellido_acudiente: "GetTest",
        telefono: "3009876543",
        correo: `gettest${Date.now()}@test.com`,
        medico_id: 1
      };

      const createRes = await request(app)
        .post("/api/neonatos")
        .send(nuevoNeonato);

      const neonatoId = createRes.body.id;

      // Obtener el neonato
      const res = await request(app).get(`/api/neonatos/${neonatoId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("id", neonatoId);
      expect(res.body).toHaveProperty("nombre_acudiente");
      expect(res.body).toHaveProperty("telefono");
      expect(res.body).toHaveProperty("correo");
    });

    it("Debe devolver 404 para un neonato inexistente", async () => {
      const res = await request(app).get("/api/neonatos/99999");
      
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty("message");
    });
  });

  describe("POST /api/neonatos/:id", () => {
    it("Debe actualizar peso y perímetro cefálico del neonato", async () => {
      // Crear un neonato
      const nuevoNeonato = {
        nombre: "Bebé",
        apellido: "UpdateTest",
        documento: `${Date.now()}`,
        peso_nacimiento_g: 3000,
        nombre_acudiente: "Acudiente",
        apellido_acudiente: "UpdateTest",
        telefono: "3001111111",
        correo: `update${Date.now()}@test.com`,
        medico_id: 1
      };

      const createRes = await request(app)
        .post("/api/neonatos")
        .send(nuevoNeonato);

      const neonatoId = createRes.body.id;

      // Actualizar datos
      const actualizacion = {
        peso_actual_g: 3500,
        perimetro_cefalico: 36.0
      };

      const res = await request(app)
        .post(`/api/neonatos/${neonatoId}`)
        .send(actualizacion);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("message");
    });

    it("Debe rechazar peso inválido", async () => {
      const res = await request(app)
        .post("/api/neonatos/1")
        .send({ peso_actual_g: -100 });

      expect(res.statusCode).toBe(400);
    });

    it("Debe rechazar perímetro cefálico inválido", async () => {
      const res = await request(app)
        .post("/api/neonatos/1")
        .send({ perimetro_cefalico: 150 });

      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST /api/acudientes/:neonatoId", () => {
    it("Debe actualizar datos del acudiente", async () => {
      // Crear un neonato con acudiente
      const nuevoNeonato = {
        nombre: "Bebé",
        apellido: "AcudienteTest",
        documento: `${Date.now()}`,
        nombre_acudiente: "Acudiente",
        apellido_acudiente: "Original",
        telefono: "3002222222",
        correo: `acudiente${Date.now()}@test.com`,
        medico_id: 1
      };

      const createRes = await request(app)
        .post("/api/neonatos")
        .send(nuevoNeonato);

      const neonatoId = createRes.body.id;

      // Actualizar acudiente
      const actualizacion = {
        telefono: "3009999999",
        correo: "nuevo@test.com"
      };

      const res = await request(app)
        .post(`/api/acudientes/${neonatoId}`)
        .send(actualizacion);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("message");
    });

    it("Debe rechazar teléfono inválido", async () => {
      const res = await request(app)
        .post("/api/acudientes/1")
        .send({ telefono: "teléfono-inválido@@@" });

      expect(res.statusCode).toBe(400);
    });

    it("Debe rechazar correo inválido", async () => {
      const res = await request(app)
        .post("/api/acudientes/1")
        .send({ correo: "correo-invalido" });

      expect(res.statusCode).toBe(400);
    });
  });
});