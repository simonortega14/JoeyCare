export function auth(req, res, next) {
  // Básico: leemos el header Authorization
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: "No autorizado" });
  }

  // TODO: validar JWT real (ms-usuarios / misma secret)
  // Por ahora lo dejamos pasar para no trabar desarrollo
  req.user = { id: "demo-user", role: "medico" };
  next();
}
