# ms-visualizador

Microservicio JoeyCare responsable de:
- Guardar, consultar y versionar anotaciones clínicas y mediciones hechas en el visor interactivo de imágenes (ultrasonidos / DICOM).
- Exponer endpoints bajo `/api/visualizador/analysis/**`.

Este servicio **NO** devuelve pacientes ni ecografías crudas.
Eso viene de `ms-usuarios` y `ms-ecografias`.  
El enrutamiento unificado lo hace `nginx`, así el frontend solo llama `/api/visualizador/...`.

Flujo:
1. El frontend del visor (React + vtk.js) renderiza imágenes y deja al especialista marcar puntos 📍, dibujar trazos ✏️ y ajustar ventana/nivel. :contentReference[oaicite:7]{index=7} :contentReference[oaicite:8]{index=8}
2. Esas anotaciones se envían con `POST /api/visualizador/analysis/anotaciones`.
3. Se pueden volver a pedir con `GET /api/visualizador/analysis/anotaciones?ecografiaId=...`.

Auth:
- Espera `Authorization: Bearer <token>`.
- El middleware `auth` se debe ajustar al mismo JWT/validación de `ms-usuarios`.

Docker:
- Corre en puerto interno 3003.
