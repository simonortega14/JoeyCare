import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/ping", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    res.json({ message: "Conexión exitosa", result: rows[0].result });
  } catch (err) {
    res.status(500).json({ error: "Error en la conexión", details: err.message });
  }
});

export default router;
