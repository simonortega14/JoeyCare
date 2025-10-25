import express from "express";
import morgan from "morgan";
import cors from "cors";
import { config } from "./config/index.js";
import analysisRoutes from "./routes/analysis.routes.js";

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));
app.use(cors({
  origin: config.allowOrigin === "*" ? true : config.allowOrigin,
}));

// Health
app.get("/health", (_req, res) => {
  res.json({ ok: true, svc: "ms-visualizador" });
});

// Rutas de análisis/anotaciones
app.use("/api/visualizador/analysis", analysisRoutes);

export default app;
