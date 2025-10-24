import { Router } from 'express';
import { authRequired } from '../middlewares/auth.js';
import { getMe, getMisPacientes } from '../controllers/usuario.controller.js';

const router = Router();

// GET /api/usuarios/me
router.get('/me', authRequired, getMe);

// GET /api/usuarios/me/pacientes?page=1&size=10&q=
router.get('/me/pacientes', authRequired, getMisPacientes);

export default router;
