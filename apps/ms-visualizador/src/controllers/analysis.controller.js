import { saveAnnotations, listAnnotations } from "../services/analysis.service.js";

export async function getAnnotations(req, res) {
  const { ecografiaId } = req.query;
  if (!ecografiaId) {
    return res.status(400).json({ error: "ecografiaId es requerido" });
  }

  const data = listAnnotations({ ecografiaId });
  return res.json(data);
}

export async function postAnnotations(req, res) {
  const { ecografiaId, anotaciones } = req.body;

  if (!ecografiaId || !Array.isArray(anotaciones)) {
    return res.status(400).json({
      error: "Se requiere ecografiaId y anotaciones[]"
    });
  }

  const saved = saveAnnotations({
    ecografiaId,
    anotaciones,
    userId: req.user?.id || "desconocido",
  });

  return res.status(201).json({
    ok: true,
    saved
  });
}
