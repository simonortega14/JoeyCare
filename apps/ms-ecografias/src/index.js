const express = require("express");
const cors = require("cors");
const ecoRoutes = require("./routes/ecografias.routes");

const app = express();

app.use(cors());
app.use(express.json());

// Rutas API
app.use("/api", ecoRoutes);

// Manejo de errores
app.use((err, req, res, next) => {
  console.error("ERROR ms-ecografias:", err);
  res.status(500).json({ error: "internal_error", detail: err.message });
});

const port = process.env.PORT || 3002;
app.listen(port, () => {
  console.log(`ms-ecografias escuchando en puerto ${port}`);
});
