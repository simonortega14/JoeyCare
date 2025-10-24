import { Router } from 'express';
import { postLogin } from '../controllers/auth.controller.js';

const router = Router();

// POST /api/usuarios/auth/login
router.post('/login', postLogin);

export default router;
