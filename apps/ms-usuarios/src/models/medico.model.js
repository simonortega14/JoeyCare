export function mapMedico(row) {
  return {
    id: row.id,
    rol_id: row.rol_id,
    especialidad_id: row.especialidad_id,
    sede_id: row.sede_id,
    nombre: row.nombre,
    apellido: row.apellido,
    email: row.email,
    hash_password: row.hash_password,   
    activo: row.activo === undefined ? true : !!row.activo,
    creado_en: row.creado_en,
    actualizado_en: row.actualizado_en
  };
}