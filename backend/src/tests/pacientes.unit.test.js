import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock de pool ANTES de importar
const mockQuery = jest.fn();
const mockGetConnection = jest.fn();
const mockConnection = {
  query: jest.fn(),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn()
};

const mockPool = {
  query: mockQuery,
  getConnection: mockGetConnection
};

// Mockear el módulo db.js
jest.unstable_mockModule('../db.js', () => ({
  default: mockPool
}));

// Mock de funciones de encriptación
const mockEncrypt = jest.fn((text) => `encrypted_${text}`);
const mockDecrypt = jest.fn((text) => text.replace('encrypted_', ''));

jest.unstable_mockModule('../utils/encryption.js', () => ({
  encrypt: mockEncrypt,
  decrypt: mockDecrypt
}));

// Importar después de mockear
const { default: pacientesRoutes } = await import('../routes/pacientes.routes.js');

const app = express();
app.use(express.json());
app.use('/api', pacientesRoutes);

describe('Pruebas Unitarias - Pacientes Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Configurar el mock de getConnection por defecto
    mockGetConnection.mockResolvedValue(mockConnection);
  });

  // Silenciar console.error en las pruebas
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    console.error.mockRestore();
  });

  describe('GET /api/neonatos', () => {
    it('Debe devolver lista de neonatos sin filtros', async () => {
      const mockNeonatos = [
        {
          id: 1,
          nombre: 'Juan',
          apellido: 'Pérez',
          sexo: 'M',
          documento: 'encrypted_123456789',
          fecha_nacimiento: '2024-01-15',
          edad_gestacional_sem: 38,
          edad_corregida_sem: 2,
          peso_nacimiento_g: 3000,
          peso_actual_g: 3200,
          perimetro_cefalico: 34.5
        }
      ];

      mockQuery.mockResolvedValueOnce([mockNeonatos]);

      const res = await request(app).get('/api/neonatos');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('documento', '123456789');
      expect(mockDecrypt).toHaveBeenCalled();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, nombre, apellido'),
        []
      );
    });

    it('Debe filtrar neonatos por nombre', async () => {
      const mockNeonatos = [
        { id: 1, nombre: 'Juan', apellido: 'Pérez', documento: 'encrypted_123' }
      ];

      mockQuery.mockResolvedValueOnce([mockNeonatos]);

      const res = await request(app).get('/api/neonatos?nombre=Juan');

      expect(res.statusCode).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND (nombre LIKE ? OR apellido LIKE ?)'),
        ['%Juan%', '%Juan%']
      );
    });

    it('Debe filtrar por peso mínimo y máximo', async () => {
      mockQuery.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/neonatos?peso_min=2500&peso_max=4000');

      expect(res.statusCode).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND peso_nacimiento_g >= ?'),
        expect.arrayContaining([2500, 4000])
      );
    });

    it('Debe filtrar por edad gestacional', async () => {
      mockQuery.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .get('/api/neonatos?edad_gestacional_min=37&edad_gestacional_max=42');

      expect(res.statusCode).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND edad_gestacional_sem >= ?'),
        expect.arrayContaining([37, 42])
      );
    });

    it('Debe filtrar por edad corregida', async () => {
      mockQuery.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .get('/api/neonatos?edad_corregida_min=0&edad_corregida_max=4');

      expect(res.statusCode).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND edad_corregida_sem >= ?'),
        expect.arrayContaining([0, 4])
      );
    });

    it('Debe manejar errores al obtener neonatos', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app).get('/api/neonatos');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('message', 'Error al obtener los neonatos');
    });
  });

  describe('POST /api/neonatos', () => {
    it('Debe crear un neonato y acudiente exitosamente', async () => {
      const nuevoNeonato = {
        nombre: 'María',
        apellido: 'García',
        documento: '987654321',
        sexo: 'F',
        fecha_nacimiento: '2024-02-01',
        edad_gestacional_sem: 40,
        edad_corregida_sem: 1,
        peso_nacimiento_g: 3500,
        peso_actual_g: 3600,
        perimetro_cefalico: 35,
        nombre_acudiente: 'Ana',
        apellido_acudiente: 'García',
        sexo_acudiente: 'F',
        parentesco: 'Madre',
        telefono: '3001234567',
        correo: 'ana@test.com',
        medico_id: 5
      };

      mockConnection.query
        .mockResolvedValueOnce([{ insertId: 10 }]) // INSERT neonato
        .mockResolvedValueOnce([{}]); // INSERT acudiente

      const res = await request(app)
        .post('/api/neonatos')
        .send(nuevoNeonato);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id', 10);
      expect(res.body).toHaveProperty('nombre', 'María');
      expect(res.body).toHaveProperty('acudiente');
      expect(res.body.acudiente).toHaveProperty('nombre', 'Ana');
      
      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
      expect(mockEncrypt).toHaveBeenCalledWith('987654321');
      expect(mockEncrypt).toHaveBeenCalledWith('3001234567');
      expect(mockEncrypt).toHaveBeenCalledWith('ana@test.com');
    });

    it('Debe validar campos obligatorios del neonato', async () => {
      const neonatoIncompleto = {
        nombre: 'Juan'
      };

      const res = await request(app)
        .post('/api/neonatos')
        .send(neonatoIncompleto);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(mockConnection.beginTransaction).not.toHaveBeenCalled();
    });

    it('Debe validar campos obligatorios del acudiente', async () => {
      const datosIncompletos = {
        nombre: 'María',
        apellido: 'García',
        documento: '123456',
        nombre_acudiente: 'Ana',
        apellido_acudiente: 'García',
        medico_id: 5
        // Faltan telefono y correo
      };

      const res = await request(app)
        .post('/api/neonatos')
        .send(datosIncompletos);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    it('Debe hacer rollback si falla la creación', async () => {
      const nuevoNeonato = {
        nombre: 'Test',
        apellido: 'Error',
        documento: '111111',
        nombre_acudiente: 'Test',
        apellido_acudiente: 'Acudiente',
        telefono: '3001111111',
        correo: 'test@test.com',
        medico_id: 5
      };

      mockConnection.query.mockRejectedValueOnce(new Error('Insert failed'));

      const res = await request(app)
        .post('/api/neonatos')
        .send(nuevoNeonato);

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('message', 'Error al crear neonato y acudiente');
      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('Debe crear neonato solo con campos obligatorios', async () => {
      const neonatoMinimo = {
        nombre: 'Pedro',
        apellido: 'López',
        documento: '555555',
        nombre_acudiente: 'Carmen',
        apellido_acudiente: 'López',
        telefono: '3005555555',
        correo: 'carmen@test.com',
        medico_id: 3
      };

      mockConnection.query
        .mockResolvedValueOnce([{ insertId: 20 }])
        .mockResolvedValueOnce([{}]);

      const res = await request(app)
        .post('/api/neonatos')
        .send(neonatoMinimo);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id', 20);
      expect(mockConnection.commit).toHaveBeenCalled();
    });
  });

  describe('GET /api/neonatos/:id', () => {
    it('Debe obtener un neonato por ID con datos del acudiente', async () => {
      const mockNeonato = {
        id: 5,
        nombre: 'Carlos',
        apellido: 'Martínez',
        documento: 'encrypted_12345',
        sexo: 'M',
        edad_gestacional_sem: 39,
        nombre_acudiente: 'Laura',
        apellido_acudiente: 'Martínez',
        parentesco: 'Madre',
        telefono: 'encrypted_3001111111',
        correo: 'encrypted_laura@test.com'
      };

      mockQuery.mockResolvedValueOnce([[mockNeonato]]);

      const res = await request(app).get('/api/neonatos/5');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id', 5);
      expect(res.body).toHaveProperty('documento', '12345');
      expect(res.body).toHaveProperty('telefono', '3001111111');
      expect(res.body).toHaveProperty('correo', 'laura@test.com');
      expect(mockDecrypt).toHaveBeenCalledTimes(3);
    });

    it('Debe retornar 404 si el neonato no existe', async () => {
      mockQuery.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/neonatos/999');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'Neonato no encontrado');
    });

    it('Debe manejar errores al obtener neonato por ID', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query error'));

      const res = await request(app).get('/api/neonatos/5');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('message', 'Error al obtener neonato');
    });
  });

  describe('POST /api/neonatos/:id', () => {
    it('Debe actualizar peso actual del neonato', async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/neonatos/5')
        .send({ peso_actual_g: 3800 });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Neonato actualizado correctamente');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE neonato SET peso_actual_g = ?'),
        [3800, '5']
      );
    });

    it('Debe actualizar perímetro cefálico del neonato', async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/neonatos/5')
        .send({ perimetro_cefalico: 36.5 });

      expect(res.statusCode).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE neonato SET perimetro_cefalico = ?'),
        [36.5, '5']
      );
    });

    it('Debe actualizar ambos campos simultáneamente', async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/neonatos/5')
        .send({ peso_actual_g: 4000, perimetro_cefalico: 37 });

      expect(res.statusCode).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('peso_actual_g = ?, perimetro_cefalico = ?'),
        [4000, 37, '5']
      );
    });

    it('Debe validar peso actual inválido (negativo)', async () => {
      const res = await request(app)
        .post('/api/neonatos/5')
        .send({ peso_actual_g: -100 });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Peso actual inválido');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('Debe validar peso actual inválido (muy alto)', async () => {
      const res = await request(app)
        .post('/api/neonatos/5')
        .send({ peso_actual_g: 15000 });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Peso actual inválido');
    });

    it('Debe validar perímetro cefálico inválido (negativo)', async () => {
      const res = await request(app)
        .post('/api/neonatos/5')
        .send({ perimetro_cefalico: -5 });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Perímetro cefálico inválido');
    });

    it('Debe validar perímetro cefálico inválido (muy alto)', async () => {
      const res = await request(app)
        .post('/api/neonatos/5')
        .send({ perimetro_cefalico: 150 });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Perímetro cefálico inválido');
    });

    it('Debe rechazar actualización sin campos', async () => {
      const res = await request(app)
        .post('/api/neonatos/5')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'No hay campos para actualizar');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('Debe retornar 404 si el neonato no existe', async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const res = await request(app)
        .post('/api/neonatos/999')
        .send({ peso_actual_g: 3500 });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'Neonato no encontrado');
    });

    it('Debe manejar errores al actualizar neonato', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Update failed'));

      const res = await request(app)
        .post('/api/neonatos/5')
        .send({ peso_actual_g: 3500 });

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('message', 'Error al actualizar neonato');
    });
  });

  describe('POST /api/acudientes/:neonatoId', () => {
    it('Debe actualizar teléfono del acudiente', async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/acudientes/5')
        .send({ telefono: '3009999999' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Acudiente actualizado correctamente');
      expect(mockEncrypt).toHaveBeenCalledWith('3009999999');
    });

    it('Debe actualizar correo del acudiente', async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/acudientes/5')
        .send({ correo: 'nuevo@test.com' });

      expect(res.statusCode).toBe(200);
      expect(mockEncrypt).toHaveBeenCalledWith('nuevo@test.com');
    });

    it('Debe actualizar ambos campos del acudiente', async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/acudientes/5')
        .send({ telefono: '3001111111', correo: 'updated@test.com' });

      expect(res.statusCode).toBe(200);
      expect(mockEncrypt).toHaveBeenCalledTimes(2);
    });

    it('Debe validar formato de teléfono inválido', async () => {
      const res = await request(app)
        .post('/api/acudientes/5')
        .send({ telefono: 'abc123xyz' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Teléfono inválido');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('Debe validar formato de correo inválido', async () => {
      const res = await request(app)
        .post('/api/acudientes/5')
        .send({ correo: 'correo-invalido' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Correo electrónico inválido');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('Debe rechazar actualización sin campos', async () => {
      const res = await request(app)
        .post('/api/acudientes/5')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'No hay campos para actualizar');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('Debe retornar 404 si el acudiente no existe', async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const res = await request(app)
        .post('/api/acudientes/999')
        .send({ telefono: '3001234567' });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'Acudiente no encontrado');
    });

    it('Debe manejar errores al actualizar acudiente', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Update failed'));

      const res = await request(app)
        .post('/api/acudientes/5')
        .send({ telefono: '3001234567' });

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('message', 'Error al actualizar acudiente');
    });
  });
});