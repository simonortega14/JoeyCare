// src/models/neonato.model.js

export function mapNeonato(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    documento: row.documento,
    sexo: row.sexo,
    fecha_nacimiento: row.fecha_nacimiento,
    edad_gestacional_sem: row.edad_gestacional_sem,
    edad_corregida_sem: row.edad_corregida_sem,
    peso_nacimiento_g: row.peso_nacimiento_g,
    peso_actual_g: row.peso_actual_g,
    perimetro_cefalico: row.perimetro_cefalico,
    creado_en: row.creado_en,
    actualizado_en: row.actualizado_en,
  };
}
