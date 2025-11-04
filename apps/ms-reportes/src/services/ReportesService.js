import fs from 'fs';
import { ReportesRepo } from '../repositories/ReportesRepo.js';
import { env } from '../config/env.js';

export class ReportesService {
  static async crearAnotacion({ ecografia_id, neonato_id, medico_id, diagnostico, medidas, file }) {
    // 1) Insert base
    const id = await ReportesRepo.createAnotacion({
      ecografia_id: Number(ecografia_id),
      neonato_id: Number(neonato_id),
      medico_id: Number(medico_id),
      diagnostico,
      medidas
    });

    // 2) Si hay imagen, adjuntar
    let imagen_filename = null;
    if (file) {
      imagen_filename = await ReportesRepo.attachImagen({
        id,
        tmpPath: file.path,
        finalName: 'annotated.png'
      });
    } else {
      // si no se adjunta imagen, borrar tmp si existiera
      try { if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch {}
    }

    // 3) (Opcional) Sincronizar con `informes` como borrador
    if (env.upsertInforme) {
      await ReportesRepo.upsertInformeBorrador({
        ecografia_id: Number(ecografia_id),
        medico_id: Number(medico_id),
        hallazgos: diagnostico ?? ''
      });
    }

    // 4) Resultado
    const row = await ReportesRepo.getById(id);
    return ReportesRepo.rowWithUrl(row);
  }

  static async obtenerAnotacion(id) {
    const row = await ReportesRepo.getById(Number(id));
    if (!row) return null;
    return ReportesRepo.rowWithUrl(row);
  }

  static async listarPorNeonato(neonato_id, limit) {
    return ReportesRepo.listByNeonato(Number(neonato_id), Number(limit || 100));
  }

  static async listarPorEcografia(ecografia_id, limit) {
    return ReportesRepo.listByEcografia(Number(ecografia_id), Number(limit || 100));
  }

  static async actualizarAnotacion(id, { diagnostico, medidas }) {
    await ReportesRepo.update(Number(id), { diagnostico, medidas });
    const row = await ReportesRepo.getById(Number(id));
    return ReportesRepo.rowWithUrl(row);
  }

  static async metricsByMedico({ from, to }) {
    return ReportesRepo.metricsByMedico({ from, to });
  }
}
