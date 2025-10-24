// src/controllers/ecografia.controller.js
import * as svc from '../services/ecografia.service.js';
import { getPublicPath } from '../services/file.service.js';

/**
 * Clasifica errores provenientes del service para responder 400 vs 500.
 * Cualquier mensaje de validación conocido retorna 400.
 */
function toHttpError(err) {
  const msg = (err?.message || '').toLowerCase();
  const isValidation =
    msg.includes('requerid') ||      // "requerido"
    msg.includes('debe ser num') ||  // "debe ser numérico"
    msg.includes('archivo') ||       // "Archivo requerido"
    msg.includes('inválid') ||       // "inválida/o"
    msg.includes('no válido');

  return {
    status: isValidation ? 400 : 500,
    body: { error: isValidation ? err.message : 'Error interno del servidor' },
    debug: !isValidation, // para log interno
  };
}

/**
 * POST /api/ecografias
 * Body (multipart/form-data):
 *  - file (campo del archivo) ✅
 *  - neonato_id (number)      ✅
 *  - uploader_medico_id (number) ⭕ Si no viene, se toma de req.user.id
 *  - sede_id (number)         ⭕ opcional
 *  - fecha_hora (ISO)         ⭕ opcional
 */
export async function postUpload(req, res) {
  try {
    const { neonato_id, sede_id, fecha_hora, uploader_medico_id: uploaderFromBody } = req.body || {};
    const file = req.file;

    // authRequired debería poblar req.user; usamos fallback al body por si acaso
    const uploader_medico_id = req.user?.id ?? uploaderFromBody;

    const created = await svc.createEcografia({
      neonato_id,
      sede_id,
      uploader_medico_id,
      file,
      fecha_hora,
    });

    // Construye URL pública del archivo (si corresponde)
    let file_url = null;
    try {
      const publicPath = getPublicPath(created.filepath);
      // encodeURI por seguridad en rutas con espacios
      file_url = `/files/${encodeURI(publicPath)}`;
    } catch {
      // Si falla el cálculo de ruta pública, no rompemos la respuesta
      file_url = null;
    }

    return res.status(201).json({ ...created, file_url });
  } catch (err) {
    const http = toHttpError(err);
    if (http.debug) console.error('[postUpload] error:', err);
    return res.status(http.status).json(http.body);
  }
}

/**
 * GET /api/ecografias/:id
 */
export async function getOne(req, res) {
  try {
    const item = await svc.getById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Ecografía no encontrada' });
    return res.json(item);
  } catch (err) {
    const http = toHttpError(err);
    if (http.debug) console.error('[getOne] error:', err);
    return res.status(http.status).json(http.body);
  }
}

/**
 * GET /api/ecografias?neonato_id=&page=&size=
 */
export async function list(req, res) {
  try {
    const { neonato_id } = req.query;

    // Sanitiza paginación
    const pageRaw = Number(req.query.page ?? 1);
    const sizeRaw = Number(req.query.size ?? 10);
    const page = Number.isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;
    const size = Number.isNaN(sizeRaw) || sizeRaw < 1 ? 10 : Math.min(sizeRaw, 100); // límite superior

    // Llamamos al service
    const data = await svc.list({ neonato_id, page, size });
    // data se espera tipo:
    // {
    //   items: [
    //     {
    //       id,
    //       neonato_id,
    //       uploader_medico_id,
    //       sede_id,
    //       fecha_hora,
    //       filepath,
    //       mime_type,
    //       size_bytes,
    //       thumbnail_path,
    //       dicom_metadata
    //     },
    //     ...
    //   ],
    //   total,
    //   page,
    //   size
    // }

    // Enriquecemos cada item con file_url calculable vía nginx /files/
    const enrichedItems = (data.items || []).map(item => {
      let file_url = null;
      try {
        const publicPath = getPublicPath(item.filepath);
        file_url = `/files/${encodeURI(publicPath)}`;
      } catch {
        file_url = null;
      }

      return {
        id: item.id,
        neonato_id: item.neonato_id,
        uploader_medico_id: item.uploader_medico_id,
        sede_id: item.sede_id,
        fecha_hora: item.fecha_hora,
        size_bytes: item.size_bytes,
        mime_type: item.mime_type,
        file_url,           // <- lo importante para el front
      };
    });

    return res.json({
      items: enrichedItems,
      total: data.total ?? enrichedItems.length,
      page: data.page ?? page,
      size: data.size ?? size,
    });
  } catch (err) {
    const http = toHttpError(err);
    if (http.debug) console.error('[list] error:', err);
    return res.status(http.status).json(http.body);
  }
}
