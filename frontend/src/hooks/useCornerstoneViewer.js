
// src/hooks/useCornerstoneViewer.js
import { useEffect, useRef, useState } from "react";
import { cornerstone, cornerstoneTools } from "../utils/cornerstoneSetup";

export function useCornerstoneViewer(selectedEcografia) {
  const elementRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedEcografia || !elementRef.current) return;

    const fileUrl = selectedEcografia.fileUrl;
    if (!fileUrl) {
      setError("No se encontró la URL del archivo.");
      return;
    }

    setLoading(true);
    setError(null);

    // Determinar tipo de archivo
    const ext = fileUrl.toLowerCase();
    const isDicom = ext.endsWith(".dcm");

    const element = elementRef.current;
    cornerstone.enable(element);

    if (isDicom) {
      // DICOM con Cornerstone WADO Loader
      const imageId = "wadouri:" + fileUrl;

      cornerstone
        .loadAndCacheImage(imageId)
        .then((image) => {
          cornerstone.displayImage(element, image);
          cornerstoneTools.setToolActive("Wwwc", { mouseButtonMask: 1 });
          cornerstoneTools.setToolActive("Pan", { mouseButtonMask: 2 });
          cornerstoneTools.setToolActive("Zoom", { mouseButtonMask: 4 });
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error Cornerstone:", err);
          setError("Error al cargar DICOM: " + err.message);
          setLoading(false);
        });
    } else {
      // PNG o JPG con Cornerstone
      const imageId = "cornerstone:" + fileUrl;
      cornerstone
        .loadImage(imageId)
        .then((image) => {
          cornerstone.displayImage(element, image);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error Cornerstone (no DICOM):", err);
          setError("No se pudo mostrar la imagen.");
          setLoading(false);
        });
    }

    return () => {
      try {
        cornerstone.disable(element);
      } catch (e) {
        console.error(e);
      }
    };
  }, [selectedEcografia]);

  return { elementRef, loading, error };
}
