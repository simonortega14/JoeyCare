import { Router } from "express";
import { authRequired } from "../middlewares/auth.js";
import {
  listEcografiasByNeonato,
  getEcografiaPublic,
} from "../controllers/visor.controller.js";

const router = Router();

// GET /api/visor/neonatos/:neonatoId/ecografias
router.get(
  "/neonatos/:neonatoId/ecografias",
  authRequired,
  listEcografiasByNeonato
);

// GET /api/visor/ecografias/:ecoId
router.get(
  "/ecografias/:ecoId",
  authRequired,
  getEcografiaPublic
);

export default router;
