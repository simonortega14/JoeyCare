import { listEcografias, getEcografiaById } from "../repositories/ecografia.repository.js";
import { getPublicPath } from "../services/file.service.js";

// GET /api/visor/neonatos/:neonatoId/ecografias
export async function listEcografiasByNeonato(req, res) {
  try {
    const neonatoId = req.params.neonatoId;

    // traemos muchas (page=1,size=100 fijo)
    const { items } = await listEcografias({
      neonato_id: neonatoId,
      page: 1,
      size: 100,
    });

    // armamos respuesta resumida
    const ecosMin = items.map((item) => {
      let file_url = null;
      try {
        const publicPath = getPublicPath(item.filepath);
        file_url = `/files/${encodeURI(publicPath)}`;
      } catch {
        file_url = null;
      }

      return {
        id: item.id,
        fecha_hora: item.fecha_hora,
        file_url,
      };
    });

    return res.json(ecosMin);
  } catch (err) {
    console.error("[listEcografiasByNeonato] error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
}

// GET /api/visor/ecografias/:ecoId
export async function getEcografiaPublic(req, res) {
  try {
    const ecoId = req.params.ecoId;
    const item = await getEcografiaById(ecoId);

    if (!item) {
      return res.status(404).json({ error: "not_found" });
    }

    let file_url = null;
    try {
      const publicPath = getPublicPath(item.filepath);
      file_url = `/files/${encodeURI(publicPath)}`;
    } catch {
      file_url = null;
    }

    return res.json({
      id: item.id,
      neonato_id: item.neonato_id,
      fecha_hora: item.fecha_hora,
      mime_type: item.mime_type,
      size_bytes: item.size_bytes,
      file_url,
    });
  } catch (err) {
    console.error("[getEcografiaPublic] error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
}
