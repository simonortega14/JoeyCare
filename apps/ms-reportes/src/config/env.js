import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT || 3007),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',

  mysql: {
    host: process.env.MYSQL_HOST || 'mysql',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'root',
    database: process.env.MYSQL_DATABASE || 'joeycare_db',
    connLimit: Number(process.env.MYSQL_CONN_LIMIT || 10)
  },

  storage: process.env.REPORTES_STORAGE || '/app/storage/reportes',
  upsertInforme: process.env.REPORTES_UPSERT_INFORME === '1'
};
