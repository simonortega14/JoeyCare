// src/features/viewer/PngVtkViewer.jsx
import React, { useRef, useLayoutEffect, useState } from "react";
import "@kitware/vtk.js/Rendering/Profiles/All";
import vtkGenericRenderWindow from "@kitware/vtk.js/Rendering/Misc/GenericRenderWindow";
import vtkImageMapper from "@kitware/vtk.js/Rendering/Core/ImageMapper";
import vtkImageSlice from "@kitware/vtk.js/Rendering/Core/ImageSlice";
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";
import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";

const testImage = "/test.png";

function createSyntheticUltrasoundImage(width = 512, height = 512) {
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cx = width / 2,
        cy = height / 2;
      const d = Math.hypot(x - cx, y - cy);
      let i = Math.random() * 50 + 30;
      if (d < 80) i = Math.random() * 40 + 20;
      else if (d < 120) i = Math.random() * 80 + 120;
      else if (d < 180) i = Math.random() * 60 + 80;
      i += (Math.random() - 0.5) * 30;
      if (Math.abs(Math.atan2(y - cy, x - cx)) > Math.PI * 0.75) i = 0;
      pixels[y * width + x] = Math.round(Math.max(0, Math.min(255, i)));
    }
  }
  return { width, height, pixels };
}

async function pngToGrayscaleMatrix(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(createSyntheticUltrasoundImage());
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, c.width, c.height);
      const pixels = new Uint8Array(c.width * c.height);
      for (let i = 0; i < pixels.length; i++) {
        const r = data[i * 4],
          g = data[i * 4 + 1],
          b = data[i * 4 + 2];
        pixels[i] = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
      }
      resolve({ width: c.width, height: c.height, pixels });
    };
    img.onerror = () => resolve(createSyntheticUltrasoundImage());
    img.src = src;
  });
}

export default function PngVtkViewer({ pngSource = testImage, onError }) {
  const containerRef = useRef(null);
  const contextRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [info, setInfo] = useState(null);

  const initializeVTK = async () => {
    // cleanup previo si existe
    if (contextRef.current) {
      try {
        if (contextRef.current.rw && typeof contextRef.current.rw.delete === "function") {
          contextRef.current.rw.delete();
        }
      } catch {
        // ignore
      }
      contextRef.current = null;
    }

    const container = containerRef.current;
    if (!container) throw new Error("Container ref is null");

    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) throw new Error("Container size zero");

    setLoading(true);
    setErr(null);

    const { width, height, pixels } = await pngToGrayscaleMatrix(pngSource);
    setInfo({ width, height, source: pngSource ? "test.png" : "synthetic" });

    const imageData = vtkImageData.newInstance();
    imageData.setDimensions(width, height, 1);
    const scalars = vtkDataArray.newInstance({
      name: "Scalars",
      numberOfComponents: 1,
      values: pixels,
    });
    imageData.getPointData().setScalars(scalars);

    const rw = vtkGenericRenderWindow.newInstance();
    rw.setContainer(container);
    rw.resize();
    const ren = rw.getRenderer();
    const rwin = rw.getRenderWindow();
    ren.setBackground(0.1, 0.1, 0.1);

    const mapper = vtkImageMapper.newInstance();
    mapper.setInputData(imageData);
    mapper.setSlicingMode(vtkImageMapper.SlicingMode.Z);
    mapper.setSlice(0);

    const actor = vtkImageSlice.newInstance();
    actor.setMapper(mapper);
    ren.addActor(actor);

    const cam = ren.getActiveCamera();
    cam.setParallelProjection(true);
    const b = imageData.getBounds();
    const cx = (b[0] + b[1]) / 2,
      cy = (b[2] + b[3]) / 2,
      cz = (b[4] + b[5]) / 2;
    cam.setFocalPoint(cx, cy, cz);
    cam.setPosition(cx, cy, cz + Math.max(width, height));
    cam.setViewUp(0, 1, 0);
    ren.resetCamera();

    contextRef.current = { rw, ren, rwin, actor, mapper };
    rwin.render();
    setLoading(false);
  };

  useLayoutEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 200; // aumentamos (≈200 * 50ms = 10s)
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    const initialContainer = containerRef.current;

    (async function tryInitLoop() {
      try {
        while (!cancelled) {
          attempts += 1;
          const container = containerRef.current;
          if (!container) {
            if (attempts >= maxAttempts) {
              // no forzamos un throw crudo — marcamos error y salimos
              const msg = "Container ref never became available";
              console.error(msg);
              setErr(msg);
              if (onError) onError(new Error(msg));
              return;
            }
            await sleep(50);
            continue;
          }
          const rect = container.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            if (attempts >= maxAttempts) {
              const msg = "Container never got a size";
              console.error(msg);
              setErr(msg);
              if (onError) onError(new Error(msg));
              return;
            }
            await sleep(50);
            continue;
          }
          // contenedor listo
          await initializeVTK();
          break;
        }
      } catch (e) {
        console.error(e);
        setErr(e.message || String(e));
        if (onError) onError(e);
      }
    })();

    return () => {
      cancelled = true;
      try {
        const ctx = contextRef.current;
        if (ctx && ctx.rw && typeof ctx.rw.delete === "function") {
          ctx.rw.delete();
        } else if (initialContainer) {
          initialContainer.innerHTML = "";
        }
      } catch {
        // ignore
      } finally {
        contextRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pngSource]);

  if (loading)
    return (
      <div className="vtk-loading" style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div className="vtk-spinner" />
          <div style={{ color: "#fff", marginTop: 8 }}>Cargando...</div>
        </div>
      </div>
    );

  if (err) return <div className="vtk-error" style={{ color: "#f66" }}>Error: {err}</div>;

  return (
    <div className="vtk-container-wrapper" style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} className="vtk-container" style={{ width: "100%", height: "100%" }} />
      {info && (
        <div style={{ position: "absolute", right: 8, bottom: 8, background: "rgba(0,0,0,0.6)", color: "white", padding: "6px 8px", borderRadius: 6, fontSize: 12 }}>
          {info.source} • {info.width}×{info.height}
        </div>
      )}
    </div>
  );
}
