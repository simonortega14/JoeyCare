import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ReportesController } from '../controllers/ReportesController.js';
import { upload } from '../lib/multer.js';

export const router = Router();

// Salud
router.get('/health', ReportesController.health);

// Protegidas
router.use(requireAuth);

// Crear anotación (imagen+medidas+diagnóstico)
router.post('/', upload.single('imagen'), ReportesController.crear);

// Detalle por id de anotación
router.get('/:id', ReportesController.detalle);

// Listar por neonato/ecografía
router.get('/by/neonato/:neonatoId', ReportesController.listarPorNeonato);
router.get('/by/ecografia/:ecografiaId', ReportesController.listarPorEcografia);

// Actualizar diagnóstico/medidas de una anotación
router.put('/:id', ReportesController.actualizar);

// Descargar/servir imagen
router.get('/files/:id/:filename', ReportesController.file);

// Métricas por médico
router.get('/metrics/by-medico', ReportesController.metricsByMedico);
