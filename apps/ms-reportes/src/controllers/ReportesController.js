import path from 'path';
import fs from 'fs';
import mime from 'mime';
import { env } from '../config/env.js';
import { ReportesService } from '../services/ReportesService.js';
import { reportFilePath } from '../lib/storage.js';

export class ReportesController {
  static health(_req, res) {
    res.json({ ok: true, service: 'ms-reportes', env: env.nodeEnv });
  }

  static async crear(req, res) {
    try {
      const { neonato_id, ecografia_id, diagnostico } = req.body;
      const medidas = req.body?.medidas ? JSON.parse(req.body.medidas) : null;
      if (!neonato_id || !ecografia_id) {
        return res.status(400).json({ error: 'neonato_id y ecografia_id son requeridos' });
      }
      const medico_id = req.user.medico_id;

      const report = await ReportesService.crearAnotacion({
        neonato_id, ecografia_id, diagnostico, medidas, medico_id, file: req.file
      });

      return res.status(201).json({
        id: report.id,
        imagen_url: report.imagen_url
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error creando anotación' });
    }
  }

  static async detalle(req, res) {
    try {
      const r = await ReportesService.obtenerAnotacion(req.params.id);
      if (!r) return res.status(404).json({ error: 'No encontrado' });
      return res.json(r);
    } catch {
      return res.status(500).json({ error: 'Error obteniendo reporte' });
    }
  }

  static async listarPorNeonato(req, res) {
    try {
      const data = await ReportesService.listarPorNeonato(req.params.neonatoId, req.query.limit);
      return res.json(data);
    } catch {
      return res.status(500).json({ error: 'Error listando por neonato' });
    }
  }

  static async listarPorEcografia(req, res) {
    try {
      const data = await ReportesService.listarPorEcografia(req.params.ecografiaId, req.query.limit);
      return res.json(data);
    } catch {
      return res.status(500).json({ error: 'Error listando por ecografía' });
    }
  }

  static async actualizar(req, res) {
    try {
      const { diagnostico, medidas } = req.body || {};
      const r = await ReportesService.actualizarAnotacion(req.params.id, {
        diagnostico,
        medidas
      });
      return res.json(r);
    } catch {
      return res.status(500).json({ error: 'Error actualizando' });
    }
  }

  static async file(req, res) {
    const { id, filename } = req.params;
    const abs = reportFilePath(id, filename);
    if (!fs.existsSync(abs)) return res.status(404).end();
    res.setHeader('Content-Type', mime.getType(path.extname(abs)) || 'application/octet-stream');
    fs.createReadStream(abs).pipe(res);
  }

  static async metricsByMedico(req, res) {
    try {
      const { from, to } = req.query;
      const rows = await ReportesService.metricsByMedico({ from, to });
      return res.json(rows);
    } catch {
      return res.status(500).json({ error: 'Error métricas por médico' });
    }
  }
}
