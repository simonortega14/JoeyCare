import { Router } from 'express';
import { authRequired } from '../middlewares/auth.js';
import { getPaciente, listPacientes } from '../controllers/paciente.controller.js';

const router = Router();

// GET /api/pacientes/:id
router.get('/:id', authRequired, getPaciente);

// GET /api/pacientes?page=1&size=10&q=
router.get('/', authRequired, listPacientes);

export default router;
