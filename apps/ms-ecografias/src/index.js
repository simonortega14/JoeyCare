const express = require("express");
const cors = require("cors");

const ecografiasRoutes = require("./routes/ecografias.routes");

const app = express();

// middlewares básicos
app.use(cors());
app.use(express.json());

// healthcheck
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "ms-ecografias",
    now: new Date().toISOString(),
  });
});

// montar las rutas de negocio
app.use("/api/ecografias", ecografiasRoutes);

// puerto
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`[ms-ecografias] escuchando en puerto ${PORT}`);
});
