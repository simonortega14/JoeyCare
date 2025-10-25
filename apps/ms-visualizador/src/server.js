import { config } from "./config/index.js";
import app from "./app.js";

app.listen(config.port, () => {
  console.log(`[ms-visualizador] escuchando en puerto ${config.port}`);
});
