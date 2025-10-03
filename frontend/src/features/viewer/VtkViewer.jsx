import React, { useEffect, useRef } from "react";
import "@kitware/vtk.js/Rendering/Profiles/All";

import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";
import vtkImageMapper from "@kitware/vtk.js/Rendering/Core/ImageMapper";
import vtkImageSlice from "@kitware/vtk.js/Rendering/Core/ImageSlice";

export default function VtkViewer({ imageURL }) {
  const containerRef = useRef(null);
  const ctxRef = useRef({});

  useEffect(() => {
    if (!imageURL) {
      if (ctxRef.current.fullScreenRenderer) {
        ctxRef.current.fullScreenRenderer.delete();
        ctxRef.current = {};
      }
      return;
    }

    let canceled = false;

    if (ctxRef.current.fullScreenRenderer) {
      ctxRef.current.fullScreenRenderer.delete();
      ctxRef.current = {};
    }

    const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
      rootContainer: containerRef.current,
      containerStyle: { width: "100%", height: "100%", position: "relative" },
    });
    const renderer = fullScreenRenderer.getRenderer();
    const renderWindow = fullScreenRenderer.getRenderWindow();

    const camera = renderer.getActiveCamera();
    camera.setParallelProjection(true);

    const mapper = vtkImageMapper.newInstance();
    mapper.setSlicingMode(vtkImageMapper.SlicingMode.Z);

    const actor = vtkImageSlice.newInstance();
    actor.setMapper(mapper);
    actor.getProperty().setInterpolationTypeToNearest();

    renderer.addActor(actor);
    renderer.setBackground(0, 0, 0);

    ctxRef.current = { fullScreenRenderer, renderer, renderWindow, mapper, actor };

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (canceled) return;

      try {
        const width = img.width;
        const height = img.height;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, width, height);
        const src = imgData.data;

        const flipped = new Uint8Array(src.length);
        const rowBytes = width * 4;
        for (let row = 0; row < height; row++) {
          const srcStart = row * rowBytes;
          const dstStart = (height - 1 - row) * rowBytes;
          flipped.set(src.subarray(srcStart, srcStart + rowBytes), dstStart);
        }

        const vtkImg = vtkImageData.newInstance();
        vtkImg.setDimensions(width, height, 1);
        vtkImg.setSpacing(1, 1, 1);
        vtkImg.setOrigin(0, 0, 0);

        const dataArray = vtkDataArray.newInstance({
          name: "RGBA",
          values: flipped,
          numberOfComponents: 4,
        });

        vtkImg.getPointData().setScalars(dataArray);
        mapper.setInputData(vtkImg);

        renderer.resetCamera();
        renderWindow.render();
      } catch (err) {
        console.error("Error procesando imagen en VtkViewer:", err);
      }
    };

    img.onerror = () => {
      console.error("Error cargando imageURL:", imageURL);
    };

    img.src = imageURL;

    return () => {
      canceled = true;
      if (ctxRef.current.fullScreenRenderer) {
        ctxRef.current.fullScreenRenderer.delete();
      }
      ctxRef.current = {};
    };
  }, [imageURL]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: 500 }}
    />
  );
}
