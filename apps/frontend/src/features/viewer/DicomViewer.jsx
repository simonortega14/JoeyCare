import { useRef, useEffect } from "react";
import "@kitware/vtk.js/Rendering/Profiles/All";
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import vtkImageSlice from "@kitware/vtk.js/Rendering/Core/ImageSlice";
import vtkImageMapper from "@kitware/vtk.js/Rendering/Core/ImageMapper";
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";
import dicomParser from "dicom-parser";

function DicomViewer() {
  const vtkContainerRef = useRef(null);
  const context = useRef(null);

  useEffect(() => {
    async function loadDicom() {
      try {
        const response = await fetch("/100002A3.dcm");
        const buffer = await response.arrayBuffer();
        const byteArray = new Uint8Array(buffer);

        const dataSet = dicomParser.parseDicom(byteArray);

        const rows = dataSet.uint16("x00280010");
        const cols = dataSet.uint16("x00280011");
        const pixelData = dataSet.elements.x7fe00010;
        const bitsAllocated = dataSet.uint16("x00280100");

        // Valores Window/Level
        const windowCenter = dataSet.floatString("x00281050") || 127;
        const windowWidth = dataSet.floatString("x00281051") || 255;

        let pixels;
        if (bitsAllocated === 16) {
          pixels = new Uint16Array(
            dataSet.byteArray.buffer,
            pixelData.dataOffset,
            pixelData.length / 2
          );
        } else {
          pixels = new Uint8Array(
            dataSet.byteArray.buffer,
            pixelData.dataOffset,
            pixelData.length
          );
        }

        const imageData = vtkImageData.newInstance();
        imageData.setDimensions(cols, rows, 1);
        imageData.getPointData().setScalars(
          vtkDataArray.newInstance({
            values: pixels,
            numberOfComponents: 1,
          })
        );

        const mapper = vtkImageMapper.newInstance();
        mapper.setInputData(imageData);
        mapper.setSlicingMode(vtkImageMapper.SlicingMode.Z);

        const actor = vtkImageSlice.newInstance();
        actor.setMapper(mapper);
        actor.getProperty().setColorWindow(windowWidth);
        actor.getProperty().setColorLevel(windowCenter);

        const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
          rootContainer: vtkContainerRef.current,
          containerStyle: { width: "100%", height: "100%", position: "relative" },
        });

        const renderer = fullScreenRenderer.getRenderer();
        const renderWindow = fullScreenRenderer.getRenderWindow();

        renderer.addActor(actor);
        renderer.resetCamera();
        renderWindow.render();

        context.current = { fullScreenRenderer, renderer, renderWindow, actor };
      } catch (error) {
        console.error("Error cargando DICOM:", error);
      }
    }

    loadDicom();

    return () => {
      if (context.current) {
        context.current.fullScreenRenderer.delete();
        context.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={vtkContainerRef}
      style={{ width: "100%", height: "100vh", background: "black" }}
    />
  );
}

export default DicomViewer;
