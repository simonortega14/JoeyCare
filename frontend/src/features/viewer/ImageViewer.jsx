import { useRef, useEffect, useState } from "react";
import "@kitware/vtk.js/Rendering/Profiles/All";
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkPlaneSource from "@kitware/vtk.js/Filters/Sources/PlaneSource";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkTexture from "@kitware/vtk.js/Rendering/Core/Texture";
import vtkInteractorStyleImage from "@kitware/vtk.js/Interaction/Style/InteractorStyleImage";
import { readImage } from "@itk-wasm/image-io";
import ImageComparisonSelector from "../comparacion/ImageComparisonSelector";
import "./viewer.css";

function ImageViewer({ imageFile, onClose }) {
  const vtkContainerRef = useRef(null);
  const context = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [windowLevel, setWindowLevel] = useState({ width: 256, center: 128 });
  const [panMode, setPanMode] = useState(false);

  useEffect(() => {
    if (!imageFile || !vtkContainerRef.current) return;
    loadAndRenderImage();
    return () => {
      if (context.current) {
        context.current.fullScreenRenderer.delete();
        context.current = null;
      }
    };
  }, [imageFile]);

  useEffect(() => {
    if (context.current && context.current.isGrayscale && context.current.rawPixelData) {
      updateWindowLevel();
    }
  }, [windowLevel]);

  const updateWindowLevel = () => {
    const { rawPixelData, width, height, texture, renderWindow } = context.current;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const imageData = ctx.createImageData(width, height);

    const minValue = windowLevel.center - windowLevel.width / 2;
    const maxValue = windowLevel.center + windowLevel.width / 2;
    const range = maxValue - minValue;

    for (let i = 0; i < rawPixelData.length; i++) {
      let value = rawPixelData[i];
      if (value <= minValue) value = 0;
      else if (value >= maxValue) value = 255;
      else value = ((value - minValue) / range) * 255;
      imageData.data[i * 4] = value;
      imageData.data[i * 4 + 1] = value;
      imageData.data[i * 4 + 2] = value;
      imageData.data[i * 4 + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    texture.setCanvas(canvas);
    renderWindow.render();
  };

  const loadAndRenderImage = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:4000/api/uploads/${imageFile.filename}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();

      const file = new File([arrayBuffer], imageFile.filename, {
        type: getMimeType(imageFile.filename)
      });

      const result = await readImage(file);
      const itkImage = result.image;

      const width = itkImage.size[0];
      const height = itkImage.size[1];
      const pixelData = itkImage.data;
      const isRGB = itkImage.imageType.components === 3;
      const isGrayscale = itkImage.imageType.components === 1;

      if (isGrayscale) {
        let min = Infinity, max = -Infinity;
        for (let i = 0; i < pixelData.length; i++) {
          if (pixelData[i] < min) min = pixelData[i];
          if (pixelData[i] > max) max = pixelData[i];
        }
        const initialWidth = max - min;
        const initialCenter = min + initialWidth / 2;
        setWindowLevel({ width: initialWidth, center: initialCenter });
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      const imageData = ctx.createImageData(width, height);

      if (isRGB) {
        for (let i = 0; i < width * height; i++) {
          imageData.data[i * 4] = pixelData[i * 3];
          imageData.data[i * 4 + 1] = pixelData[i * 3 + 1];
          imageData.data[i * 4 + 2] = pixelData[i * 3 + 2];
          imageData.data[i * 4 + 3] = 255;
        }
      } else {
        for (let i = 0; i < width * height; i++) {
          const value = pixelData[i];
          imageData.data[i * 4] = value;
          imageData.data[i * 4 + 1] = value;
          imageData.data[i * 4 + 2] = value;
          imageData.data[i * 4 + 3] = 255;
        }
      }
      ctx.putImageData(imageData, 0, 0);

      if (context.current) {
        context.current.fullScreenRenderer.delete();
        context.current = null;
      }

      const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
        rootContainer: vtkContainerRef.current,
        containerStyle: { width: "100%", height: "100%", position: "relative" }
      });
      const renderer = fullScreenRenderer.getRenderer();
      const renderWindow = fullScreenRenderer.getRenderWindow();
      renderer.setBackground(0, 0, 0);

      const planeSource = vtkPlaneSource.newInstance();
      const mapper = vtkMapper.newInstance();
      mapper.setInputConnection(planeSource.getOutputPort());

      const actor = vtkActor.newInstance();
      actor.setMapper(mapper);

      const textureObj = vtkTexture.newInstance();
      textureObj.setCanvas(canvas);
      textureObj.setInterpolate(true);
      actor.addTexture(textureObj);

      const aspect = width / height;
      if (aspect > 1) {
        planeSource.setOrigin(-aspect / 2, -0.5, 0);
        planeSource.setPoint1(aspect / 2, -0.5, 0);
        planeSource.setPoint2(-aspect / 2, 0.5, 0);
      } else {
        const invAspect = 1 / aspect;
        planeSource.setOrigin(-0.5, -invAspect / 2, 0);
        planeSource.setPoint1(0.5, -invAspect / 2, 0);
        planeSource.setPoint2(-0.5, invAspect / 2, 0);
      }

      renderer.addActor(actor);

      const camera = renderer.getActiveCamera();
      camera.setParallelProjection(true);
      camera.setPosition(0, 0, 1);
      camera.setFocalPoint(0, 0, 0);
      camera.setViewUp(0, 1, 0);
      renderer.resetCamera();
      renderer.resetCameraClippingRange();

      await new Promise(resolve => setTimeout(resolve, 100));

      const interactor = renderWindow.getInteractor();
      const interactorStyle = vtkInteractorStyleImage.newInstance();
      interactor.setInteractorStyle(interactorStyle);

      // ===== EVENTOS DEL MOUSE =====
      const canvasElement = vtkContainerRef.current?.querySelector("canvas");
      if (canvasElement) {
        let isDragging = false;
        let lastX = 0;
        let lastY = 0;
        let isRightButton = false;

        canvasElement.addEventListener("mousedown", (e) => {
          if (e.button === 0) isRightButton = false;
          else if (e.button === 2) isRightButton = true;
          isDragging = true;
          lastX = e.clientX;
          lastY = e.clientY;
          canvasElement.style.cursor = panMode && isRightButton ? "grab" : "crosshair";
        });

        canvasElement.addEventListener("mousemove", (e) => {
          if (!isDragging) return;
          const deltaX = e.clientX - lastX;
          const deltaY = e.clientY - lastY;

          if (panMode && isRightButton) {
            const scale = camera.getParallelScale() * 2;
            camera.setFocalPoint(
              camera.getFocalPoint()[0] - deltaX * 0.01 * scale,
              camera.getFocalPoint()[1] + deltaY * 0.01 * scale,
              0
            );
            renderWindow.render();
          } else if (!panMode && !isRightButton && isGrayscale) {
            setWindowLevel((prev) => ({
              width: Math.max(1, prev.width + deltaX * 2),
              center: prev.center + deltaY * 2
            }));
          }

          lastX = e.clientX;
          lastY = e.clientY;
        });

        canvasElement.addEventListener("mouseup", () => {
          isDragging = false;
          canvasElement.style.cursor = "default";
        });

        canvasElement.addEventListener("mouseleave", () => {
          isDragging = false;
          canvasElement.style.cursor = "default";
        });

        canvasElement.addEventListener("wheel", (e) => {
          e.preventDefault();
          const delta = e.deltaY > 0 ? 1.1 : 0.9;
          const currentScale = camera.getParallelScale();
          camera.setParallelScale(currentScale * delta);
          renderWindow.render();
        }, { passive: false });
      }

      context.current = {
        fullScreenRenderer,
        renderer,
        renderWindow,
        camera,
        actor,
        planeSource,
        texture: textureObj,
        rawPixelData: isGrayscale ? pixelData : null,
        width,
        height,
        isRGB,
        isGrayscale
      };

      renderWindow.render();
      setLoading(false);
    } catch (err) {
      console.error("Error:", err);
      setError(`Error: ${err.message}`);
      setLoading(false);
    }
  };

  const getMimeType = (filename) => {
    const ext = filename.split(".").pop().toLowerCase();
    const mimeTypes = { dcm: "application/dicom", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" };
    return mimeTypes[ext] || "application/octet-stream";
  };

  const handleResetView = () => {
    if (context.current) {
      context.current.renderer.resetCamera();
      context.current.renderWindow.render();
    }
  };

  const handleAutoWindowLevel = () => {
    if (context.current && context.current.isGrayscale && context.current.rawPixelData) {
      const pixelData = context.current.rawPixelData;
      let min = Infinity, max = -Infinity;
      for (let i = 0; i < pixelData.length; i++) {
        if (pixelData[i] < min) min = pixelData[i];
        if (pixelData[i] > max) max = pixelData[i];
      }
      setWindowLevel({ width: max - min, center: min + (max - min) / 2 });
    }
  };




  return (
    <div className="vtk-fullscreen">
      <div className="vtk-toolbar">
        <button onClick={onClose}>← Volver</button>
        <button onClick={handleResetView}>Reset View</button>

        {context.current?.isGrayscale && (
          <>
            <button onClick={handleAutoWindowLevel}>Auto W/L</button>
            <span style={{ marginLeft: "10px", color: "#fff", fontSize: "14px" }}>
              W: {Math.round(windowLevel.width)} | L: {Math.round(windowLevel.center)}
            </span>
          </>
        )}

        {/* BOTÓN PAN */}
        <button
          style={{ backgroundColor: panMode ? "#4caf50" : "#222", color: "#fff", marginLeft: "10px" }}
          onClick={() => setPanMode(!panMode)}
        >
          Pan {panMode ? "ON" : "OFF"}
        </button>

        <span style={{ marginLeft: "auto", color: "#fff", fontSize: "14px" }}>
          {imageFile.filename}
        </span>

        <span style={{ marginLeft: "10px", color: "#aaa", fontSize: "12px" }}>
          💡 Rueda: zoom | Click izq: W/L | Click der: Pan
        </span>
      </div>

      {loading && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          color: "white", fontSize: "20px", backgroundColor: "rgba(0,0,0,0.7)",
          padding: "20px", borderRadius: "8px", zIndex: 1000
        }}>
          Cargando imagen...
        </div>
      )}

      {error && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          color: "red", fontSize: "16px", textAlign: "center", padding: "20px",
          backgroundColor: "rgba(0,0,0,0.8)", borderRadius: "8px", zIndex: 1000, maxWidth: "80%"
        }}>
          {error}
        </div>
      )}

      <div ref={vtkContainerRef} className="vtk-viewer-canvas" />

    </div>
  );
}

export default ImageViewer;
