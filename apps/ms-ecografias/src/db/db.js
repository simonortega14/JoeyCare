const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "mysql",
  port: process.env.DB_PORT || "3306",
  user: process.env.DB_USER || "userapp",
  password: process.env.DB_PASSWORD || "secret123",
  database: process.env.DB_NAME || "joeycare_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
