import { v4 as uuid } from "uuid";

const anotacionesMem = []; 
// Estructura que vamos a guardar:
// {
//   id: "...uuid...",
//   ecografiaId: "123",
//   tipo: "punto" | "trazo",
//   payload: { ...lo que generaste en ImageViewer },
//   userId: "demo-user",
//   createdAt: "2025-10-25T15:30:00Z"
// }

export function saveAnnotations({ ecografiaId, anotaciones, userId }) {
  const now = new Date().toISOString();

  const rows = anotaciones.map(a => ({
    id: uuid(),
    ecografiaId,
    tipo: a.tipo,
    payload: a.payload,
    userId,
    createdAt: now,
  }));

  anotacionesMem.push(...rows);
  return rows;
}

export function listAnnotations({ ecografiaId }) {
  return anotacionesMem.filter(a => a.ecografiaId === ecografiaId);
}
