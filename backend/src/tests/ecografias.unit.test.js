import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock de pool
const mockQuery = jest.fn();
const mockPool = { query: mockQuery };

jest.unstable_mockModule('../db.js', () => ({
  default: mockPool
}));

// Mock de funciones de encriptación
const mockEncryptFile = jest.fn();
const mockDecryptFile = jest.fn();

jest.unstable_mockModule('../utils/encryption.js', () => ({
  encryptFile: mockEncryptFile,
  decryptFile: mockDecryptFile
}));

// Mock de fs
const mockFs = {
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn()
};

jest.unstable_mockModule('fs', () => ({
  default: mockFs,
  existsSync: mockFs.existsSync,
  mkdirSync: mockFs.mkdirSync,
  unlinkSync: mockFs.unlinkSync
}));

// Mock de multer
const mockMulter = jest.fn(() => ({
  single: jest.fn(() => (req, res, next) => {
    if (req.body.mockFile) {
      req.file = req.body.mockFile;
    }
    next();
  })
}));
mockMulter.diskStorage = jest.fn();

jest.unstable_mockModule('multer', () => ({
  default: mockMulter
}));

// Importar después de mockear
const { default: ecografiasRoutes } = await import('../routes/ecografias.routes.js');

const app = express();
app.use(express.json());
app.use('/api', ecografiasRoutes);

describe('Pruebas Unitarias - Ecografías Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(true);
  });

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    console.error.mockRestore();
    console.log.mockRestore();
  });

  describe('GET /api/ecografias', () => {
    it('Debe devolver lista de ecografías', async () => {
      const mockEcografias = [{
        id: 1,
        neonato_id: 5,
        filepath: 'eco1.png.enc',
        nombre: 'Juan',
        apellido: 'Pérez'
      }];

      mockQuery.mockResolvedValueOnce([mockEcografias]);

      const res = await request(app).get('/api/ecografias');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('id', 1);
    });

    it('Debe manejar errores', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app).get('/api/ecografias');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('message', 'Error al obtener ecografías');
    });
  });

  describe('GET /api/dashboard/stats', () => {
    it('Debe devolver estadísticas del dashboard', async () => {
      mockQuery
        .mockResolvedValueOnce([[{ count: 150 }]]) // totalStudies
        .mockResolvedValueOnce([[{ count: 45 }]]) // neonatalPatients
        .mockResolvedValueOnce([[{ count: 8 }]]) // todayScans
        .mockResolvedValueOnce([[{ count: 12 }]]) // lowBirthWeight
        .mockResolvedValueOnce([[{ count: 18 }]]) // prematurePatients
        .mockResolvedValueOnce([[{ count: 5 }]]) // pendingReports
        .mockResolvedValueOnce([[{ count: 3 }]]) // signedReportsToday
        .mockResolvedValueOnce([[{ count: 7 }]]) // patientsNeedingFollowup
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/dashboard/stats');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('stats');
      expect(res.body.stats).toHaveProperty('totalStudies', 150);
      expect(res.body).toHaveProperty('weeklyStats');
    });
  });

  describe('POST /api/ecografias/:neonatoId', () => {
    it('Debe subir una ecografía exitosamente', async () => {
      mockQuery
        .mockResolvedValueOnce([[{ id: 5 }]]) // Verificar neonato
        .mockResolvedValueOnce([{ insertId: 10 }]); // Insertar ecografía

      mockEncryptFile.mockResolvedValueOnce();
      mockFs.unlinkSync.mockImplementation(() => {});

      const res = await request(app)
        .post('/api/ecografias/5')
        .send({
          uploader_medico_id: 3,
          mockFile: {
            filename: 'test.png',
            mimetype: 'image/png',
            size: 1024000
          }
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message', 'Ecografía subida correctamente');
      expect(mockEncryptFile).toHaveBeenCalled();
    });

    it('Debe rechazar subida sin archivo', async () => {
      const res = await request(app)
        .post('/api/ecografias/5')
        .send({ uploader_medico_id: 3 });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Se requiere archivo');
    });

    it('Debe rechazar si el neonato no existe', async () => {
      mockQuery.mockResolvedValueOnce([[]]);
      mockFs.unlinkSync.mockImplementation(() => {});

      const res = await request(app)
        .post('/api/ecografias/999')
        .send({
          mockFile: { filename: 'test.png', mimetype: 'image/png', size: 1024 }
        });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'Neonato no encontrado');
    });
  });

  describe('GET /api/neonatos/:id/ecografias', () => {
    it('Debe obtener ecografías de un neonato', async () => {
      const mockEcografias = [
        { id: 1, neonato_id: 5, filepath: 'eco1.png.enc' },
        { id: 2, neonato_id: 5, filepath: 'eco2.png.enc' }
      ];

      mockQuery.mockResolvedValueOnce([mockEcografias]);

      const res = await request(app).get('/api/neonatos/5/ecografias');

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(2);
    });
  });

  describe('GET /api/medicos/:medicoId/kpis', () => {
    it('Debe obtener KPIs de un médico', async () => {
      mockQuery
        .mockResolvedValueOnce([[{ count: 25 }]]) // pacientes
        .mockResolvedValueOnce([[{ count: 80 }]]) // ecografías
        .mockResolvedValueOnce([[{ count: 45 }]]); // reportes

      const res = await request(app).get('/api/medicos/3/kpis');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('pacientesCreados', 25);
      expect(res.body).toHaveProperty('ecografiasSubidas', 80);
      expect(res.body).toHaveProperty('reportesFirmados', 45);
    });
  });

  describe('GET /api/reportes/ecografia/:ecografiaId', () => {
    it('Debe obtener reporte por ecografia_id', async () => {
      const mockReporte = {
        id: 5,
        ecografia_id: 10,
        titulo: 'Reporte',
        contenido: 'Contenido',
        paciente_nombre: 'Juan'
      };

      mockQuery.mockResolvedValueOnce([[mockReporte]]);

      const res = await request(app).get('/api/reportes/ecografia/10');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id', 5);
    });

    it('Debe retornar 404 si no existe reporte', async () => {
      mockQuery.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/reportes/ecografia/999');

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/reportes', () => {
    it('Debe crear un reporte nuevo', async () => {
      const nuevoReporte = {
        ecografia_id: 10,
        contenido: 'Contenido',
        hallazgos: 'Hallazgos',
        conclusion: 'Conclusión',
        recomendaciones: 'Recomendaciones',
        firma_medico: 'Dr. García',
        medico_id: 3
      };

      mockQuery
        .mockResolvedValueOnce([[{ neonato_id: 5 }]]) // Verificar ecografía
        .mockResolvedValueOnce([[]]) // No existe reporte previo
        .mockResolvedValueOnce([[{ nombre: 'Juan', apellido: 'Pérez', filepath: 'eco.png' }]])
        .mockResolvedValueOnce([{ insertId: 15 }])
        .mockResolvedValueOnce([[{ id: 15 }]]);

      const res = await request(app).post('/api/reportes').send(nuevoReporte);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Reporte firmado correctamente');
    });

    it('Debe validar campos requeridos', async () => {
      const res = await request(app)
        .post('/api/reportes')
        .send({ ecografia_id: 10, contenido: 'Solo contenido' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Todos los campos son requeridos');
    });

    it('Debe crear historial al actualizar reporte existente', async () => {
      const reporteExistente = { id: 15, ecografia_id: 10, titulo: 'Original' };

      mockQuery
        .mockResolvedValueOnce([[{ neonato_id: 5 }]])
        .mockResolvedValueOnce([[reporteExistente]]) // Reporte existe
        .mockResolvedValueOnce([[{ max_version: 1 }]]) // Versión actual
        .mockResolvedValueOnce([{}]) // Insertar historial
        .mockResolvedValueOnce([[{ nombre: 'Juan', apellido: 'Pérez', filepath: 'eco.png' }]])
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([[{ id: 15 }]]);

      const res = await request(app)
        .post('/api/reportes')
        .send({
          ecografia_id: 10,
          contenido: 'Actualizado',
          hallazgos: 'Nuevos hallazgos',
          conclusion: 'Nueva conclusión',
          recomendaciones: 'Nuevas recomendaciones',
          firma_medico: 'Dr. García',
          medico_id: 3
        });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('PUT /api/reportes/:id/estado', () => {
    it('Debe actualizar estado del reporte', async () => {
      const reporteExistente = { id: 5, titulo: 'Reporte', estado: 'borrador' };

      mockQuery
        .mockResolvedValueOnce([[reporteExistente]])
        .mockResolvedValueOnce([[{ max_version: 0 }]])
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([{}]);

      const res = await request(app)
        .put('/api/reportes/5/estado')
        .send({ estado: 'firmado', medico_id: 3 });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Estado actualizado correctamente');
    });

    it('Debe validar estado inválido', async () => {
      const res = await request(app)
        .put('/api/reportes/5/estado')
        .send({ estado: 'estado_invalido' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Estado inválido');
    });

    it('Debe retornar 404 si el reporte no existe', async () => {
      mockQuery.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .put('/api/reportes/999/estado')
        .send({ estado: 'firmado' });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/reportes/:reporteId/historial', () => {
    it('Debe obtener historial de versiones', async () => {
      const mockHistorial = [
        { version: 2, medico_nombre: 'Dr. Carlos', medico_apellido: 'García' },
        { version: 1, medico_nombre: 'Dr. Carlos', medico_apellido: 'García' }
      ];

      mockQuery.mockResolvedValueOnce([mockHistorial]);

      const res = await request(app).get('/api/reportes/5/historial');

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0]).toHaveProperty('version', 2);
    });
  });
});