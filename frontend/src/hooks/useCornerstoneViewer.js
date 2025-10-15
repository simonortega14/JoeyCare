// src/hooks/useCornerstoneViewer.js
import { useEffect, useRef, useState } from "react";
import { cornerstone, cornerstoneTools } from "../utils/cornerstoneSetup";

const API_BASE_URL = "http://localhost:4000"; // <- ajusta si tu backend usa otro host/puerto

export function useCornerstoneViewer(selectedEcografia) {
  const elementRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // limpiar si no hay selección o el DOM aún no está listo
    if (!selectedEcografia || !elementRef.current) return;

    setLoading(true);
    setError(null);

    // Construir fileUrl: usa selectedEcografia.fileUrl si existe,
    // si no, construye desde filename (muchos objetos solo traen filename)
    let fileUrl = selectedEcografia.fileUrl || null;
    if (!fileUrl && selectedEcografia.filename) {
      // asegúrate que la ruta coincide con la que sirve tu backend
      fileUrl = `${API_BASE_URL}/uploads/${selectedEcografia.filename}`;
    }

    console.log("📁 useCornerstoneViewer: cargando ->", fileUrl);
    if (!fileUrl) {
      setError("No se encontró URL ni filename en selectedEcografia.");
      setLoading(false);
      return;
    }

    const ext = fileUrl.toLowerCase();
    const isDicom = ext.endsWith(".dcm");

    const element = elementRef.current;

    try {
      cornerstone.enable(element);
    } catch (err) {
      console.warn("cornerstone.enable falló:", err);
      // enable puede fallar si ya está habilitado; ignoramos silenciosamente
    }

    // --- DICOM via WADO ---
    if (isDicom) {
      // usa wadouri scheme para que cornerstone-wado-image-loader lo procese
      const imageId = "wadouri:" + encodeURI(fileUrl);

      console.log("🔍 DICOM imageId:", imageId);

      cornerstone
        .loadAndCacheImage(imageId)
        .then((image) => {
          cornerstone.displayImage(element, image);
          // Ajustar al contenedor
          try {
            cornerstone.fitToWindow(element);
          } catch (e) {
            console.warn("cornerstone.fitToWindow falló:", e);
          }
          // activar herramientas
          cornerstoneTools.setToolActive("Wwwc", { mouseButtonMask: 1 });
          cornerstoneTools.setToolActive("Pan", { mouseButtonMask: 2 });
          cornerstoneTools.setToolActive("Zoom", { mouseButtonMask: 4 });
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error Cornerstone DICOM:", err);
          setError("Error al cargar DICOM: " + (err.message || err));
          setLoading(false);
        });

      return () => {
        try {
          cornerstone.disable(element);
        } catch (_x) {
          console.warn("cornerstone.disable falló", _x);
          // ignorar errores al deshabilitar
        }
      };
    }

    // --- PNG / JPG: cargamos la imagen en un canvas y creamos un "cornerstoneImage" ---
    // Esto evita usar <img> visible y mantiene todo dentro del canvas de Cornerstone.
    const img = new Image();
    // Si tu backend requiere cookies, usa: img.crossOrigin = 'use-credentials';
    img.crossOrigin = "anonymous";
    img.src = fileUrl;

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Cornerstone espera una TypedArray; usamos la misma memoria del ImageData
        const pixelData = new Uint8Array(imageData.data.buffer);

        // Construimos el objeto requerido por cornerstone.displayImage
        const cornerstoneImage = {
          imageId: fileUrl,
          minPixelValue: 0,
          maxPixelValue: 255,
          slope: 1.0,
          intercept: 0,
          windowCenter: 128,
          windowWidth: 256,
          getPixelData: () => pixelData,
          rows: img.height,
          columns: img.width,
          height: img.height,
          width: img.width,
          color: true,
          rgba: true,
          columnPixelSpacing: 1.0,
          rowPixelSpacing: 1.0,
          sizeInBytes: pixelData.length,
        };

        cornerstone.displayImage(element, cornerstoneImage);
        try {
          cornerstone.fitToWindow(element);
        } catch (_y) {
          console.warn("cornerstone.fitToWindow falló:", _y);
        }
        setLoading(false);
      } catch (err) {
        console.error("Error al procesar PNG/JPG:", err);
        setError("Error al procesar imagen: " + (err.message || err));
        setLoading(false);
      }
    };

    img.onerror = (e) => {
      console.error("img.onerror", e);
      setError("No se pudo cargar la imagen (PNG/JPG). Revisa la ruta y CORS.");
      setLoading(false);
    };

    return () => {
      try {
        cornerstone.disable(element);
      } catch (_z) {
        console.warn("cornerstone.disable falló", _z);
        // ignorar errores al deshabilitar
      }
    };
  }, [selectedEcografia]);

  return { elementRef, loading, error };
}
