import { useRef, useEffect, useState, useCallback } from "react";
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
import "./viewer.css";

function ImageViewer({ imageFile, onClose, user, isEmbedded = false, side = null, externalPointMode = false, externalDrawMode = false, externalPointColor = [1, 0, 0], externalDrawColor = [1, 0, 0], externalLineWidth = 2 }) {
  const vtkContainerRef = useRef(null);
  const context = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [windowLevel, setWindowLevel] = useState({ width: 256, center: 128 });
  const [isMounted, setIsMounted] = useState(false);
  
  // Estados para widgets
  const [pointMode, setPointMode] = useState(false);
  const pointModeRef = useRef(false);
  const [points, setPoints] = useState([]);
  const pointActors = useRef([]);

  // Estados para el lápiz
  const [drawMode, setDrawMode] = useState(false);
  const drawModeRef = useRef(false);
  const isDrawingRef = useRef(false);
  const [drawings, setDrawings] = useState([]);
  const drawingActors = useRef([]);
  const currentDrawing = useRef({ points: [], actor: null, mapper: null, polyData: null });
  const [drawColor, setDrawColor] = useState([1, 0, 0]);
  const drawColorRef = useRef([1, 0, 0]);
  const [lineWidth, setLineWidth] = useState(2);
  const lineWidthRef = useRef(2);
  const [pointColor, setPointColor] = useState([1, 0, 0]);
  const pointColorRef = useRef([1, 0, 0]);

  // Estados para el reporte
   const [showReportModal, setShowReportModal] = useState(false);
   const [titulo, setTitulo] = useState('');
   const [contenido, setContenido] = useState('');
   const [hallazgos, setHallazgos] = useState('');
   const [conclusion, setConclusion] = useState('');
   const [recomendaciones, setRecomendaciones] = useState('');
   const [firmaMedico, setFirmaMedico] = useState('');
   const [isEditing, setIsEditing] = useState(false);

  // Efecto para marcar el componente como montado
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  // Efecto para sincronizar con props externas en modo embedded
  useEffect(() => {
    if (isEmbedded) {
      setPointMode(externalPointMode);
      pointModeRef.current = externalPointMode;
      setDrawMode(externalDrawMode);
      drawModeRef.current = externalDrawMode;
      setPointColor(externalPointColor);
      pointColorRef.current = externalPointColor;
      setDrawColor(externalDrawColor);
      drawColorRef.current = externalDrawColor;
      setLineWidth(externalLineWidth);
      lineWidthRef.current = externalLineWidth;
    }
  }, [isEmbedded, externalPointMode, externalDrawMode, externalPointColor, externalDrawColor, externalLineWidth]);

  // Efecto para escuchar eventos globales en modo embedded
  useEffect(() => {
    if (!isEmbedded || !side) return;

    const handleResetView = () => {
      if (context.current) {
        context.current.renderer.resetCamera();
        updatePointSizes();
        context.current.renderWindow.render();
      }
    };

    const handleAutoWL = () => {
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

    const handleClearPoints = (e) => {
      const targetSide = e.detail.side;
      if (targetSide === 'both' || targetSide === side) {
        clearAllPoints();
      }
    };

    const handleClearDrawings = (e) => {
      const targetSide = e.detail.side;
      if (targetSide === 'both' || targetSide === side) {
        clearAllDrawings();
      }
    };

    const handleSetPointMode = (e) => {
      const enabled = e.detail.enabled;
      setPointMode(enabled);
      pointModeRef.current = enabled;
      if (enabled) {
        setDrawMode(false);
        drawModeRef.current = false;
      }
    };

    const handleSetDrawMode = (e) => {
      const enabled = e.detail.enabled;
      setDrawMode(enabled);
      drawModeRef.current = enabled;
      if (enabled) {
        setPointMode(false);
        pointModeRef.current = false;
      }
    };

    const handleSetPointColor = (e) => {
      const color = e.detail.color;
      setPointColor(color);
      pointColorRef.current = color;
    };

    const handleSetDrawColor = (e) => {
      const color = e.detail.color;
      setDrawColor(color);
      drawColorRef.current = color;
    };

    const handleSetLineWidth = (e) => {
      const width = e.detail.width;
      setLineWidth(width);
      lineWidthRef.current = width;
    };

    window.addEventListener('resetView', handleResetView);
    window.addEventListener('autoWindowLevel', handleAutoWL);
    window.addEventListener('clearPoints', handleClearPoints);
    window.addEventListener('clearDrawings', handleClearDrawings);
    window.addEventListener('setPointMode', handleSetPointMode);
    window.addEventListener('setDrawMode', handleSetDrawMode);
    window.addEventListener('setPointColor', handleSetPointColor);
    window.addEventListener('setDrawColor', handleSetDrawColor);
    window.addEventListener('setLineWidth', handleSetLineWidth);

    return () => {
      window.removeEventListener('resetView', handleResetView);
      window.removeEventListener('autoWindowLevel', handleAutoWL);
      window.removeEventListener('clearPoints', handleClearPoints);
      window.removeEventListener('clearDrawings', handleClearDrawings);
      window.removeEventListener('setPointMode', handleSetPointMode);
      window.removeEventListener('setDrawMode', handleSetDrawMode);
      window.removeEventListener('setPointColor', handleSetPointColor);
      window.removeEventListener('setDrawColor', handleSetDrawColor);
      window.removeEventListener('setLineWidth', handleSetLineWidth);
    };
  }, [isEmbedded, side]);

  const loadAndRenderImage = useCallback(async () => {
    if (!vtkContainerRef.current) {
      console.error("Container ref no disponible");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const filename = imageFile.filepath || imageFile.filename;
      console.log("Cargando archivo:", filename);

      const response = await fetch(`http://localhost:4000/api/uploads/${filename}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();

      const file = new File([arrayBuffer], filename, {
        type: getMimeType(filename)
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
        try {
          context.current.fullScreenRenderer.delete();
        } catch (err) {
          console.error("Error eliminando renderer anterior:", err);
        }
        context.current = null;
      }

      if (!vtkContainerRef.current) {
        console.error("Container fue desmontado durante la carga");
        return;
      }

      const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
        rootContainer: vtkContainerRef.current,
        containerStyle: isEmbedded
          ? { width: "100%", height: "100%", position: "relative" }
          : {
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

      // Configurar eventos de widgets
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

      console.log("Renderizando imagen...");
      renderWindow.render();
      setLoading(false);
      console.log("Imagen cargada exitosamente");
    } catch (err) {
      console.error("Error cargando imagen:", err);
      setError(`Error: ${err.message}`);
      setLoading(false);
    }
  }, [imageFile, isEmbedded]);

  // Efecto principal de carga
  useEffect(() => {
    if (!imageFile || !vtkContainerRef.current || !isMounted) return;

    console.log("=== CARGANDO IMAGEN ===");
    console.log("imageFile:", imageFile);
    console.log("isEmbedded:", isEmbedded);

    if (vtkContainerRef.current) {
      vtkContainerRef.current.innerHTML = '';
    }

    const timer = setTimeout(() => {
      if (isMounted) {
        loadAndRenderImage();
      }
    }, isEmbedded ? 100 : 0);

    return () => {
      clearTimeout(timer);
      cleanupPoints();
      cleanupDrawings();
      if (context.current) {
        try {
          const { fullScreenRenderer, renderWindow } = context.current;
          if (renderWindow) {
            const interactor = renderWindow.getInteractor();
            if (interactor) {
              interactor.unbindEvents();
            }
          }
          if (fullScreenRenderer) {
            fullScreenRenderer.delete();
          }
        } catch (err) {
          console.error("Error durante cleanup:", err);
        }
        context.current = null;
      }
    };
  }, [imageFile, isMounted, isEmbedded, loadAndRenderImage]);

  const updateWindowLevel = useCallback(() => {
    if (!context.current?.rawPixelData || !context.current?.texture || !context.current?.renderWindow) return;

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
  }, [windowLevel]);

  useEffect(() => {
    if (context.current && context.current.isGrayscale && context.current.rawPixelData) {
      updateWindowLevel();
    }
  }, [windowLevel, updateWindowLevel]);

  const cleanupPoints = () => {
    if (!context.current) return;
    
    const { renderer } = context.current;
    pointActors.current.forEach(({ actor }) => {
      try {
        renderer.removeActor(actor);
        actor.delete();
      } catch (err) {
        console.error("Error cleaning point:", err);
      }
    });
    pointActors.current = [];
  };

  const cleanupDrawings = () => {
    if (!context.current) return;
    
    const { renderer } = context.current;
    drawingActors.current.forEach(({ actor }) => {
      try {
        renderer.removeActor(actor);
        actor.delete();
      } catch (err) {
        console.error("Error cleaning drawing:", err);
      }
    });
    drawingActors.current = [];
  };

  const addPointActor = (worldPos, pixelPos, pixelValue) => {
    if (!context.current) return;
    
    const currentColor = pointColorRef.current;
    
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
    
    renderWindow.render();
  };

  const startDrawing = (worldPos) => {
    if (!context.current) return;
    
    const currentColor = drawColorRef.current;
    const currentWidth = lineWidthRef.current;
    
    const { renderer } = context.current;
    
    const worldPoints = [worldPos];
    
    const vtkPointsObj = vtkPoints.newInstance();
    const lines = vtkCellArray.newInstance();
    const polyData = vtkPolyData.newInstance();
    
    const mapper = vtkMapper.newInstance();
    mapper.setInputData(polyData);
    
    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);
    
    const property = actor.getProperty();
    property.setColor(currentColor[0], currentColor[1], currentColor[2]);
    property.setAmbient(1.0);
    property.setDiffuse(1.0);
    property.setSpecular(0.0);
    property.setLineWidth(currentWidth);
    property.setOpacity(1.0);
    property.setLighting(false);
    
    renderer.addActor(actor);
    
    currentDrawing.current = {
      worldPoints,
      actor,
      mapper,
      polyData,
      vtkPoints: vtkPointsObj,
      lines,
      color: [...currentColor],
      width: currentWidth
    };
    
    isDrawingRef.current = true;
    
    if (context.current) {
      context.current.renderWindow.render();
    }
  };

  const continueDrawing = (worldPos) => {
    if (!isDrawingRef.current || !currentDrawing.current) return;
    if (!currentDrawing.current.polyData || !currentDrawing.current.worldPoints) return;
    
    const { worldPoints, vtkPoints, lines, polyData } = currentDrawing.current;
    
    worldPoints.push(worldPos);
    
    vtkPoints.setNumberOfPoints(worldPoints.length);
    
    for (let i = 0; i < worldPoints.length; i++) {
      vtkPoints.setPoint(i, worldPoints[i][0], worldPoints[i][1], 0.02);
    }
    
    lines.initialize();
    
    if (worldPoints.length >= 2) {
      const polylineCell = [worldPoints.length];
      for (let i = 0; i < worldPoints.length; i++) {
        polylineCell.push(i);
      }
      
      lines.insertNextCell(polylineCell);
    }
    
    polyData.setPoints(vtkPoints);
    polyData.setLines(lines);
    polyData.modified();
    
    if (context.current) {
      context.current.renderWindow.render();
    }
  };

  const finishDrawing = () => {
    if (!isDrawingRef.current || !currentDrawing.current) return;
    if (!currentDrawing.current.actor || !currentDrawing.current.worldPoints) return;
    
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
    } else {
      if (context.current) {
        context.current.renderer.removeActor(currentDrawing.current.actor);
        currentDrawing.current.actor.delete();
      }
    }
    
    currentDrawing.current = { worldPoints: [], actor: null, mapper: null, polyData: null };
    isDrawingRef.current = false;
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


  const getMimeType = (filename) => {
    const ext = filename.split(".").pop().toLowerCase();
    const mimeTypes = { dcm: "application/dicom", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" };
    return mimeTypes[ext] || "application/octet-stream";
  };

  const openReportModal = async () => {
    const doctorName = user ? `${user.nombre} ${user.apellido}` : '';
    try {
      const response = await fetch(`http://localhost:4000/api/reportes/${imageFile.id}`);
      if (response.ok) {
        const report = await response.json();
        setIsEditing(true);
        setTitulo(report.titulo || '');
        setContenido(report.contenido || '');
        setHallazgos(report.hallazgos || '');
        setConclusion(report.conclusion || '');
        setRecomendaciones(report.recomendaciones || '');
        setFirmaMedico(doctorName); // Always use current doctor's name
      } else {
        setIsEditing(false);
        setTitulo('');
        setContenido('');
        setHallazgos('');
        setConclusion('');
        setRecomendaciones('');
        setFirmaMedico(doctorName);
      }
    } catch (error) {
      console.error("Error fetching report:", error);
      setIsEditing(false);
      setTitulo('');
      setContenido('');
      setHallazgos('');
      setConclusion('');
      setRecomendaciones('');
      setFirmaMedico(doctorName);
    }
    setShowReportModal(true);
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

  if (!isMounted) {
    return null;
  }

  return (
    <div className={isEmbedded ? "vtk-embedded" : "vtk-fullscreen"}
          style={isEmbedded ? { height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' } :
                { width: "100%", height: "100vh", position: "relative", background: "#000", overflow: "hidden" }}>
      
      {/* Toolbar superior - SOLO si NO está embedded */}
      {!isEmbedded && (
        <div style={{
          position: "absolute", 
          top: 0, 
          left: 0, 
          right: 0, 
          height: "50px",
          background: "rgba(0,0,0,0.8)", 
          display: "flex", 
          alignItems: "center",
          padding: "0 10px", 
          gap: "10px", 
          zIndex: 100, 
          flexWrap: "wrap"
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
          
          {/* Solo mostrar widgets en toolbar si NO está en modo embedded */}
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
                setPointColor(newColor);
                pointColorRef.current = newColor;
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
                  setDrawColor(newColor);
                  drawColorRef.current = newColor;
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
                  lineWidthRef.current = newWidth;
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

          <button onClick={openReportModal} style={buttonStyle}>
            📄 Reporte
          </button>

          <span style={{ marginLeft: "auto", color: "#fff", fontSize: "13px" }}>
            {imageFile.filepath || imageFile.filename}
          </span>
        </div>
      )}

      {/* Panel lateral de información - solo si NO está embedded */}
      {!isEmbedded && (points.length > 0 || drawings.length > 0 || showReportModal) && (
        <div style={{
          position: "absolute", top: "60px", right: "10px",
          background: "rgba(0,0,0,0.85)", padding: "10px",
          borderRadius: "5px", color: "#fff", fontSize: "12px",
          maxHeight: "calc(100vh - 150px)", overflowY: "auto",
          minWidth: "300px", zIndex: 100
        }}>
          {showReportModal && (
            <div style={{ marginBottom: "20px" }}>
               <div style={{ fontWeight: "bold", marginBottom: "15px", fontSize: "16px", color: "#fff" }}>
                 📄 {isEditing ? "Editar Reporte Médico" : "Crear Reporte Médico"}
               </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", color: "#fff" }}>
                  Título:
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Título del reporte..."
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "12px",
                    backgroundColor: "#fff",
                    color: "#333"
                  }}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", color: "#fff" }}>
                  Contenido:
                </label>
                <textarea
                  value={contenido}
                  onChange={(e) => setContenido(e.target.value)}
                  placeholder="Contenido del reporte..."
                  style={{
                    width: "100%",
                    height: "100px",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "12px",
                    resize: "vertical",
                    backgroundColor: "#fff",
                    color: "#333"
                  }}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", color: "#fff" }}>
                  Hallazgos:
                </label>
                <textarea
                  value={hallazgos}
                  onChange={(e) => setHallazgos(e.target.value)}
                  placeholder="Describa los hallazgos..."
                  style={{
                    width: "100%",
                    height: "80px",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "12px",
                    resize: "vertical",
                    backgroundColor: "#fff",
                    color: "#333"
                  }}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", color: "#fff" }}>
                  Conclusión:
                </label>
                <textarea
                  value={conclusion}
                  onChange={(e) => setConclusion(e.target.value)}
                  placeholder="Conclusión del reporte..."
                  style={{
                    width: "100%",
                    height: "80px",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "12px",
                    resize: "vertical",
                    backgroundColor: "#fff",
                    color: "#333"
                  }}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", color: "#fff" }}>
                  Recomendaciones:
                </label>
                <textarea
                  value={recomendaciones}
                  onChange={(e) => setRecomendaciones(e.target.value)}
                  placeholder="Recomendaciones médicas..."
                  style={{
                    width: "100%",
                    height: "80px",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "12px",
                    resize: "vertical",
                    backgroundColor: "#fff",
                    color: "#333"
                  }}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                 <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", color: "#fff" }}>
                   Firma del Médico:
                 </label>
                 <div
                   style={{
                     width: "100%",
                     minHeight: "50px",
                     padding: "8px",
                     border: "1px solid #ccc",
                     borderRadius: "4px",
                     fontFamily: "Arial, sans-serif",
                     fontSize: "12px",
                     backgroundColor: "#f5f5f5",
                     color: "#333",
                     whiteSpace: "pre-wrap"
                   }}
                 >
                   {firmaMedico}
                 </div>
               </div>

              <button
                onClick={async () => {
                  // Validar que todos los campos estén llenos
                  if (!titulo.trim() || !contenido.trim() || !hallazgos.trim() || !conclusion.trim() || !recomendaciones.trim() || !firmaMedico.trim()) {
                    alert("Todos los campos son obligatorios");
                    return;
                  }

                  try {
                    // Aquí enviar al backend
                    const response = await fetch(`http://localhost:4000/api/reportes`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        ecografia_id: imageFile.id,
                        titulo,
                        contenido,
                        hallazgos,
                        conclusion,
                        recomendaciones,
                        firma_medico: firmaMedico,
                        medico_id: user?.id
                      })
                    });

                    if (response.ok) {
                      alert(isEditing ? "Reporte actualizado exitosamente" : "Reporte firmado exitosamente");
                      setShowReportModal(false);
                      setTitulo('');
                      setContenido('');
                      setHallazgos('');
                      setConclusion('');
                      setRecomendaciones('');
                      setFirmaMedico('');
                      setIsEditing(false);
                    } else {
                      alert("Error al guardar el reporte");
                    }
                  } catch (error) {
                    console.error("Error:", error);
                    alert("Error al guardar el reporte");
                  }
                }}
                style={{
                  ...buttonStyle,
                  backgroundColor: "#4caf50",
                  width: "100%",
                  marginTop: "10px"
                }}
              >
                💾 {isEditing ? "Actualizar Reporte" : "Guardar Reporte"}
              </button>
            </div>
          )}

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

      {/* Ayuda en la esquina inferior - solo si NO está embedded */}
      {!isEmbedded && (
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
      )}

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
        style={isEmbedded ? {
          flex: 1,
          width: '100%',
          height: '100%',
          position: 'relative',
          minHeight: '400px'
        } : {
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