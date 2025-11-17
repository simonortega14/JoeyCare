import express from "express";
import cors from "cors";
import dotenv from "dotenv";

console.log("🚀 Iniciando aplicación...");

dotenv.config();

const app = express();
console.log("🔧 Configurando middleware...");

app.use(cors());
app.use(express.json());

// Rutas
console.log("🛣️  Configurando rutas...");
import doctoresRoutes from "./routes/doctores.routes.js";
import pacientesRoutes from "./routes/pacientes.routes.js";
import ecografiasRoutes from "./routes/ecografias.routes.js";
import testRoutes from "./routes/test.routes.js";

app.use("/api", pacientesRoutes);
app.use("/api", testRoutes);
app.use("/api", doctoresRoutes);
app.use("/api", ecografiasRoutes);
app.use("/uploads", express.static("uploads"));

console.log("🎯 Aplicación configurada exitosamente");
export default app;
