// src/routes/paciente.routes.js (o como lo llames en tu proyecto)
import { Router } from 'express';
import {
  listNeonatos,
  listPacientes,
  getPaciente,
} from '../controllers/paciente.controller.js';

const router = Router();

// Lista neonatos específicos (lo que estás llamando desde el front)
router.get('/neonatos', listNeonatos);

// Lista genérica (si la usas en otras pantallas)
router.get('/pacientes', listPacientes);

// Detalle por id
router.get('/pacientes/:id', getPaciente);

export default router;
