/* eslint-disable */
import { useRef, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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

// =====================
// helpers auth / api
// =====================
const API_BASE = import.meta.env.VITE_API_URL || ""; // Nginx proxy en /
function getToken() {
  return localStorage.getItem("token") || "";
}
function authHeader() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
function getMedicoIdFromToken() {
  try {
    const t = localStorage.getItem("token");
    if (!t) return null;
    const payload = JSON.parse(atob(t.split(".")[1]));
    return payload?.medico_id || payload?.id || null;
  } catch {
    return null;
  }
}

// Log al cargar el módulo (para confirmar que este archivo es el que corre)
console.log("[ImageViewer] módulo cargado");

// =====================
// COMPONENTE
// =====================
export default function ImageViewer({
  imageFile = null,
  ecografiaId: ecografiaIdProp = null,
  neonatoId: neonatoIdProp = null,
  isEmbedded = false,
  side = null,
  externalPointMode = false,
  externalDrawMode = false,
  externalPointColor = [1, 0, 0],
  externalDrawColor = [1, 0, 0],
  externalLineWidth = 2,
}) {
  const navigate = useNavigate();
  const { state } = useLocation() || {};

  // Orígenes: prop, imageFile, state, sessionStorage
  const ecografiaId =
    ecografiaIdProp ??
    imageFile?.id ??
    state?.ecografiaId ??
    JSON.parse(sessionStorage.getItem("viewer:last") || "{}")?.ecografiaId ??
    null;

  const neonatoId =
    neonatoIdProp ??
    imageFile?.neonato_id ??
    state?.neonatoId ??
    JSON.parse(sessionStorage.getItem("viewer:last") || "{}")?.neonatoId ??
    null;

  const medico = state?.medico || "—";
  const timestamp = state?.timestamp || null;

  const hasValidState = !!ecografiaId;

  // refs / estado interno del visor
  const vtkContainerRef = useRef(null);
  const context = useRef(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // window/level
  const [windowLevel, setWindowLevel] = useState({ width: 256, center: 128 });

  // flags
  const [isMounted, setIsMounted] = useState(false);

  // ===== anotación: puntos =====
  const [pointMode, setPointMode] = useState(false);
  const pointModeRef = useRef(false);

  const [points, setPoints] = useState([]); // [{id, pixel:{x,y}, value}]
  const pointActors = useRef([]); // [{actor, sphereSource, ...}]

  // ===== anotación: trazos =====
  const [drawMode, setDrawMode] = useState(false);
  const drawModeRef = useRef(false);

  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false);

  const [drawings, setDrawings] = useState([]); // [{id, numPoints}]
  const drawingActors = useRef([]); // [{id, actor, points, color, width}]
  const currentDrawing = useRef({
    worldPoints: [],
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

  // ===== modal "Reportar" =====
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // lifecycle inicial
  useEffect(() => {
    console.log("[ImageViewer] MONTADO", { ts: Date.now() });
    setIsMounted(true);
    return () => {
      console.log("[ImageViewer] DESMONTADO");
      setIsMounted(false);
    };
  }, []);

  // persistimos ids para recuperar al volver
  useEffect(() => {
    if (ecografiaId || neonatoId) {
      sessionStorage.setItem("viewer:last", JSON.stringify({ ecografiaId, neonatoId }));
    }
  }, [ecografiaId, neonatoId]);

  // sincronizar modos externos si estamos embebidos
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

  // eventos globales solo embebido
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
        let min = Infinity,
          max = -Infinity;
        for (let i = 0; i < pixelData.length; i++) {
          if (pixelData[i] < min) min = pixelData[i];
          if (pixelData[i] > max) max = pixelData[i];
        }
        setWindowLevel({ width: max - min, center: min + (max - min) / 2 });
      }
    };

    const handleClearPoints = (e) => {
      const targetSide = e.detail.side;
      if (targetSide === "both" || targetSide === side) clearAllPoints();
    };
    const handleClearDrawings = (e) => {
      const targetSide = e.detail.side;
      if (targetSide === "both" || targetSide === side) clearAllDrawings();
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

  // cargar imagen
  useEffect(() => {
    if (!hasValidState) return;
    if (!vtkContainerRef.current) return;

    vtkContainerRef.current.innerHTML = "";

    const timer = setTimeout(() => {
      if (isMounted) loadAndRenderImage();
    }, isEmbedded ? 100 : 0);

    return () => {
      clearTimeout(timer);
      cleanupPoints();
      cleanupDrawings();
      cleanupVTK();
      if (context.current) {
        try {
          const { fullScreenRenderer, renderWindow } = context.current;
          if (renderWindow) {
            const interactor = renderWindow.getInteractor();
            if (interactor) interactor.unbindEvents();
          }
          if (fullScreenRenderer) fullScreenRenderer.delete();
        } catch (err) {
          console.error("Error durante cleanup:", err);
        }
        context.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasValidState, isMounted, ecografiaId, isEmbedded]);

  // aplicar W/L
  useEffect(() => {
    if (context.current && context.current.isGrayscale && context.current.rawPixelData) {
      updateWindowLevel();
    }
  }, [windowLevel]);

  // atajo Ctrl/Cmd + S para abrir modal
  useEffect(() => {
    const onKey = (e) => {
      const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s";
      if (isSave) {
        e.preventDefault();
        console.log("[ImageViewer] Abriendo modal (Ctrl/Cmd+S)");
        setShowSaveModal(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Deshabilitar/rehabilitar interactor VTK cuando el modal está abierto
  useEffect(() => {
    const i = context.current?.renderWindow?.getInteractor?.();
    if (!i) return;
    if (showSaveModal) i.disable?.();
    else i.enable?.();
  }, [showSaveModal]);

  // =====================
  // utilidades
  // =====================
  const getMimeTypeFromExt = (filenameGuess) => {
    const ext = filenameGuess?.split(".").pop()?.toLowerCase();
    const map = {
      dcm: "application/dicom",
      dicom: "application/dicom",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
    };
    return map[ext] || "application/octet-stream";
  };

  async function loadAndRenderImage() {
    setLoading(true);
    setError(null);
    try {
      // 1) archivo desde ms-ecografias (via Nginx)
      const resp = await fetch(`/api/ecografias/${encodeURIComponent(ecografiaId)}/archivo`, {
        headers: { ...authHeader() },
      });
      if (!resp.ok) throw new Error(`Error ${resp.status} descargando archivo de la ecografía`);

      const contentType = resp.headers.get("Content-Type") || "application/octet-stream";
      const arrayBuffer = await resp.arrayBuffer();
      const fakeFileName =
        contentType.includes("dicom") || contentType.includes("dcm")
          ? `${ecografiaId}.dcm`
          : contentType.includes("png")
          ? `${ecografiaId}.png`
          : contentType.includes("jpeg") || contentType.includes("jpg")
          ? `${ecografiaId}.jpg`
          : `${ecografiaId}.bin`;

      const file = new File([arrayBuffer], fakeFileName, {
        type: getMimeTypeFromExt(fakeFileName),
      });

      // 2) parsear con itk
      const result = await readImage(file);
      const itkImage = result.image;

      const width = itkImage.size[0];
      const height = itkImage.size[1];
      const pixelData = itkImage.data;
      const isRGB = itkImage.imageType.components === 3;
      const isGrayscale = itkImage.imageType.components === 1;

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

      // 3) canvas 2D
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
          const v = pixelData[i];
          imageData.data[i * 4] = v;
          imageData.data[i * 4 + 1] = v;
          imageData.data[i * 4 + 2] = v;
          imageData.data[i * 4 + 3] = 255;
        }
      }
      ctx.putImageData(imageData, 0, 0);

      // 4) limpiar si había
      if (context.current?.fullScreenRenderer) {
        try {
          context.current.fullScreenRenderer.delete();
        } catch (err) {
          console.error("Error eliminando renderer anterior:", err);
        }
        context.current = null;
      }

      // 5) montar VTK
      if (!vtkContainerRef.current) return;

      const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
        rootContainer: vtkContainerRef.current,
        containerStyle: isEmbedded
          ? { width: "100%", height: "100%", position: "relative" }
          : { width: "100%", height: "100%", position: "absolute", top: 0, left: 0 },
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

      // aspect fit
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

      // eventos
      interactor.onLeftButtonPress((callData) => {
        const pos = callData.position;
        const view = renderWindow.getViews()[0];
        const worldCoord = view.displayToWorld(pos.x, pos.y, 0, renderer);

        if (drawModeRef.current) {
          startDrawing(worldCoord);
        } else if (pointModeRef.current) {
          const origin = planeSource.getOrigin();
          const p1 = planeSource.getPoint1();
          const p2 = planeSource.getPoint2();

          const planeWidth = p1[0] - origin[0];
          const planeHeight = p2[1] - origin[1];

          const u = (worldCoord[0] - origin[0]) / planeWidth;
          const v = (worldCoord[1] - origin[1]) / planeHeight;

          const px = Math.round(u * width);
          const py = Math.round(v * height);
          if (px < 0 || px >= width || py < 0 || py >= height) return;

          let pixelValue = null;
          if (isGrayscale && pixelData) {
            const idx = py * width + px;
            pixelValue = pixelData[idx];
          }
          addPointActor(worldCoord, { x: px, y: py }, pixelValue);
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
        if (isDrawingRef.current && drawModeRef.current) finishDrawing();
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
        interactorStyle,
      };

      renderWindow.render();
      setLoading(false);
    } catch (err) {
      console.error("Error cargando imagen:", err);
      setError(`Error: ${err.message}`);
      setLoading(false);
    }
  }

  function updateWindowLevel() {
    if (!context.current?.rawPixelData || !context.current?.texture || !context.current?.renderWindow) return;

    const { rawPixelData, width, height, texture, renderWindow } = context.current;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const imageData = ctx.createImageData(width, height);

    const minV = windowLevel.center - windowLevel.width / 2;
    const maxV = windowLevel.center + windowLevel.width / 2;
    const range = maxV - minV;

    for (let i = 0; i < rawPixelData.length; i++) {
      let value = rawPixelData[i];
      if (value <= minV) value = 0;
      else if (value >= maxV) value = 255;
      else value = ((value - minV) / range) * 255;

      imageData.data[i * 4] = value;
      imageData.data[i * 4 + 1] = value;
      imageData.data[i * 4 + 2] = value;
      imageData.data[i * 4 + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    texture.setCanvas(canvas);
    renderWindow.render();
  }

  function updatePointSizes() {
    if (!context.current || pointActors.current.length === 0) return;
    const { camera } = context.current;
    const cameraScale = camera.getParallelScale();
    const newRadius = cameraScale * 0.015;
    pointActors.current.forEach(({ sphereSource }) => {
      sphereSource.setRadius(newRadius);
    });
  }

  function addPointActor(worldPos, pixelPos, pixelValue) {
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
    setPoints((prev) => [...prev, { id: pointData.id, pixel: pixelPos, value: pixelValue }]);
    renderWindow.render();
  }

  function startDrawing(worldPos) {
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
    context.current?.renderWindow.render();
  }

  function continueDrawing(worldPos) {
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
      for (let i = 0; i < worldPoints.length; i++) polylineCell.push(i);
      lines.insertNextCell(polylineCell);
    }

    polyData.setPoints(vtkPoints);
    polyData.setLines(lines);
    polyData.modified();

    context.current?.renderWindow.render();
  }

  function finishDrawing() {
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
        width: currentDrawing.current.width,
      };
      drawingActors.current.push(drawingData);
      setDrawings((prev) => [...prev, { id: drawingData.id, numPoints: drawingData.points.length }]);
    } else {
      if (context.current) {
        context.current.renderer.removeActor(currentDrawing.current.actor);
        currentDrawing.current.actor.delete();
      }
    }

    currentDrawing.current = { worldPoints: [], actor: null, mapper: null, polyData: null };
    isDrawingRef.current = false;
    setIsDrawing(false);
  }

  function removeLastDrawing() {
    if (!context.current || drawingActors.current.length === 0) return;
    const { renderer, renderWindow } = context.current;
    const lastDrawing = drawingActors.current.pop();
    renderer.removeActor(lastDrawing.actor);
    lastDrawing.actor.delete();
    setDrawings((prev) => prev.slice(0, -1));
    renderWindow.render();
  }

  function clearAllDrawings() {
    if (!context.current) return;
    const { renderer, renderWindow } = context.current;
    drawingActors.current.forEach(({ actor }) => {
      renderer.removeActor(actor);
      actor.delete();
    });
    drawingActors.current = [];
    setDrawings([]);
    renderWindow.render();
  }

  function removeLastPoint() {
    if (!context.current || pointActors.current.length === 0) return;
    const { renderer, renderWindow } = context.current;
    const lastPoint = pointActors.current.pop();
    renderer.removeActor(lastPoint.actor);
    lastPoint.actor.delete();
    setPoints((prev) => prev.slice(0, -1));
    renderWindow.render();
  }

  function clearAllPoints() {
    if (!context.current) return;
    const { renderer, renderWindow } = context.current;
    pointActors.current.forEach(({ actor }) => {
      renderer.removeActor(actor);
      actor.delete();
    });
    pointActors.current = [];
    setPoints([]);
    renderWindow.render();
  }

  function handleResetView() {
    if (context.current) {
      context.current.renderer.resetCamera();
      updatePointSizes();
      context.current.renderWindow.render();
    }
  }

  function handleAutoWindowLevel() {
    if (context.current && context.current.isGrayscale && context.current.rawPixelData) {
      const pixelData = context.current.rawPixelData;
      let min = Infinity,
        max = -Infinity;
      for (let i = 0; i < pixelData.length; i++) {
        if (pixelData[i] < min) min = pixelData[i];
        if (pixelData[i] > max) max = pixelData[i];
      }
      setWindowLevel({ width: max - min, center: min + (max - min) / 2 });
    }
  }

  function cleanupVTK() {
    if (context.current) {
      try {
        const { fullScreenRenderer, renderWindow } = context.current;
        if (renderWindow) {
          const interactor = renderWindow.getInteractor?.();
          if (interactor) interactor.unbindEvents?.();
        }
        if (fullScreenRenderer) fullScreenRenderer.delete?.();
      } catch (e) {
        console.warn("cleanup VTK error:", e);
      }
      context.current = null;
    }
    if (vtkContainerRef.current) {
      try {
        vtkContainerRef.current.innerHTML = "";
        vtkContainerRef.current.removeAttribute("style");
      } catch {}
    }
    try {
      document.body.style.overflow = "";
      document.body.style.margin = "";
      document.body.style.background = "";
    } catch {}
    document
      .querySelectorAll(".vtk-js-fullscreen-render-window, .vtk-container, canvas.vtkglCanvas")
      .forEach((el) => {
        if (!vtkContainerRef.current || !vtkContainerRef.current.contains(el)) el.remove();
      });
  }

  function cleanupPoints() {
    try {
      clearAllPoints();
    } catch {}
  }
  function cleanupDrawings() {
    try {
      clearAllDrawings();
    } catch {}
  }

  function handleVolver() {
    cleanupVTK();
    navigate("/visualizar-ecografias", { replace: true });
  }

  // =====================
  // Medidas + captura + navegación a Reporte
  // =====================
  function extractMedidasSafe({ pointsState, drawingActors }) {
    const puntos = pointsState.map((p) => [p.pixel.x, p.pixel.y]);
    const trazos = drawingActors.current.map((d) => ({
      numPoints: d.points?.length || 0,
      color: d.color || [1, 0, 0],
      width: d.width || 2,
    }));
    return { puntos, trazos };
  }

  // Captura la imagen actual del render VTK (con anotaciones) como dataURL
  function captureAnnotatedFrameDataURL(renderWindow) {
    const images = renderWindow.captureImages([{ format: "image/png" }]);
    if (!images || !images.length) throw new Error("No se pudo capturar el canvas");
    return images[0]; // dataURL
  }

  async function handleIrAReportar() {
    console.log("[ImageViewer] CLICK IrAReportar");
    setSaving(true);
    setSaveError(null);
    try {
      // 1) medidas (aunque no haya render listo)
      const medidas = extractMedidasSafe({ pointsState: points, drawingActors });

      // 2) intentar captura; si falla, seguimos sin imagen
      let imageDataUrl = null;
      try {
        if (context.current?.renderWindow) {
          imageDataUrl = captureAnnotatedFrameDataURL(context.current.renderWindow);
        }
      } catch (capErr) {
        console.error("[ImageViewer] Fallo captura, sigo sin imagen:", capErr);
      }

      // 3) medico_id (si hay token)
      const medicoId = getMedicoIdFromToken();

      // 4) payload (aunque falten IDs, Reporte mostrará el aviso)
      const payload = {
        ecografiaId: ecografiaId ?? null,
        neonatoId: neonatoId ?? null,
        medicoId,
        medidas,
        imageDataUrl,
      };

      sessionStorage.setItem("report:payload", JSON.stringify(payload));
      setShowSaveModal(false);

      console.log("[ImageViewer] Navegando a /reporte/nuevo con payload:", payload);

      // 5) navegar (ruta absoluta)
      navigate("/reporte/nuevo", { state: payload, replace: false });
    } catch (e) {
      console.error("[ImageViewer] Error preparando reporte:", e);
      setSaveError(e.message || "No se pudo preparar el reporte");
      // AÚN ASÍ intenta navegar para ver el error desde Reporte
      const fallback = {
        ecografiaId,
        neonatoId,
        medicoId: getMedicoIdFromToken(),
        medidas: { puntos: [], trazos: [] },
        imageDataUrl: null,
      };
      navigate("/reporte/nuevo", { state: fallback, replace: false });
    } finally {
      setSaving(false);
    }
  }

  // =====================
  // Render
  // =====================

  if (!hasValidState || !isMounted) {
    return (
      <div
        style={{
          width: "100%",
          height: "100vh",
          backgroundColor: "#000",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div style={{ fontSize: "1rem", color: "#ccc", textAlign: "center" }}>
          No hay ecografía seleccionada.
        </div>
        <button onClick={handleVolver} style={buttonStyle}>
          ← Volver
        </button>
      </div>
    );
  }

  return (
    <div
      className={isEmbedded ? "vtk-embedded" : "vtk-fullscreen"}
      style={
        isEmbedded
          ? { height: "100%", display: "flex", flexDirection: "column", position: "relative" }
          : { width: "100%", height: "100vh", position: "relative", background: "#000", overflow: "hidden" }
      }
    >
      {/* TOOLBAR SUPERIOR */}
      {!isEmbedded && (
        <div
          style={{
            position: "absolute",
            top: 70,
            left: 0,
            right: 0,
            height: "60px",
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            padding: "0 10px",
            gap: "10px",
            zIndex: 2500,
            flexWrap: "wrap",
            fontSize: "13px",
            color: "#fff",
          }}
        >
          <button onClick={handleVolver} style={buttonStyle}>
            ← Volver
          </button>

          <div style={{ color: "#fff", fontSize: "13px" }}>
            <div>
              <strong>Ecografía ID:</strong> {ecografiaId}
            </div>
            <div>
              <strong>Neonato ID:</strong> {neonatoId ?? "—"}
            </div>
            <div>
              <strong>Médico:</strong> {medico}
            </div>
            <div>
              <strong>Fecha:</strong> {timestamp ? new Date(timestamp).toLocaleString() : "—"}
            </div>
          </div>

          <button onClick={handleResetView} style={buttonStyle}>
            Reset View
          </button>

          {context.current?.isGrayscale && (
            <>
              <button onClick={handleAutoWindowLevel} style={buttonStyle}>
                Auto W/L
              </button>
              <span>
                W: {Math.round(windowLevel.width)} | L: {Math.round(windowLevel.center)}
              </span>
            </>
          )}

          {/* punto */}
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

          {/* lápiz */}
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

          {/* abrir modal desde toolbar */}
          <button
            style={{ ...buttonStyle, backgroundColor: "#1976d2" }}
            onClick={() => { console.log("[ImageViewer] Abriendo modal (toolbar)"); setShowSaveModal(true); }}
          >
            💾 Reportar
          </button>
        </div>
      )}

      {/* Panel lateral (resumen) */}
      {!isEmbedded && (points.length > 0 || drawings.length > 0) && (
        <div
          style={{
            position: "absolute",
            top: "140px",
            right: "10px",
            background: "rgba(0,0,0,0.85)",
            padding: "10px",
            borderRadius: "5px",
            color: "#fff",
            fontSize: "12px",
            maxHeight: "calc(100vh - 200px)",
            overflowY: "auto",
            minWidth: "200px",
            zIndex: 100,
          }}
        >
          {points.length > 0 && (
            <>
              <div style={{ fontWeight: "bold", marginBottom: "8px", fontSize: "14px" }}>
                Puntos ({points.length})
              </div>
              {points.map((pt, idx) => (
                <div
                  key={pt.id}
                  style={{
                    padding: "6px",
                    marginBottom: "5px",
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: "3px",
                    borderLeft: "3px solid #2196f3",
                  }}
                >
                  <div style={{ fontWeight: "bold", color: "#2196f3" }}>Punto {idx + 1}</div>
                  <div>X: {pt.pixel.x} px</div>
                  <div>Y: {pt.pixel.y} px</div>
                  {pt.value !== null && <div>Valor: {Math.round(pt.value)}</div>}
                </div>
              ))}
            </>
          )}
          {drawings.length > 0 && (
            <>
              <div
                style={{ fontWeight: "bold", marginTop: "12px", marginBottom: "8px", fontSize: "14px" }}
              >
                Trazos ({drawings.length})
              </div>
              {drawings.map((d, idx) => (
                <div
                  key={d.id}
                  style={{
                    padding: "6px",
                    marginBottom: "5px",
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: "3px",
                    borderLeft: "3px solid #4caf50",
                  }}
                >
                  <div style={{ fontWeight: "bold", color: "#4caf50" }}>Trazo {idx + 1}</div>
                  <div>Puntos: {d.numPoints}</div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Hints */}
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
            <span style={{ color: "#4caf50", fontWeight: "bold" }}>🖱️ Click izq + arrastrar: Dibujar</span>
          ) : pointMode ? (
            <span style={{ color: "#2196f3", fontWeight: "bold" }}>🖱️ Click izq: Colocar punto</span>
          ) : (
            <>🖱️ Rueda: Zoom | Click der: Pan • Ctrl/Cmd + S: Reportar</>
          )}
        </div>
      )}

      {/* overlays */}
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

      {/* contenedor VTK - siempre por debajo del overlay/modal */}
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
                zIndex: 1,
                pointerEvents: showSaveModal ? "none" : "auto",
              }
            : {
                width: "100%",
                height: "100%",
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 1,
                pointerEvents: showSaveModal ? "none" : "auto",
              }
        }
      />

      {/* FAB Reportar (siempre visible) */}
      <button
        className="iv-fab-save"
        onClick={() => { console.log("[ImageViewer] Abriendo modal (FAB)"); setShowSaveModal(true); }}
        title="Ir a Reporte con anotaciones"
      >
        💾
      </button>

      {/* Modal Reportar - por encima del canvas (z-index alto) */}
      {showSaveModal && (
        <div
          className="iv-modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "auto",
          }}
        >
          <div
            className="iv-modal iv-modal-wide"
            style={{
              background: "#111",
              color: "#fff",
              borderRadius: 8,
              padding: 16,
              minWidth: 420,
              maxWidth: "90vw",
              zIndex: 100000,
              position: "relative",
            }}
          >
            <h3>Enviar a Reporte</h3>

            <div className="iv-grid">
              {/* Lado izquierdo: resumen */}
              <div className="iv-col">
                <div className="iv-field">
                  <div className="iv-report-meta">
                    <div>
                      <strong>Ecografía ID:</strong> {ecografiaId ?? "—"}
                    </div>
                    <div>
                      <strong>Neonato ID:</strong> {neonatoId ?? "—"}
                    </div>
                    <div>
                      <strong>Médico ID (JWT):</strong> {getMedicoIdFromToken() ?? "—"}
                    </div>
                    <div>
                      <strong>Puntos:</strong> {points.length} &nbsp;|&nbsp; <strong>Trazos:</strong> {drawings.length}
                    </div>
                  </div>
                </div>

                {saveError && <div className="iv-error">⚠ {saveError}</div>}

                <div className="iv-actions">
                  <button className="iv-btn" onClick={() => setShowSaveModal(false)} disabled={saving}>
                    Cancelar
                  </button>
                  <button
                    className="iv-btn iv-btn-primary"
                    onClick={handleIrAReportar}
                    disabled={saving}
                  >
                    {saving ? "Preparando…" : "Ir a Reporte"}
                  </button>
                </div>

                <div className="iv-report-footnote">
                  * Al continuar se captura la imagen del visor con las anotaciones actuales y pasarás a “Reporte”.
                </div>
              </div>

              {/* Lado derecho: hint visual */}
              <div className="iv-col">
                <div className="iv-report-card">
                  <div className="iv-report-header">
                    <div>
                      <div className="iv-report-title">Reporte de Ecografía</div>
                      <div className="iv-report-sub">Vista previa se genera en Reporte</div>
                    </div>
                    <span className={`iv-badge borrador`}>borrador</span>
                  </div>
                  <div className="iv-report-text iv-muted">
                    Aquí solo confirmas que enviarás la captura y las anotaciones. La edición completa (diagnóstico,
                    conclusión, estado) se hace en la pantalla “Reporte”.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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
