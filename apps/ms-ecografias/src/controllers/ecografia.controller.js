import * as svc from '../services/ecografia.service.js';
import { getPublicPath } from '../services/file.service.js';

export async function postUpload(req, res) {
  const { neonato_id, sede_id, fecha_hora } = req.body || {};
  const uploader_medico_id = req.user?.id;
  const file = req.file;

  const created = await svc.createEcografia({
    neonato_id, sede_id, uploader_medico_id, file, fecha_hora
  });

  const publicPath = getPublicPath(created.filepath);
  res.status(201).json({ ...created, file_url: `/files/${publicPath}` });
}

export async function getOne(req, res) {
  const item = await svc.getById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Ecografía no encontrada' });
  res.json(item);
}

export async function list(req, res) {
  const { neonato_id, page = 1, size = 10 } = req.query;
  const data = await svc.list({ neonato_id, page, size });
  res.json(data);
}
