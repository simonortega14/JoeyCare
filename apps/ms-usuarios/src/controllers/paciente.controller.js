// src/controllers/paciente.controller.js
import * as svc from '../services/paciente.service.js';

// GET /api/usuarios/neonatos
export async function listNeonatos(req, res, next) {
  try {
    const page = Number(req.query.page ?? 1);
    const size = Number(req.query.size ?? 1000); // traemos muchos para autocompletado
    const q = (req.query.q ?? '').trim() || null;

    // Ya no mandamos tipo ni nada raro. Esto ahora trae solo neonatos.
    const data = await svc.listPacientes({ page, size, q });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// GET /api/usuarios/pacientes (si lo sigues usando en otro lado del front)
export async function listPacientes(req, res, next) {
  try {
    const page = Number(req.query.page ?? 1);
    const size = Number(req.query.size ?? 10);
    const q = (req.query.q ?? '').trim() || null;

    const data = await svc.listPacientes({ page, size, q });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// GET /api/usuarios/pacientes/:id  (esto ahora devuelve un neonato por id)
export async function getPaciente(req, res, next) {
  try {
    const id = Number(req.params.id);
    const item = await svc.getPacienteById(id);

    if (!item) {
      return res.status(404).json({ message: 'Neonato no encontrado' });
    }

    res.json(item);
  } catch (err) {
    next(err);
  }
}
