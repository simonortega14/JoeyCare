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
import "./viewer.css";

function ImageViewer({
  imageFile,
  onClose,
  isEmbedded = false,
  side = null,
  externalPointMode = false,
  externalDrawMode = false,
  externalPointColor = [1, 0, 0],
  externalDrawColor = [1, 0, 0],
  externalLineWidth = 2,
}) {
  const vtkContainerRef = useRef(null);
  const context = useRef(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [windowLevel, setWindowLevel] = useState({
    width: 256,
    center: 128,
  });
  const [isMounted, setIsMounted] = useState(false);

  // ======== Estados para widgets de puntos ========
  const [pointMode, setPointMode] = useState(false);
  const pointModeRef = useRef(false);
  const [points, setPoints] = useState([]);
  const pointActors = useRef([]);

  // ======== Estados para el lápiz / dibujos ========
  const [drawMode, setDrawMode] = useState(false);
  const drawModeRef = useRef(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false);
  const [drawings, setDrawings] = useState([]);
  const drawingActors = useRef([]);
  const currentDrawing = useRef({
    points: [],
    actor: null,
    mapper: null,
    polyData: null,
  });

  const [drawColor, setDrawColor] = useState([1, 0, 0]);
  const drawColorRef = useRef([1, 0, 0]);
  const [lineWidth, setLineWidth] = useState(2);
  const lineWidthRef = useRef(2);
  const [pointColor, setPointColor] = useState([1, 0, 0]);
  const pointColorRef = useRef([1, 0, 0]);

  // marcar montado
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  // sync con props externas si está embed
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
  }, [
    isEmbedded,
    externalPointMode,
    externalDrawMode,
    externalPointColor,
    externalDrawColor,
    externalLineWidth,
  ]);

  // listeners globales para modo comparador embebido (izq/der)
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
      if (
        context.current &&
        context.current.isGrayscale &&
        context.current.rawPixelData
      ) {
        const pixelData = context.current.rawPixelData;
        let min = Infinity,
          max = -Infinity;
        for (let i = 0; i < pixelData.length; i++) {
          if (pixelData[i] < min) min = pixelData[i];
          if (pixelData[i] > max) max = pixelData[i];
        }
        setWindowLevel({
          width: max - min,
          center: min + (max - min) / 2,
        });
      }
    };

    const handleClearPoints = (e) => {
      const targetSide = e.detail.side;
      if (targetSide === "both" || targetSide === side) {
        clearAllPoints();
      }
    };

    const handleClearDrawings = (e) => {
      const targetSide = e.detail.side;
      if (targetSide === "both" || targetSide === side) {
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

    window.addEventListener("resetView", handleResetView);
    window.addEventListener("autoWindowLevel", handleAutoWL);
    window.addEventListener("clearPoints", handleClearPoints);
    window.addEventListener("clearDrawings", handleClearDrawings);
    window.addEventListener("setPointMode", handleSetPointMode);
    window.addEventListener("setDrawMode", handleSetDrawMode);
    window.addEventListener("setPointColor", handleSetPointColor);
    window.addEventListener("setDrawColor", handleSetDrawColor);
    window.addEventListener("setLineWidth", handleSetLineWidth);

    return () => {
      window.removeEventListener("resetView", handleResetView);
      window.removeEventListener("autoWindowLevel", handleAutoWL);
      window.removeEventListener("clearPoints", handleClearPoints);
      window.removeEventListener("clearDrawings", handleClearDrawings);
      window.removeEventListener("setPointMode", handleSetPointMode);
      window.removeEventListener("setDrawMode", handleSetDrawMode);
      window.removeEventListener("setPointColor", handleSetPointColor);
      window.removeEventListener("setDrawColor", handleSetDrawColor);
      window.removeEventListener("setLineWidth", handleSetLineWidth);
    };
  }, [isEmbedded, side]);

  // carga inicial de imagen cuando cambia imageFile
  useEffect(() => {
    if (!imageFile || !vtkContainerRef.current || !isMounted) return;

    console.log("=== CARGANDO IMAGEN ===");
    console.log("imageFile recibido:", imageFile);
    console.log("isEmbedded:", isEmbedded);

    // limpiar contenedor VTK por si había algo anterior
    if (vtkContainerRef.current) {
      vtkContainerRef.current.innerHTML = "";
    }

    // pequeño delay en modo embebido para evitar race layout
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
  }, [imageFile, isMounted, isEmbedded]);

  // actualizar W/L cuando windowLevel cambia (solo escala para grayscale)
  useEffect(() => {
    if (
      context.current &&
      context.current.isGrayscale &&
      context.current.rawPixelData
    ) {
      updateWindowLevel();
    }
  }, [windowLevel]);

  // ================== Utilidades internas ==================

  const getMimeType = (filename) => {
    const ext = filename.split(".").pop().toLowerCase();
    const mimeTypes = {
      dcm: "application/dicom",
      dicom: "application/dicom",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
    };
    return mimeTypes[ext] || "application/octet-stream";
  };

  const updateWindowLevel = () => {
    if (
      !context.current?.rawPixelData ||
      !context.current?.texture ||
      !context.current?.renderWindow
    )
      return;

    const {
      rawPixelData,
      width,
      height,
      texture,
      renderWindow,
    } = context.current;
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

  // Añade una marca/punto (📍)
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
      color: [...currentColor],
    };

    pointActors.current.push(pointData);

    setPoints((prev) => [
      ...prev,
      {
        id: pointData.id,
        pixel: pixelPos,
        value: pixelValue,
      },
    ]);

    renderWindow.render();
  };

  // Inicia un trazo a mano alzada
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
      width: currentWidth,
    };

    isDrawingRef.current = true;
    setIsDrawing(true);

    if (context.current) {
      context.current.renderWindow.render();
    }
  };

  // Continúa el trazo a mano alzada
  const continueDrawing = (worldPos) => {
    if (!isDrawingRef.current || !currentDrawing.current) return;
    if (
      !currentDrawing.current.polyData ||
      !currentDrawing.current.worldPoints
    )
      return;

    const { worldPoints, vtkPoints, lines, polyData } =
      currentDrawing.current;

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

  // Termina el trazo actual
  const finishDrawing = () => {
    if (!isDrawingRef.current || !currentDrawing.current) return;
    if (!currentDrawing.current.actor || !currentDrawing.current.worldPoints)
      return;

    if (currentDrawing.current.worldPoints.length > 1) {
      const drawingData = {
        id: Date.now(),
        actor: currentDrawing.current.actor,
        mapper: currentDrawing.current.mapper,
        polyData: currentDrawing.current.polyData,
        points: [...currentDrawing.current.worldPoints],
        color: currentDrawing.current.color,
        width: currentDrawing.current.width,
      };

      drawingActors.current.push(drawingData);

      setDrawings((prev) => [
        ...prev,
        {
          id: drawingData.id,
          numPoints: drawingData.points.length,
        },
      ]);
    } else {
      // si el dibujo tiene un solo punto, bórralo
      if (context.current) {
        context.current.renderer.removeActor(currentDrawing.current.actor);
        currentDrawing.current.actor.delete();
      }
    }

    currentDrawing.current = {
      worldPoints: [],
      actor: null,
      mapper: null,
      polyData: null,
    };
    isDrawingRef.current = false;
    setIsDrawing(false);
  };

  const removeLastDrawing = () => {
    if (!context.current || drawingActors.current.length === 0) return;

    const { renderer, renderWindow } = context.current;
    const lastDrawing = drawingActors.current.pop();

    renderer.removeActor(lastDrawing.actor);
    lastDrawing.actor.delete();

    setDrawings((prev) => prev.slice(0, -1));
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

    setPoints((prev) => prev.slice(0, -1));
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

  // ================== Cargar y renderizar imagen ==================

  const loadAndRenderImage = async () => {
    if (!vtkContainerRef.current) {
      console.error("Container ref no disponible");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // preferimos una URL directa si nos la pasaron desde el selector,
      // si no, caemos al endpoint /api/visualizador/uploads/:filename
      const directUrl =
        imageFile.directUrl ||
        imageFile.fullUrl || // por si la prop se llama diferente
        null;
      const fallbackName = imageFile.filepath || imageFile.filename;

      const fetchUrl = directUrl
        ? directUrl
        : `/api/visualizador/uploads/${fallbackName}`;

      const token = localStorage.getItem("token") || "";

      console.log("[VIEWER] Fetching:", fetchUrl);

      const response = await fetch(fetchUrl, {
        headers: {
          Accept: "application/octet-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      console.log(
        "[VIEWER] response status:",
        response.status,
        response.statusText
      );
      console.log(
        "[VIEWER] Content-Type:",
        response.headers.get("Content-Type")
      );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status} (${response.statusText}) al descargar imagen`
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log("[VIEWER] arrayBuffer bytes:", arrayBuffer.byteLength);

      if (!arrayBuffer.byteLength || arrayBuffer.byteLength < 200) {
        console.warn(
          "[VIEWER] El archivo es muy pequeño, puede que no sea un DICOM válido (quizá es HTML de error)."
        );
      }

      const file = new File([arrayBuffer], fallbackName, {
        type: getMimeType(fallbackName),
      });

      // Lee el binario con itk-wasm
      const result = await readImage(file);
      const itkImage = result.image;

      const width = itkImage.size[0];
      const height = itkImage.size[1];
      const pixelData = itkImage.data;
      const isRGB = itkImage.imageType.components === 3;
      const isGrayscale = itkImage.imageType.components === 1;

      // guardamos W/L inicial si es gris
      if (isGrayscale) {
        let min = Infinity,
          max = -Infinity;
        for (let i = 0; i < pixelData.length; i++) {
          if (pixelData[i] < min) min = pixelData[i];
          if (pixelData[i] > max) max = pixelData[i];
        }
        const initialWidth = max - min;
        const initialCenter = min + initialWidth / 2;
        setWindowLevel({ width: initialWidth, center: initialCenter });
      }

      // Creamos un canvas con el frame renderizado a RGBA
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      const imageData = ctx.createImageData(width, height);

      if (isRGB) {
        // RGB directo
        for (let i = 0; i < width * height; i++) {
          imageData.data[i * 4] = pixelData[i * 3];
          imageData.data[i * 4 + 1] = pixelData[i * 3 + 1];
          imageData.data[i * 4 + 2] = pixelData[i * 3 + 2];
          imageData.data[i * 4 + 3] = 255;
        }
      } else {
        // escala de grises -> duplicar valor en R,G,B
        for (let i = 0; i < width * height; i++) {
          const value = pixelData[i];
          imageData.data[i * 4] = value;
          imageData.data[i * 4 + 1] = value;
          imageData.data[i * 4 + 2] = value;
          imageData.data[i * 4 + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // === A partir de acá montamos la escena VTK 2D ===

      // 1. FullScreenRenderer (o contenedor custom si es embedded)
      const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
        rootContainer: vtkContainerRef.current,
        containerStyle: {
          width: "100%",
          height: "100%",
          position: "absolute",
          overflow: "hidden",
        },
        background: [0, 0, 0],
      });

      const renderWindow = fullScreenRenderer.getRenderWindow();
      const renderer = fullScreenRenderer.getRenderer();

      // 2. Creamos un plano 2D del tamaño de la imagen
      const planeSource = vtkPlaneSource.newInstance({
        XResolution: 1,
        YResolution: 1,
      });

      // ajustamos el plano para que coincida con el tamaño px
      planeSource.setOrigin(0, 0, 0);
      planeSource.setPoint1(width, 0, 0);
      planeSource.setPoint2(0, height, 0);

      // 3. Creamos una textura VTK con el canvas
      const texture = vtkTexture.newInstance();
      texture.setInterpolate(true); // suavizado
      texture.setCanvas(canvas); // <- truco importante

      // 4. Mapper + Actor para dibujar el plano con textura
      const mapper = vtkMapper.newInstance();
      mapper.setInputConnection(planeSource.getOutputPort());

      const actor = vtkActor.newInstance();
      actor.setMapper(mapper);
      actor.setTexture(texture);

      renderer.addActor(actor);

      // 5. Cámara ortográfica "vista desde arriba"
      renderer.resetCamera();
      const camera = renderer.getActiveCamera();
      camera.setParallelProjection(true);

      // centramos la imagen en la vista
      // ojo: VTK pone (0,0) al centro por defecto. Ajustamos para que
      // toda la imagen quede visible y no espejada.
      const centerX = width / 2;
      const centerY = height / 2;
      camera.setFocalPoint(centerX, centerY, 0);
      camera.setPosition(centerX, centerY, 100); // alejado en Z
      camera.setViewUp(0, -1, 0); // <- importante: controla "arriba vs abajo"
      // si te sale invertida verticalmente, cambia a camera.setViewUp(0, 1, 0)

      renderer.resetCamera();

      // 6. Interactor estilo imagen (pan/zoom)
      const interactor = renderWindow.getInteractor();
      const interactorStyle = vtkInteractorStyleImage.newInstance();
      interactor.setInteractorStyle(interactorStyle);

      // Guardar info en context para herramientas
      context.current = {
        fullScreenRenderer,
        renderWindow,
        renderer,
        camera,
        texture,
        rawPixelData: isGrayscale ? pixelData : null,
        width,
        height,
        isGrayscale,
      };

      // Eventos de interacción para puntos / dibujo
      const domEl = vtkContainerRef.current;
      let isLeftDown = false;

      const getWorldCoordsFromEvent = (ev) => {
        // posición relativa dentro del canvas vtk
        const rect = domEl.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        const y = ev.clientY - rect.top;

        // necesitamos convertir pixel pantalla -> coords imagen
        // Truco simple en proyección paralela:
        // mapeamos pantalla al "mundo" usando la cámara actual
        const [fpx, fpy, fpz] = camera.getFocalPoint();
        const parallelScale = camera.getParallelScale(); // mitad del alto visible
        const viewHeight = parallelScale * 2;
        const viewWidth = (viewHeight * rect.width) / rect.height;

        // esquinas visibles en coords mundo:
        const left = fpx - viewWidth / 2;
        const bottom = fpy - viewHeight / 2;

        // pos mundo (plano Z=0)
        const worldX = left + (x / rect.width) * viewWidth;
        const worldY = bottom + ((rect.height - y) / rect.height) * viewHeight;

        return [worldX, worldY, 0];
      };

      const handleMouseDown = (ev) => {
        if (ev.button !== 0) return; // solo click izq
        isLeftDown = true;

        // modo punto
        if (pointModeRef.current && !drawModeRef.current) {
          const worldPos = getWorldCoordsFromEvent(ev);
          const rect = domEl.getBoundingClientRect();
          const xPix = Math.round(
            ((worldPos[0] / width) * width)
          ); // aproximación
          const yPix = Math.round(
            ((worldPos[1] / height) * height)
          );

          let pixelValue = null;
          if (context.current.isGrayscale && context.current.rawPixelData) {
            const px = Math.round(worldPos[0]);
            const py = Math.round(worldPos[1]);
            if (
              px >= 0 &&
              px < context.current.width &&
              py >= 0 &&
              py < context.current.height
            ) {
              const idx = py * context.current.width + px;
              pixelValue = context.current.rawPixelData[idx] ?? null;
            }
          }

          addPointActor(
            worldPos,
            { x: xPix, y: yPix },
            pixelValue !== undefined ? pixelValue : null
          );
        }

        // modo dibujo
        if (drawModeRef.current && !pointModeRef.current) {
          const worldPos = getWorldCoordsFromEvent(ev);
          startDrawing(worldPos);
        }
      };

      const handleMouseMove = (ev) => {
        if (!isLeftDown) return;
        if (!drawModeRef.current) return;
        if (!isDrawingRef.current) return;

        const worldPos = getWorldCoordsFromEvent(ev);
        continueDrawing(worldPos);
      };

      const handleMouseUp = (ev) => {
        if (ev.button !== 0) return;
        isLeftDown = false;
        if (drawModeRef.current && isDrawingRef.current) {
          finishDrawing();
        }
      };

      domEl.addEventListener("mousedown", handleMouseDown);
      domEl.addEventListener("mousemove", handleMouseMove);
      domEl.addEventListener("mouseup", handleMouseUp);
      domEl.addEventListener("mouseleave", handleMouseUp);

      // cleanup listeners cuando desmontemos ESTE render
      context.current.cleanupDomListeners = () => {
        domEl.removeEventListener("mousedown", handleMouseDown);
        domEl.removeEventListener("mousemove", handleMouseMove);
        domEl.removeEventListener("mouseup", handleMouseUp);
        domEl.removeEventListener("mouseleave", handleMouseUp);
      };

      setLoading(false);
    } catch (err) {
      console.error("[VIEWER] Error cargando imagen:", err);
      setError(`Error: ${err.message}`);
      setLoading(false);
    }
  };

  // ================== Helpers toolbar ==================

  const handleResetView = () => {
    if (context.current) {
      context.current.renderer.resetCamera();
      updatePointSizes();
      context.current.renderWindow.render();
    }
  };

  const handleAutoWindowLevel = () => {
    if (
      context.current &&
      context.current.isGrayscale &&
      context.current.rawPixelData
    ) {
      const pixelData = context.current.rawPixelData;
      let min = Infinity,
        max = -Infinity;
      for (let i = 0; i < pixelData.length; i++) {
        if (pixelData[i] < min) min = pixelData[i];
        if (pixelData[i] > max) max = pixelData[i];
      }
      setWindowLevel({ width: max - min, center: min + (max - min) / 2 });
    }
  };

  // ================== Render ==================

  if (!isMounted) {
    return null;
  }

  return (
    <div
      className={isEmbedded ? "vtk-embedded" : "vtk-fullscreen"}
      style={
        isEmbedded
          ? {
              height: "100%",
              display: "flex",
              flexDirection: "column",
              position: "relative",
            }
          : {
              width: "100%",
              height: "100vh",
              position: "relative",
              background: "#000",
              overflow: "hidden",
            }
      }
    >
      {/* Toolbar superior - SOLO si NO está embedded */}
      {!isEmbedded && (
        <div
          style={{
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
            flexWrap: "wrap",
          }}
        >
          <button onClick={onClose} style={buttonStyle}>
            ← Volver
          </button>

          <button onClick={handleResetView} style={buttonStyle}>
            Reset View
          </button>

          {context.current?.isGrayscale && (
            <>
              <button onClick={handleAutoWindowLevel} style={buttonStyle}>
                Auto W/L
              </button>
              <span style={{ color: "#fff", fontSize: "13px" }}>
                W: {Math.round(windowLevel.width)} | L:{" "}
                {Math.round(windowLevel.center)}
              </span>
            </>
          )}

          {/* Herramienta de puntos */}
          <button
            style={{
              ...buttonStyle,
              backgroundColor: pointMode ? "#2196f3" : "#333",
            }}
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
              value={pointColor.join(",")}
              onChange={(e) => {
                const newColor = e.target.value.split(",").map(Number);
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

          {/* Herramienta de dibujo */}
          <button
            style={{
              ...buttonStyle,
              backgroundColor: drawMode ? "#4caf50" : "#333",
            }}
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
                value={drawColor.join(",")}
                onChange={(e) => {
                  const newColor = e.target.value.split(",").map(Number);
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

          {/* Botones para limpiar anotaciones */}
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

          {/* Nombre del archivo */}
          <span
            style={{
              marginLeft: "auto",
              color: "#fff",
              fontSize: "13px",
              maxWidth: "40%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={imageFile.filepath || imageFile.filename}
          >
            {imageFile.filepath || imageFile.filename}
          </span>
        </div>
      )}

      {/* Panel lateral de información (puntos / trazos) */}
      {!isEmbedded && (points.length > 0 || drawings.length > 0) && (
        <div
          style={{
            position: "absolute",
            top: "60px",
            right: "10px",
            background: "rgba(0,0,0,0.85)",
            padding: "10px",
            borderRadius: "5px",
            color: "#fff",
            fontSize: "12px",
            maxHeight: "calc(100vh - 150px)",
            overflowY: "auto",
            minWidth: "200px",
            zIndex: 100,
          }}
        >
          {points.length > 0 && (
            <>
              <div
                style={{
                  fontWeight: "bold",
                  marginBottom: "8px",
                  fontSize: "14px",
                }}
              >
                Puntos ({points.length})
              </div>
              {points.map((point, index) => (
                <div
                  key={point.id}
                  style={{
                    padding: "6px",
                    marginBottom: "5px",
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: "3px",
                    borderLeft: "3px solid #2196f3",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "bold",
                      color: "#2196f3",
                    }}
                  >
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
              <div
                style={{
                  fontWeight: "bold",
                  marginTop: "12px",
                  marginBottom: "8px",
                  fontSize: "14px",
                }}
              >
                Trazos ({drawings.length})
              </div>
              {drawings.map((drawing, index) => (
                <div
                  key={drawing.id}
                  style={{
                    padding: "6px",
                    marginBottom: "5px",
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: "3px",
                    borderLeft: "3px solid #4caf50",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "bold",
                      color: "#4caf50",
                    }}
                  >
                    Trazo {index + 1}
                  </div>
                  <div>Puntos: {drawing.numPoints}</div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Ayuda en esquina inferior */}
      {!isEmbedded && (
        <div
          style={{
            position: "absolute",
            bottom: "10px",
            left: "10px",
            background: "rgba(0,0,0,0.7)",
            padding: "8px 12px",
            borderRadius: "5px",
            color: "#aaa",
            fontSize: "11px",
            zIndex: 100,
          }}
        >
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

      {/* Loading overlay */}
      {loading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "white",
            fontSize: "20px",
            backgroundColor: "rgba(0,0,0,0.7)",
            padding: "20px",
            borderRadius: "8px",
            zIndex: 1000,
          }}
        >
          Cargando imagen...
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "red",
            fontSize: "16px",
            textAlign: "center",
            padding: "20px",
            backgroundColor: "rgba(0,0,0,0.8)",
            borderRadius: "8px",
            zIndex: 1000,
            maxWidth: "80%",
          }}
        >
          {error}
        </div>
      )}

      {/* Contenedor VTK */}
      <div
        ref={vtkContainerRef}
        style={
          isEmbedded
            ? {
                flex: 1,
                width: "100%",
                height: "100%",
                position: "relative",
                minHeight: "400px",
              }
            : {
                width: "100%",
                height: "100%",
                position: "absolute",
                top: 0,
                left: 0,
              }
        }
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
  fontWeight: "500",
};

export default ImageViewer;
