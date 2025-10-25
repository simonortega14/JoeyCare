import { Router } from "express";
import { getAnnotations, postAnnotations } from "../controllers/analysis.controller.js";
import { auth } from "../middlewares/auth.js";

const router = Router();

// GET /api/visualizador/analysis/anotaciones?ecografiaId=123
router.get("/anotaciones", auth, getAnnotations);

// POST /api/visualizador/analysis/anotaciones
// body: { ecografiaId: "123", anotaciones: [ {tipo:"punto", payload:{...}}, ... ] }
router.post("/anotaciones", auth, postAnnotations);

export default router;
