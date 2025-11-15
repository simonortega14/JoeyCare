import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock de pool ANTES de importar
const mockQuery = jest.fn();
const mockPool = {
  query: mockQuery
};

// Mockear el módulo db.js
jest.unstable_mockModule('../db.js', () => ({
  default: mockPool
}));

// Mock completo de multer con diskStorage
jest.unstable_mockModule('multer', () => {
  const mockDiskStorage = jest.fn(() => ({}));
  const mockMulter = jest.fn(() => ({
    single: jest.fn(() => (req, res, next) => {
      req.file = { filename: 'test-photo.jpg' };
      next();
    })
  }));
  mockMulter.diskStorage = mockDiskStorage;
  
  return {
    default: mockMulter
  };
});

// Mock de path
jest.unstable_mockModule('path', () => ({
  default: {
    extname: jest.fn(() => '.jpg')
  }
}));

// Importar después de mockear
const { default: doctoresRoutes } = await import('../routes/doctores.routes.js');

const app = express();
app.use(express.json());
app.use('/api', doctoresRoutes);

describe('Pruebas Unitarias - Doctores Routes (Simple)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Silenciar console.error en las pruebas
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    console.error.mockRestore();
  });

  describe('GET /api/sedes', () => {
    it('Debe devolver lista de sedes exitosamente', async () => {
      const mockSedes = [
        { id: 1, nombre: 'Sede Central', ciudad: 'Bogotá' },
        { id: 2, nombre: 'Sede Norte', ciudad: 'Medellín' }
      ];

      mockQuery.mockResolvedValueOnce([mockSedes]);

      const res = await request(app).get('/api/sedes');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockSedes);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id, nombre, ciudad FROM sedes'
      );
    });

    it('Debe devolver array vacío si no hay sedes', async () => {
      mockQuery.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/sedes');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('Debe manejar errores al obtener sedes', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query failed'));

      const res = await request(app).get('/api/sedes');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('message', 'Error al obtener sedes');
    });
  });

  describe('GET /api/especialidades', () => {
    it('Debe devolver lista de especialidades exitosamente', async () => {
      const mockEspecialidades = [
        { id: 1, nombre: 'Cardiología' },
        { id: 2, nombre: 'Pediatría' },
        { id: 3, nombre: 'Neurología' }
      ];

      mockQuery.mockResolvedValueOnce([mockEspecialidades]);

      const res = await request(app).get('/api/especialidades');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockEspecialidades);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id, nombre FROM especialidades'
      );
    });

    it('Debe devolver array vacío si no hay especialidades', async () => {
      mockQuery.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/especialidades');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('Debe manejar errores al obtener especialidades', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app).get('/api/especialidades');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('message', 'Error al obtener especialidades');
    });
  });

  describe('GET /api/medicos', () => {
    it('Debe devolver lista de médicos exitosamente', async () => {
      const mockMedicos = [
        {
          id: 1,
          nombre: 'Juan',
          apellido: 'Pérez',
          email: 'juan@test.com',
          activo: 1,
          rol: 'Médico',
          especialidad: 'Cardiología',
          sede: 'Sede Central'
        }
      ];

      mockQuery.mockResolvedValueOnce([mockMedicos]);

      const res = await request(app).get('/api/medicos');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toEqual(mockMedicos);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('Debe devolver array vacío si no hay médicos', async () => {
      mockQuery.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/medicos');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('Debe manejar errores de base de datos', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app).get('/api/medicos');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('message', 'Error al obtener los medicos');
    });
  });

  describe('GET /api/medicos/pendientes', () => {
    it('Debe devolver lista de médicos pendientes', async () => {
      const mockPendientes = [
        {
          id: 10,
          nombre: 'Pendiente',
          apellido: 'Uno',
          email: 'pendiente1@test.com',
          rol: 'Médico',
          especialidad: 'Cardiología',
          sede: 'Sede Central'
        },
        {
          id: 11,
          nombre: 'Pendiente',
          apellido: 'Dos',
          email: 'pendiente2@test.com',
          rol: 'Médico',
          especialidad: 'Pediatría',
          sede: 'Sede Norte'
        }
      ];

      mockQuery.mockResolvedValueOnce([mockPendientes]);

      const res = await request(app).get('/api/medicos/pendientes');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockPendientes);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE m.activo = FALSE')
      );
    });

    it('Debe devolver array vacío si no hay pendientes', async () => {
      mockQuery.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/medicos/pendientes');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('Debe manejar errores al obtener pendientes', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query error'));

      const res = await request(app).get('/api/medicos/pendientes');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('message', 'Error al obtener médicos pendientes');
    });
  });

  describe('POST /api/medicos', () => {
    it('Debe crear un médico exitosamente', async () => {
      const nuevoMedico = {
        rol_id: 2,
        especialidad_id: 1,
        sede_id: 1,
        nombre: 'Carlos',
        apellido: 'Rodríguez',
        email: 'carlos@test.com',
        hash_password: 'hashedpass123'
      };

      const mockResult = { insertId: 10 };
      mockQuery.mockResolvedValueOnce([mockResult]);

      const res = await request(app)
        .post('/api/medicos')
        .send(nuevoMedico);

      expect(res.statusCode).toBe(201);
      expect(res.body).toEqual({
        id: 10,
        nombre: 'Carlos',
        apellido: 'Rodríguez',
        email: 'carlos@test.com'
      });
    });

    it('Debe validar campos requeridos', async () => {
      const medicoIncompleto = {
        nombre: 'Juan'
      };

      const res = await request(app)
        .post('/api/medicos')
        .send(medicoIncompleto);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('Debe manejar errores de base de datos al crear', async () => {
      const nuevoMedico = {
        rol_id: 2,
        especialidad_id: 1,
        sede_id: 1,
        nombre: 'Test',
        apellido: 'User',
        email: 'test@test.com',
        hash_password: 'hash123'
      };

      mockQuery.mockRejectedValueOnce(new Error('Insert failed'));

      const res = await request(app)
        .post('/api/medicos')
        .send(nuevoMedico);

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('message', 'Error al crear el medico');
    });
  });

  describe('POST /api/medicos/login', () => {
    it('Debe hacer login exitoso con credenciales correctas', async () => {
      const credentials = {
        email: 'juan@test.com',
        password: 'password123'
      };

      const mockMedico = {
        id: 1,
        nombre: 'Juan',
        apellido: 'Pérez',
        email: 'juan@test.com',
        rol_id: 2,
        rol: 'Médico',
        especialidad: 'Cardiología',
        especialidad_descripcion: 'Especialista del corazón',
        sede: 'Sede Central',
        sede_institucion: 'Hospital Central',
        sede_ciudad: 'Bogotá',
        sede_direccion: 'Calle 1 #2-3',
        foto_perfil: null,
        activo: 1
      };

      mockQuery.mockResolvedValueOnce([[mockMedico]]);

      const res = await request(app)
        .post('/api/medicos/login')
        .send(credentials);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id', 1);
      expect(res.body).toHaveProperty('nombre', 'Juan');
      expect(res.body).toHaveProperty('email', 'juan@test.com');
      expect(res.body).toHaveProperty('rol', 'Médico');
      expect(res.body).toHaveProperty('especialidad', 'Cardiología');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE m.email = ? AND m.hash_password = ? AND m.activo = TRUE'),
        [credentials.email, credentials.password]
      );
    });

    it('Debe rechazar login con credenciales incorrectas', async () => {
      mockQuery.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .post('/api/medicos/login')
        .send({
          email: 'wrong@test.com',
          password: 'wrongpass'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message', 'Credenciales incorrectas');
    });

    it('Debe rechazar login sin email', async () => {
      const res = await request(app)
        .post('/api/medicos/login')
        .send({
          password: 'password123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Email y contraseña son obligatorios');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('Debe rechazar login sin password', async () => {
      const res = await request(app)
        .post('/api/medicos/login')
        .send({
          email: 'test@test.com'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Email y contraseña son obligatorios');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('Debe rechazar login sin email ni password', async () => {
      const res = await request(app)
        .post('/api/medicos/login')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Email y contraseña son obligatorios');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('Debe manejar errores de base de datos en login', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const res = await request(app)
        .post('/api/medicos/login')
        .send({
          email: 'test@test.com',
          password: 'pass123'
        });

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('message', 'Error en el login');
    });
  });

  describe('PUT /api/medicos/:id/aprobar', () => {
    it('Debe aprobar un médico exitosamente', async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app).put('/api/medicos/10/aprobar');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Médico aprobado correctamente');
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE medicos SET activo = TRUE WHERE id = ?',
        ['10']
      );
    });

    it('Debe manejar errores al aprobar', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Update failed'));

      const res = await request(app).put('/api/medicos/10/aprobar');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('message', 'Error al aprobar médico');
    });

    it('Debe aprobar incluso si el ID no existe', async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const res = await request(app).put('/api/medicos/999/aprobar');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Médico aprobado correctamente');
    });
  });

  describe('DELETE /api/medicos/:id', () => {
    it('Debe eliminar un médico exitosamente', async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app).delete('/api/medicos/15');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Solicitud rechazada correctamente');
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM medicos WHERE id = ?',
        ['15']
      );
    });

    it('Debe manejar errores al eliminar', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Delete failed'));

      const res = await request(app).delete('/api/medicos/10');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('message', 'Error al rechazar médico');
    });

    it('Debe eliminar incluso si el ID no existe', async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const res = await request(app).delete('/api/medicos/999');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Solicitud rechazada correctamente');
    });
  });

  describe('PUT /api/medicos/:id/foto', () => {
    it('Debe actualizar foto de perfil exitosamente', async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .put('/api/medicos/5/foto')
        .attach('foto', Buffer.from('fake image content'), 'test.jpg');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Foto de perfil actualizada');
      expect(res.body).toHaveProperty('foto_perfil', 'test-photo.jpg');
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE medicos SET foto_perfil = ? WHERE id = ?',
        ['test-photo.jpg', '5']
      );
    });

    it('Debe manejar errores al actualizar foto', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Update failed'));

      const res = await request(app)
        .put('/api/medicos/5/foto')
        .attach('foto', Buffer.from('fake image'), 'test.jpg');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('message', 'Error al actualizar foto de perfil');
    });

    it('Debe actualizar foto para diferentes IDs de médicos', async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .put('/api/medicos/100/foto')
        .attach('foto', Buffer.from('another fake image'), 'profile.png');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Foto de perfil actualizada');
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE medicos SET foto_perfil = ? WHERE id = ?',
        ['test-photo.jpg', '100']
      );
    });
  });
});