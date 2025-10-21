import { useRef, useEffect, useState } from "react";
import "@kitware/vtk.js/Rendering/Profiles/All";
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkPlaneSource from "@kitware/vtk.js/Filters/Sources/PlaneSource";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkTexture from "@kitware/vtk.js/Rendering/Core/Texture";
import vtkInteractorStyleImage from "@kitware/vtk.js/Interaction/Style/InteractorStyleImage";
import vtkSphereSource from "@kitware/vtk.js/Filters/Sources/SphereSource";
import vtkPolyData from "@kitware/vtk.js/Common/DataModel/PolyData";
import vtkPoints from "@kitware/vtk.js/Common/Core/Points";
import vtkCellArray from "@kitware/vtk.js/Common/Core/CellArray";
import { readImage } from "@itk-wasm/image-io";

function ImageViewer({ imageFile, onClose }) {
  const vtkContainerRef = useRef(null);
  const context = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [windowLevel, setWindowLevel] = useState({ width: 256, center: 128 });
  
  // Estados para widgets
  const [pointMode, setPointMode] = useState(false);
  const pointModeRef = useRef(false);
  const [points, setPoints] = useState([]);
  const pointActors = useRef([]);

  // Estados para el lápiz
  const [drawMode, setDrawMode] = useState(false);
  const drawModeRef = useRef(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false);
  const [drawings, setDrawings] = useState([]);
  const drawingActors = useRef([]);
  const currentDrawing = useRef({ points: [], actor: null, mapper: null, polyData: null });
  const [drawColor, setDrawColor] = useState([1, 0, 0]); // Rojo por defecto
  const drawColorRef = useRef([1, 0, 0]); // Ref para acceder al valor actual
  const [lineWidth, setLineWidth] = useState(2);
  const lineWidthRef = useRef(2); // Ref para acceder al valor actual
  const [pointColor, setPointColor] = useState([1, 0, 0]); // Rojo por defecto para puntos
  const pointColorRef = useRef([1, 0, 0]); // Ref para acceder al valor actual

  useEffect(() => {
    if (!imageFile || !vtkContainerRef.current) return;
    
    if (vtkContainerRef.current) {
      vtkContainerRef.current.innerHTML = '';
    }
    
    loadAndRenderImage();
    
    return () => {
      cleanupPoints();
      cleanupDrawings();
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

  const cleanupPoints = () => {
    if (!context.current) return;
    
    const { renderer } = context.current;
    pointActors.current.forEach(({ actor }) => {
      renderer.removeActor(actor);
      actor.delete();
    });
    pointActors.current = [];
  };

  const cleanupDrawings = () => {
    if (!context.current) return;
    
    const { renderer } = context.current;
    drawingActors.current.forEach(({ actor }) => {
      renderer.removeActor(actor);
      actor.delete();
    });
    drawingActors.current = [];
  };

  const addPointActor = (worldPos, pixelPos, pixelValue) => {
    if (!context.current) return;
    
    // Usar el ref para obtener el color actual
    const currentColor = pointColorRef.current;
    
    console.log("=== AGREGANDO PUNTO ===");
    console.log("Color de punto seleccionado (ref):", currentColor);
    
    const { renderer, renderWindow, camera } = context.current;
    const cameraScale = camera.getParallelScale();
    const sphereRadius = cameraScale * 0.015;
    
    const sphereSource = vtkSphereSource.newInstance();
    sphereSource.setCenter(worldPos[0], worldPos[1], 0.01);
    sphereSource.setRadius(sphereRadius);
    sphereSource.setPhiResolution(20);
    sphereSource.setThetaResolution(20);
    
    const mapper = vtkMapper.newInstance();
    mapper.setInputConnection(sphereSource.getOutputPort());
    
    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);
    
    const property = actor.getProperty();
    property.setColor(currentColor[0], currentColor[1], currentColor[2]);
    property.setAmbient(0.5);
    property.setDiffuse(0.7);
    property.setSpecular(0.3);
    property.setSpecularPower(20);
    property.setOpacity(1.0);
    
    console.log("Color aplicado al punto:", property.getColor());
    
    renderer.addActor(actor);
    
    const pointData = {
      actor,
      sphereSource,
      id: Date.now(),
      pixel: pixelPos,
      value: pixelValue,
      world: worldPos,
      color: [...currentColor]
    };
    
    pointActors.current.push(pointData);
    
    setPoints(prev => [...prev, {
      id: pointData.id,
      pixel: pixelPos,
      value: pixelValue
    }]);
    
    console.log("Punto agregado, renderizando...");
    renderWindow.render();
  };

  const startDrawing = (worldPos) => {
    if (!context.current) return;
    
    console.log("=== INICIANDO DIBUJO ===");
    console.log("Posición inicial:", worldPos);
    console.log("Color seleccionado:", drawColor);
    console.log("Ancho de línea:", lineWidth);
    
    const { renderer } = context.current;
    
    // Crear arrays para almacenar los puntos del trazo
    const worldPoints = [worldPos];
    
    // Crear geometría VTK vacía inicialmente
    const vtkPointsObj = vtkPoints.newInstance();
    const lines = vtkCellArray.newInstance();
    const polyData = vtkPolyData.newInstance();
    
    const mapper = vtkMapper.newInstance();
    mapper.setInputData(polyData);
    
    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);
    
    const property = actor.getProperty();
    // Intentar diferentes formas de setear el color
    property.setColor(drawColor[0], drawColor[1], drawColor[2]);
    property.setAmbient(1.0);
    property.setDiffuse(1.0);
    property.setSpecular(0.0);
    property.setLineWidth(lineWidth);
    property.setOpacity(1.0);
    property.setLighting(false); // Desactivar iluminación para colores planos
    
    console.log("Color aplicado al actor:", property.getColor());
    console.log("Ancho de línea aplicado:", property.getLineWidth());
    console.log("Ambient:", property.getAmbient());
    console.log("Diffuse:", property.getDiffuse());
    
    renderer.addActor(actor);
    
    currentDrawing.current = {
      worldPoints,
      actor,
      mapper,
      polyData,
      vtkPoints: vtkPointsObj,
      lines,
      color: [...drawColor],
      width: lineWidth
    };
    
    isDrawingRef.current = true;
    setIsDrawing(true);
    
    console.log("Actor de dibujo creado y agregado al renderer");
    
    // Forzar actualización
    if (context.current) {
      context.current.renderWindow.render();
    }
  };

  const continueDrawing = (worldPos) => {
    if (!isDrawingRef.current || !currentDrawing.current) return;
    if (!currentDrawing.current.polyData || !currentDrawing.current.worldPoints) return;
    
    const { worldPoints, vtkPoints, lines, polyData } = currentDrawing.current;
    
    console.log("=== CONTINUANDO DIBUJO ===");
    console.log("Nueva posición:", worldPos);
    console.log("Puntos actuales:", worldPoints.length);
    
    // Agregar el nuevo punto al array
    worldPoints.push(worldPos);
    
    // Recrear completamente la geometría
    vtkPoints.setNumberOfPoints(worldPoints.length);
    
    // Setear todos los puntos
    for (let i = 0; i < worldPoints.length; i++) {
      vtkPoints.setPoint(i, worldPoints[i][0], worldPoints[i][1], 0.02);
      console.log(`Punto ${i}: [${worldPoints[i][0]}, ${worldPoints[i][1]}, 0.02]`);
    }
    
    // Limpiar y recrear las líneas
    lines.initialize();
    
    if (worldPoints.length >= 2) {
      // Crear una polyline continua: [numPuntos, idx0, idx1, idx2, ...]
      const polylineCell = [worldPoints.length];
      for (let i = 0; i < worldPoints.length; i++) {
        polylineCell.push(i);
      }
      
      console.log("Creando polyline con:", polylineCell);
      lines.insertNextCell(polylineCell);
    }
    
    // Actualizar el polyData
    polyData.setPoints(vtkPoints);
    polyData.setLines(lines);
    polyData.modified();
    
    console.log("PolyData actualizado, renderizando...");
    
    if (context.current) {
      context.current.renderWindow.render();
    }
    
    console.log("=== FIN CONTINUANDO DIBUJO ===");
  };

  const finishDrawing = () => {
    if (!isDrawingRef.current || !currentDrawing.current) return;
    if (!currentDrawing.current.actor || !currentDrawing.current.worldPoints) return;
    
    console.log("=== FINALIZANDO DIBUJO ===");
    console.log("Total de puntos:", currentDrawing.current.worldPoints.length);
    
    if (currentDrawing.current.worldPoints.length > 1) {
      const drawingData = {
        id: Date.now(),
        actor: currentDrawing.current.actor,
        mapper: currentDrawing.current.mapper,
        polyData: currentDrawing.current.polyData,
        points: [...currentDrawing.current.worldPoints],
        color: currentDrawing.current.color,
        width: currentDrawing.current.width
      };
      
      drawingActors.current.push(drawingData);
      
      setDrawings(prev => [...prev, {
        id: drawingData.id,
        numPoints: drawingData.points.length
      }]);
      
      console.log("Dibujo guardado exitosamente");
    } else {
      // Si solo tiene un punto o ninguno, eliminar el actor
      console.log("Dibujo con muy pocos puntos, eliminando...");
      if (context.current) {
        context.current.renderer.removeActor(currentDrawing.current.actor);
        currentDrawing.current.actor.delete();
      }
    }
    
    currentDrawing.current = { worldPoints: [], actor: null, mapper: null, polyData: null };
    isDrawingRef.current = false;
    setIsDrawing(false);
    
    console.log("=== FIN FINALIZANDO DIBUJO ===");
  };

  const removeLastDrawing = () => {
    if (!context.current || drawingActors.current.length === 0) return;
    
    const { renderer, renderWindow } = context.current;
    const lastDrawing = drawingActors.current.pop();
    
    renderer.removeActor(lastDrawing.actor);
    lastDrawing.actor.delete();
    
    setDrawings(prev => prev.slice(0, -1));
    renderWindow.render();
  };

  const clearAllDrawings = () => {
    if (!context.current) return;
    
    const { renderer, renderWindow } = context.current;
    
    drawingActors.current.forEach(({ actor }) => {
      renderer.removeActor(actor);
      actor.delete();
    });
    
    drawingActors.current = [];
    setDrawings([]);
    renderWindow.render();
  };

  const removeLastPoint = () => {
    if (!context.current || pointActors.current.length === 0) return;
    
    const { renderer, renderWindow } = context.current;
    const lastPoint = pointActors.current.pop();
    
    renderer.removeActor(lastPoint.actor);
    lastPoint.actor.delete();
    
    setPoints(prev => prev.slice(0, -1));
    renderWindow.render();
  };

  const clearAllPoints = () => {
    if (!context.current) return;
    
    const { renderer, renderWindow } = context.current;
    
    pointActors.current.forEach(({ actor }) => {
      renderer.removeActor(actor);
      actor.delete();
    });
    
    pointActors.current = [];
    setPoints([]);
    renderWindow.render();
  };

  const updatePointSizes = () => {
    if (!context.current || pointActors.current.length === 0) return;
    
    const { camera } = context.current;
    const cameraScale = camera.getParallelScale();
    const newRadius = cameraScale * 0.015;
    
    pointActors.current.forEach(({ sphereSource }) => {
      sphereSource.setRadius(newRadius);
    });
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
      camera.setClippingRange(0.001, 100.0);
      renderer.resetCamera();

      const interactor = renderWindow.getInteractor();
      const interactorStyle = vtkInteractorStyleImage.newInstance();
      interactor.setInteractorStyle(interactorStyle);

      // Eventos del mouse para puntos y dibujo
      interactor.onLeftButtonPress((callData) => {
        const pos = callData.position;
        const view = renderWindow.getViews()[0];
        const worldCoord = view.displayToWorld(pos.x, pos.y, 0, renderer);
        
        if (drawModeRef.current) {
          startDrawing(worldCoord);
        } else if (pointModeRef.current) {
          const origin = planeSource.getOrigin();
          const point1 = planeSource.getPoint1();
          const point2 = planeSource.getPoint2();
          
          const planeWidth = point1[0] - origin[0];
          const planeHeight = point2[1] - origin[1];
          
          const u = (worldCoord[0] - origin[0]) / planeWidth;
          const v = (worldCoord[1] - origin[1]) / planeHeight;
          
          const pixelX = Math.round(u * width);
          const pixelY = Math.round(v * height);
          
          if (pixelX < 0 || pixelX >= width || pixelY < 0 || pixelY >= height) return;
          
          let pixelValue = null;
          if (isGrayscale && pixelData) {
            const index = pixelY * width + pixelX;
            pixelValue = pixelData[index];
          }
          
          addPointActor(worldCoord, { x: pixelX, y: pixelY }, pixelValue);
        }
      });

      interactor.onMouseMove((callData) => {
        if (isDrawingRef.current && drawModeRef.current) {
          const pos = callData.position;
          const view = renderWindow.getViews()[0];
          const worldCoord = view.displayToWorld(pos.x, pos.y, 0, renderer);
          continueDrawing(worldCoord);
        }
      });

      interactor.onLeftButtonRelease(() => {
        if (isDrawingRef.current && drawModeRef.current) {
          finishDrawing();
        }
      });

      interactor.onMouseWheel((callData) => {
        const delta = callData.spinY > 0 ? 1.1 : 0.9;
        const currentScale = camera.getParallelScale();
        camera.setParallelScale(currentScale * delta);
        updatePointSizes();
        renderWindow.render();
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
      updatePointSizes();
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
          style={{ ...buttonStyle, backgroundColor: pointMode ? "#2196f3" : "#333" }}
          onClick={() => {
            const newPointMode = !pointMode;
            setPointMode(newPointMode);
            pointModeRef.current = newPointMode;
            if (newPointMode) {
              setDrawMode(false);
              drawModeRef.current = false;
            }
          }}
        >
          📍 Punto {pointMode ? "ON" : "OFF"}
        </button>

        {pointMode && (
          <select 
            value={pointColor.join(',')} 
            onChange={(e) => {
              const newColor = e.target.value.split(',').map(Number);
              console.log("Cambiando color de punto a:", newColor);
              setPointColor(newColor);
              pointColorRef.current = newColor; // Actualizar el ref también
            }}
            style={{ ...buttonStyle, cursor: "pointer" }}
          >
            <option value="1,0,0">🔴 Rojo</option>
            <option value="0,1,0">🟢 Verde</option>
            <option value="0,0,1">🔵 Azul</option>
            <option value="1,1,0">🟡 Amarillo</option>
            <option value="1,0,1">🟣 Magenta</option>
            <option value="0,1,1">🔵 Cian</option>
            <option value="1,1,1">⚪ Blanco</option>
          </select>
        )}

        <button
          style={{ ...buttonStyle, backgroundColor: drawMode ? "#4caf50" : "#333" }}
          onClick={() => {
            const newDrawMode = !drawMode;
            setDrawMode(newDrawMode);
            drawModeRef.current = newDrawMode;
            if (newDrawMode) {
              setPointMode(false);
              pointModeRef.current = false;
            }
          }}
        >
          ✏️ Lápiz {drawMode ? "ON" : "OFF"}
        </button>

        {drawMode && (
          <>
            <select 
              value={drawColor.join(',')}
              onChange={(e) => {
                const newColor = e.target.value.split(',').map(Number);
                console.log("Cambiando color de lápiz a:", newColor);
                setDrawColor(newColor);
                drawColorRef.current = newColor; // Actualizar el ref también
              }}
              style={{ ...buttonStyle, cursor: "pointer" }}
            >
              <option value="1,0,0">🔴 Rojo</option>
              <option value="0,1,0">🟢 Verde</option>
              <option value="0,0,1">🔵 Azul</option>
              <option value="1,1,0">🟡 Amarillo</option>
              <option value="1,0,1">🟣 Magenta</option>
              <option value="0,1,1">🔵 Cian</option>
              <option value="1,1,1">⚪ Blanco</option>
            </select>
            <select 
              value={lineWidth} 
              onChange={(e) => {
                const newWidth = Number(e.target.value);
                setLineWidth(newWidth);
                lineWidthRef.current = newWidth; // Actualizar el ref también
              }}
              style={{ ...buttonStyle, cursor: "pointer" }}
            >
              <option value="1">Fino</option>
              <option value="2">Normal</option>
              <option value="3">Grueso</option>
              <option value="5">Muy Grueso</option>
            </select>
          </>
        )}

        {points.length > 0 && (
          <>
            <button onClick={removeLastPoint} style={buttonStyle}>
              Eliminar Último Punto
            </button>
            <button onClick={clearAllPoints} style={buttonStyle}>
              Limpiar Puntos
            </button>
          </>
        )}

        {drawings.length > 0 && (
          <>
            <button onClick={removeLastDrawing} style={buttonStyle}>
              Eliminar Último Trazo
            </button>
            <button onClick={clearAllDrawings} style={buttonStyle}>
              Limpiar Trazos
            </button>
          </>
        )}

        <span style={{ marginLeft: "auto", color: "#fff", fontSize: "13px" }}>
          {imageFile.filename}
        </span>
      </div>

      {/* Panel lateral de información */}
      {(points.length > 0 || drawings.length > 0) && (
        <div style={{
          position: "absolute", top: "60px", right: "10px",
          background: "rgba(0,0,0,0.85)", padding: "10px",
          borderRadius: "5px", color: "#fff", fontSize: "12px",
          maxHeight: "calc(100vh - 150px)", overflowY: "auto",
          minWidth: "200px", zIndex: 100
        }}>
          {points.length > 0 && (
            <>
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
            </>
          )}
          
          {drawings.length > 0 && (
            <>
              <div style={{ fontWeight: "bold", marginTop: "12px", marginBottom: "8px", fontSize: "14px" }}>
                Trazos ({drawings.length})
              </div>
              {drawings.map((drawing, index) => (
                <div key={drawing.id} style={{
                  padding: "6px", marginBottom: "5px",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "3px", borderLeft: "3px solid #4caf50"
                }}>
                  <div style={{ fontWeight: "bold", color: "#4caf50" }}>
                    Trazo {index + 1}
                  </div>
                  <div>Puntos: {drawing.numPoints}</div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Ayuda en la esquina inferior */}
      <div style={{
        position: "absolute", bottom: "10px", left: "10px",
        background: "rgba(0,0,0,0.7)", padding: "8px 12px",
        borderRadius: "5px", color: "#aaa", fontSize: "11px",
        zIndex: 100
      }}>
        {drawMode ? (
          <span style={{ color: "#4caf50", fontWeight: "bold" }}>
            🖱️ Click izq + arrastrar: Dibujar
          </span>
        ) : pointMode ? (
          <span style={{ color: "#2196f3", fontWeight: "bold" }}>
            🖱️ Click izq: Colocar punto
          </span>
        ) : (
          <>🖱️ Rueda: Zoom | Click der: Pan</>
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