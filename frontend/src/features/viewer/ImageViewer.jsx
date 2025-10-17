import { useRef, useEffect, useState } from "react";
import "@kitware/vtk.js/Rendering/Profiles/All";
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkPlaneSource from "@kitware/vtk.js/Filters/Sources/PlaneSource";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkTexture from "@kitware/vtk.js/Rendering/Core/Texture";
import vtkInteractorStyleImage from "@kitware/vtk.js/Interaction/Style/InteractorStyleImage";
import { readImage } from "@itk-wasm/image-io";

function ImageViewer({ imageFile, onClose }) {
  const vtkContainerRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const context = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [windowLevel, setWindowLevel] = useState({ width: 256, center: 128 });
  const [panMode, setPanMode] = useState(false);
  
  // Estados para widgets
  const [pointMode, setPointMode] = useState(false);
  const [points, setPoints] = useState([]);
  const interactorSubscription = useRef(null);

  useEffect(() => {
    if (!imageFile || !vtkContainerRef.current) return;
    
    // Limpiar cualquier contenido previo
    if (vtkContainerRef.current) {
      vtkContainerRef.current.innerHTML = '';
    }
    
    loadAndRenderImage();
    
    return () => {
      if (interactorSubscription.current) {
        interactorSubscription.current.unsubscribe();
        interactorSubscription.current = null;
      }
      if (context.current) {
        const { fullScreenRenderer } = context.current;
        if (fullScreenRenderer) {
          fullScreenRenderer.delete();
        }
        context.current = null;
      }
    };
  }, [imageFile]);

  useEffect(() => {
    if (context.current && context.current.isGrayscale && context.current.rawPixelData) {
      updateWindowLevel();
    }
  }, [windowLevel]);

  // Configurar eventos cuando cambia el modo punto
  useEffect(() => {
    if (context.current && context.current.interactor) {
      setupInteractorEvents();
    }
  }, [pointMode]);

  // Redibujar puntos cuando cambian
  useEffect(() => {
    if (points.length > 0) {
      // Pequeño delay para asegurar que el canvas esté listo
      setTimeout(() => {
        drawPointsOnOverlay();
      }, 10);
    } else if (overlayCanvasRef.current) {
      // Limpiar si no hay puntos
      const ctx = overlayCanvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    }
  }, [points]);

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

  const worldToDisplay = (worldX, worldY) => {
    if (!context.current) return null;
    
    const { renderer, renderWindow } = context.current;
    const view = renderWindow.getViews()[0];
    
    // Convertir coordenadas del mundo a display
    const displayCoord = view.worldToDisplay(worldX, worldY, 0, renderer);
    
    return { x: displayCoord[0], y: displayCoord[1] };
  };

  const drawPointsOnOverlay = () => {
    if (!overlayCanvasRef.current || !context.current) return;
    
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext("2d");
    
    // Actualizar tamaño del canvas si cambió
    const { renderWindow } = context.current;
    const view = renderWindow.getViews()[0];
    const dims = view.getSize();
    
    if (canvas.width !== dims[0] || canvas.height !== dims[1]) {
      canvas.width = dims[0];
      canvas.height = dims[1];
    }
    
    // Limpiar el canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar cada punto
    points.forEach((point, index) => {
      const displayPos = worldToDisplay(point.world[0], point.world[1]);
      if (!displayPos) return;
      
      const x = displayPos.x;
      const y = displayPos.y; // Ya NO invertir Y aquí
      
      console.log(`Dibujando punto ${index + 1} en:`, x, y);
      
      // Dibujar círculo rojo
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Dibujar número del punto
      ctx.fillStyle = "white";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText((index + 1).toString(), x, y);
    });
  };

  const setupInteractorEvents = () => {
    if (!context.current) return;
    
    const { interactor, renderWindow } = context.current;
    
    // Limpiar suscripción anterior
    if (interactorSubscription.current) {
      interactorSubscription.current.unsubscribe();
      interactorSubscription.current = null;
    }

    if (pointMode) {
      console.log("Modo punto ACTIVADO");
      
      // Suscribirse al evento de click izquierdo
      interactorSubscription.current = interactor.onLeftButtonPress((callData) => {
        console.log("Click detectado!");
        
        const pos = callData.position;
        const x = pos.x;
        const y = pos.y;
        
        addPointAtPosition(x, y);
      });
      
      // Redibujar puntos cuando se mueve la cámara
      renderWindow.getInteractor().onAnimation(() => {
        drawPointsOnOverlay();
      });
    } else {
      console.log("Modo punto DESACTIVADO");
    }
  };

  const addPointAtPosition = (x, y) => {
    if (!context.current) return;
    
    const { renderer, renderWindow, width, height, planeSource, rawPixelData, isGrayscale } = context.current;
    
    // Obtener coordenadas del mundo
    const view = renderWindow.getViews()[0];
    const dims = view.getSize();
    const adjustedY = dims[1] - y;
    
    const worldCoord = view.displayToWorld(x, adjustedY, 0, renderer);
    console.log("Mundo:", worldCoord);
    
    // Convertir a píxeles de imagen
    const origin = planeSource.getOrigin();
    const point1 = planeSource.getPoint1();
    const point2 = planeSource.getPoint2();
    
    const planeWidth = point1[0] - origin[0];
    const planeHeight = point2[1] - origin[1];
    
    const u = (worldCoord[0] - origin[0]) / planeWidth;
    const v = (worldCoord[1] - origin[1]) / planeHeight;
    
    const pixelX = Math.round(u * width);
    const pixelY = Math.round(v * height);
    
    console.log("Píxel:", pixelX, pixelY);
    
    // Verificar que está dentro de la imagen
    if (pixelX < 0 || pixelX >= width || pixelY < 0 || pixelY >= height) {
      console.log("Click fuera de la imagen");
      return;
    }
    
    // Obtener valor del píxel
    let pixelValue = null;
    if (isGrayscale && rawPixelData) {
      const index = pixelY * width + pixelX;
      pixelValue = rawPixelData[index];
    }
    
    // Actualizar estado
    setPoints(prev => [...prev, {
      id: Date.now(),
      world: worldCoord,
      pixel: { x: pixelX, y: pixelY },
      value: pixelValue
    }]);
    
    console.log("Punto agregado!");
  };

  const clearAllPoints = () => {
    setPoints([]);
  };

  const removeLastPoint = () => {
    setPoints(prev => prev.slice(0, -1));
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

      if (context.current && context.current.fullScreenRenderer) {
        context.current.fullScreenRenderer.delete();
        context.current = null;
      }

      const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
        rootContainer: vtkContainerRef.current,
        containerStyle: { 
          width: "100%", 
          height: "100%", 
          position: "absolute",
          top: 0,
          left: 0
        }
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

      const interactor = renderWindow.getInteractor();
      const interactorStyle = vtkInteractorStyleImage.newInstance();
      interactor.setInteractorStyle(interactorStyle);

      // Habilitar zoom con rueda del mouse
      interactor.onMouseWheel((callData) => {
        const delta = callData.spinY > 0 ? 1.1 : 0.9;
        const currentScale = camera.getParallelScale();
        camera.setParallelScale(currentScale * delta);
        renderWindow.render();
        drawPointsOnOverlay(); // Redibujar puntos después del zoom
      });

      // Configurar interacción para pan
      interactor.onRightButtonPress(() => {
        if (panMode) {
          interactorStyle.startPan();
        }
      });

      interactor.onRightButtonRelease(() => {
        if (panMode) {
          interactorStyle.endPan();
        }
      });

      // Redibujar puntos cuando termina el pan
      interactor.onMouseMove(() => {
        if (panMode) {
          drawPointsOnOverlay();
        }
      });

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
        isGrayscale,
        interactor,
        interactorStyle
      };

      // Configurar el canvas de overlay con el mismo tamaño
      if (overlayCanvasRef.current) {
        const view = renderWindow.getViews()[0];
        const dims = view.getSize();
        overlayCanvasRef.current.width = dims[0];
        overlayCanvasRef.current.height = dims[1];
      }

      // IMPORTANTE: Encontrar el canvas de VTK y asegurar que el overlay esté encima
      setTimeout(() => {
        const vtkCanvas = vtkContainerRef.current?.querySelector('canvas');
        if (vtkCanvas) {
          vtkCanvas.style.position = 'absolute';
          vtkCanvas.style.zIndex = '1';
          console.log("Canvas VTK configurado con z-index 1");
        }
        if (overlayCanvasRef.current) {
          overlayCanvasRef.current.style.zIndex = '5';
          console.log("Canvas overlay configurado con z-index 5");
        }
      }, 100);

      renderWindow.render();
      setLoading(false);
      
      console.log("Imagen cargada. Dimensiones:", width, "x", height);
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
      drawPointsOnOverlay();
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
    <div style={{ width: "100%", height: "100vh", position: "relative", background: "#000", overflow: "hidden" }}>
      {/* Toolbar superior */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "50px",
        background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center",
        padding: "0 10px", gap: "10px", zIndex: 100, flexWrap: "wrap"
      }}>
        <button onClick={onClose} style={buttonStyle}>← Volver</button>
        <button onClick={handleResetView} style={buttonStyle}>Reset View</button>

        {context.current?.isGrayscale && (
          <>
            <button onClick={handleAutoWindowLevel} style={buttonStyle}>Auto W/L</button>
            <span style={{ color: "#fff", fontSize: "13px" }}>
              W: {Math.round(windowLevel.width)} | L: {Math.round(windowLevel.center)}
            </span>
          </>
        )}

        <button
          style={{ ...buttonStyle, backgroundColor: panMode ? "#4caf50" : "#333" }}
          onClick={() => {
            setPanMode(!panMode);
            if (!panMode) setPointMode(false);
          }}
        >
          Pan {panMode ? "ON" : "OFF"}
        </button>

        <button
          style={{ ...buttonStyle, backgroundColor: pointMode ? "#2196f3" : "#333" }}
          onClick={() => {
            const newPointMode = !pointMode;
            console.log("Modo punto:", newPointMode);
            setPointMode(newPointMode);
            if (newPointMode) setPanMode(false);
          }}
        >
          📍 Punto {pointMode ? "ON" : "OFF"}
        </button>

        {points.length > 0 && (
          <>
            <button onClick={removeLastPoint} style={buttonStyle}>
              Eliminar Último
            </button>
            <button onClick={clearAllPoints} style={buttonStyle}>
              Limpiar Todo
            </button>
            <span style={{ color: "#2196f3", fontSize: "13px", fontWeight: "bold" }}>
              {points.length} punto{points.length !== 1 ? 's' : ''}
            </span>
          </>
        )}

        <span style={{ marginLeft: "auto", color: "#fff", fontSize: "13px" }}>
          {imageFile.filename}
        </span>
      </div>

      {/* Panel lateral de puntos */}
      {points.length > 0 && (
        <div style={{
          position: "absolute", top: "60px", right: "10px",
          background: "rgba(0,0,0,0.85)", padding: "10px",
          borderRadius: "5px", color: "#fff", fontSize: "12px",
          maxHeight: "calc(100vh - 150px)", overflowY: "auto",
          minWidth: "200px", zIndex: 100
        }}>
          <div style={{ fontWeight: "bold", marginBottom: "8px", fontSize: "14px" }}>
            Puntos ({points.length})
          </div>
          {points.map((point, index) => (
            <div key={point.id} style={{
              padding: "6px", marginBottom: "5px",
              background: "rgba(255,255,255,0.1)",
              borderRadius: "3px", borderLeft: "3px solid #f44336"
            }}>
              <div style={{ fontWeight: "bold", color: "#f44336" }}>
                Punto {index + 1}
              </div>
              <div>X: {point.pixel.x} px</div>
              <div>Y: {point.pixel.y} px</div>
              {point.value !== null && (
                <div>Valor: {Math.round(point.value)}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ayuda en la esquina inferior */}
      <div style={{
        position: "absolute", bottom: "10px", left: "10px",
        background: "rgba(0,0,0,0.7)", padding: "8px 12px",
        borderRadius: "5px", color: "#aaa", fontSize: "11px",
        zIndex: 100
      }}>
        {pointMode ? (
          <span style={{ color: "#2196f3", fontWeight: "bold" }}>🖱️ Click izq: Colocar punto</span>
        ) : panMode ? (
          <>🖱️ Click der: Pan | Rueda: Zoom</>
        ) : (
          <>🖱️ Click izq: W/L | Click der: Pan | Rueda: Zoom</>
        )}
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

      {/* Contenedor VTK */}
      <div 
        ref={vtkContainerRef} 
        style={{ 
          width: "100%", 
          height: "100%", 
          position: "absolute",
          top: 0,
          left: 0
        }} 
      />
      
      {/* Canvas de overlay para dibujar puntos */}
      <canvas
        ref={overlayCanvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
          zIndex: 5
        }}
      />
    </div>
  );
}

const buttonStyle = {
  background: "#333",
  color: "#fff",
  border: "none",
  padding: "6px 12px",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: "500"
};

export default ImageViewer;