import { insertEcografia, listEcografias, getEcografiaById } from '../repositories/ecografia.repository.js';
import path from 'path';

export async function createEcografia({ neonato_id, sede_id, uploader_medico_id, file, fecha_hora }) {
  if (!file) throw new Error('Archivo requerido');
  if (!neonato_id) throw new Error('neonato_id es requerido');

  const now = new Date();
  const ts = fecha_hora ? new Date(fecha_hora) : now;

  const saved = await insertEcografia({
    neonato_id: Number(neonato_id),
    uploader_medico_id: Number(uploader_medico_id),
    sede_id: sede_id ? Number(sede_id) : null,
    fecha_hora: ts,
    filepath: path.resolve(file.path),
    mime_type: file.mimetype || null,
    size_bytes: file.size || null,
    thumbnail_path: null,
    dicom_metadata: null
  });

  return saved;
}

export async function getById(id) {
  return await getEcografiaById(Number(id));
}

export async function list({ neonato_id, page, size }) {
  return await listEcografias({ neonato_id: neonato_id ? Number(neonato_id) : null, page, size });
}
