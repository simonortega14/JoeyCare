// src/hooks/useVtkEngine.js
import { useState, useEffect, useRef } from "react";

import vtkGenericRenderWindow from "@kitware/vtk.js/Rendering/Misc/GenericRenderWindow";
import vtkImageMapper from "@kitware/vtk.js/Rendering/Core/ImageMapper";
import vtkImageSlice from "@kitware/vtk.js/Rendering/Core/ImageSlice";
import vtkInteractorStyleImage from "@kitware/vtk.js/Interaction/Style/InteractorStyleImage";
import vtkHttpDataSetReader from "@kitware/vtk.js/IO/Core/HttpDataSetReader";

export function useVtkEngine(selectedEcografia) {
  const vtkContainerRef = useRef(null);
  const renderWindowRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [windowLevel, setWindowLevel] = useState({ width: 400, center: 40 });

  useEffect(() => {
    if (!selectedEcografia || !vtkContainerRef.current) return;

    const fileUrl = selectedEcografia.fileUrl;
    if (!fileUrl) {
      setError("No se encontró la URL del archivo.");
      return;
    }

    setLoading(true);
    setError(null);

    if (renderWindowRef.current) {
      renderWindowRef.current.delete();
    }

    const genericRenderWindow = vtkGenericRenderWindow.newInstance({
      background: [0, 0, 0],
    });
    genericRenderWindow.setContainer(vtkContainerRef.current);
    renderWindowRef.current = genericRenderWindow;

    const renderer = genericRenderWindow.getRenderer();
    const renderWindow = genericRenderWindow.getRenderWindow();
    const interactor = genericRenderWindow.getInteractor();
    interactor.setInteractorStyle(vtkInteractorStyleImage.newInstance());

    // Usamos un lector genérico de datos HTTP
    const reader = vtkHttpDataSetReader.newInstance({ fetchGzip: true });

    // Cargar la imagen o dataset desde URL
    const readerPromise = reader.setUrl(fileUrl, { loadData: true });

    Promise.resolve(readerPromise)
      .then(() => {
        const imageData = reader.getOutputData(0);

        if (!imageData) {
          throw new Error("No se pudo leer la imagen o no contiene datos de píxeles.");
        }

        const mapper = vtkImageMapper.newInstance();
        mapper.setInputData(imageData);

        const slice = vtkImageSlice.newInstance();
        slice.setMapper(mapper);

        renderer.addViewProp(slice);
        renderer.resetCamera();
        renderWindow.render();

        setLoading(false);
      })
      .catch((err) => {
        console.error("Error al cargar imagen:", err);
        setError("Error al cargar la imagen: " + err.message);
        setLoading(false);
      });

    return () => {
      if (renderWindowRef.current) {
        renderWindowRef.current.delete();
        renderWindowRef.current = null;
      }
    };
  }, [selectedEcografia]);

  // Controles del visor
  const handleResetView = () => {
    if (renderWindowRef.current) {
      const renderer = renderWindowRef.current.getRenderer();
      renderer.resetCamera();
      renderWindowRef.current.getRenderWindow().render();
    }
  };

  const handleAutoWindowLevel = () => {
    setWindowLevel({ width: 400, center: 40 });
  };

  return {
    vtkContainerRef,
    loading,
    error,
    zoom,
    setZoom,
    windowLevel,
    setWindowLevel,
    handleResetView,
    handleAutoWindowLevel,
  };
}
