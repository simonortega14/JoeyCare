import mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = await mysql.createPool({
  host: env.mysql.host,
  port: env.mysql.port,
  user: env.mysql.user,
  password: env.mysql.password,
  database: env.mysql.database,
  connectionLimit: env.mysql.connLimit,
  namedPlaceholders: true
});
