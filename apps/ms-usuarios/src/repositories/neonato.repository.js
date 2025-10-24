// src/repositories/neonato.repository.js
import pool from '../config/db.js';

/**
 * Lista neonatos con paginación y búsqueda opcional.
 *
 * @param {object} opts
 * @param {string|null} opts.q - Texto a buscar (documento / nombre / apellido)
 * @param {number} opts.limit - Máx registros por página
 * @param {number} opts.offset - Desde cuál registro empezar
 */
export async function repoListNeonatos({ q = null, limit = 10, offset = 0 }) {
  const where = [];
  const params = [];

  // Filtro de búsqueda libre (documento, nombre, apellido)
  if (q) {
    where.push(`(
      CAST(documento AS CHAR) LIKE ?
      OR nombre LIKE ?
      OR apellido LIKE ?
    )`);
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // --- Query principal (filas) ---
  const sqlRows = `
    SELECT
      id,
      nombre,
      apellido,
      documento,
      sexo,
      fecha_nacimiento,
      edad_gestacional_sem,
      edad_corregida_sem,
      peso_nacimiento_g,
      peso_actual_g,
      perimetro_cefalico,
      creado_en,
      actualizado_en
    FROM neonato
    ${whereSql}
    ORDER BY id DESC
    LIMIT ? OFFSET ?;
  `;

  const rowsParams = [...params, Number(limit), Number(offset)];
  const [rows] = await pool.query(sqlRows, rowsParams);

  // --- Query de total (para paginación) ---
  const sqlCount = `
    SELECT COUNT(*) AS total
    FROM neonato
    ${whereSql};
  `;
  const [countRows] = await pool.query(sqlCount, params);
  const total = countRows?.[0]?.total ?? 0;

  return {
    rows,
    total,
    limit,
    currentPage: offset / limit + 1,
  };
}

/**
 * Obtiene un neonato por ID
 */
export async function repoGetNeonatoById(id) {
  const sql = `
    SELECT
      id,
      nombre,
      apellido,
      documento,
      sexo,
      fecha_nacimiento,
      edad_gestacional_sem,
      edad_corregida_sem,
      peso_nacimiento_g,
      peso_actual_g,
      perimetro_cefalico,
      creado_en,
      actualizado_en
    FROM neonato
    WHERE id = ?
    LIMIT 1;
  `;

  const [rows] = await pool.query(sql, [id]);
  return rows?.[0] || null;
}
