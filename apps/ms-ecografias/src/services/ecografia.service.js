// src/services/ecografia.service.js
import path from 'path';
import { insertEcografia, listEcografias, getEcografiaById } from '../repositories/ecografia.repository.js';

/**
 * Parsea y valida una fecha. Devuelve un Date válido o null.
 */
function parseFecha(fecha_hora) {
  if (!fecha_hora) return null;
  const d = new Date(fecha_hora);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Convierte a número y valida. Lanza error con mensaje claro si no es un número válido.
 */
function toNumOrError(value, fieldName, { required = false } = {}) {
  if (value == null || value === '') {
    if (required) throw new Error(`${fieldName} es requerido`);
    return null;
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`${fieldName} debe ser numérico`);
  }
  return n;
}

/**
 * Crea una ecografía a partir de los datos del formulario multipart.
 * Campos esperados:
 *   - file (req.file)                ✅ requerido
 *   - neonato_id (req.body)          ✅ requerido (numérico)
 *   - uploader_medico_id (req.body)  ✅ requerido (numérico)
 *   - sede_id (req.body)             ⭕ opcional (numérico)
 *   - fecha_hora (req.body)          ⭕ opcional (ISO; cae al now si es inválida)
 */
export async function createEcografia({ neonato_id, sede_id, uploader_medico_id, file, fecha_hora }) {
  // Validaciones mínimas
  if (!file) throw new Error('Archivo requerido');

  const neonatoIdNum = toNumOrError(neonato_id, 'neonato_id', { required: true });
  const uploaderIdNum = toNumOrError(uploader_medico_id, 'uploader_medico_id', { required: true });
  const sedeIdNum = toNumOrError(sede_id, 'sede_id', { required: false });

  // Fecha: usa la que llegue si es válida; si no, usa now
  const tsParsed = parseFecha(fecha_hora);
  const ts = tsParsed ?? new Date();

  // Info del archivo (multer)
  const absPath = path.resolve(file.path);

  const saved = await insertEcografia({
    neonato_id: neonatoIdNum,
    uploader_medico_id: uploaderIdNum,
    sede_id: sedeIdNum,
    fecha_hora: ts,
    filepath: absPath,
    mime_type: file.mimetype || null,
    size_bytes: typeof file.size === 'number' ? file.size : null,
    thumbnail_path: null,
    dicom_metadata: null,
  });

  return saved;
}

export async function getById(id) {
  const idNum = toNumOrError(id, 'id', { required: true });
  return await getEcografiaById(idNum);
}

export async function list({ neonato_id, page, size }) {
  const neonatoIdNum = neonato_id != null && neonato_id !== '' ? toNumOrError(neonato_id, 'neonato_id') : null;
  return await listEcografias({ neonato_id: neonatoIdNum, page, size });
}
