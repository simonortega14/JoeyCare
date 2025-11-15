import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import doctoresRoutes from "./routes/doctores.routes.js"; 
import pacientesRoutes from "./routes/pacientes.routes.js";
import ecografiasRoutes from "./routes/ecografias.routes.js";
import testRoutes from "./routes/test.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Rutas
app.use("/api", pacientesRoutes);
app.use("/api", testRoutes);
app.use("/api", doctoresRoutes);
app.use("/api", ecografiasRoutes);
app.use("/uploads", express.static("uploads"));

export default app; 
