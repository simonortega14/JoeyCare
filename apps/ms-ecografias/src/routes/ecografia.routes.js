import { Router } from 'express';
import { authRequired } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import { postUpload, list, getOne } from '../controllers/ecografia.controller.js';

const router = Router();

// Subir ecografía (multipart/form-data)
// Campos: neonato_id (req), sede_id (opcional), fecha_hora (ISO opcional)
// Archivo: campo "file"
router.post('/', authRequired, upload.single('file'), postUpload);

// Listar ecografías (opcionalmente filtrar por neonato_id)
router.get('/', authRequired, list);

// Obtener ecografía por ID
router.get('/:id', authRequired, getOne);

export default router;
