export function mapMedico(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    email: row.email,
    rol_id: row.rol_id,
    especialidad_id: row.especialidad_id,
    sede_id: row.sede_id,
    activo: !!row.activo
  };
}
