import { useRef, useEffect } from "react";
import "@kitware/vtk.js/Rendering/Profiles/All"; // importante para ImageMapper
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkImageMapper from "@kitware/vtk.js/Rendering/Core/ImageMapper";
import vtkImageSlice from "@kitware/vtk.js/Rendering/Core/ImageSlice";
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";
import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";

function VtkViewer() {
  const vtkContainerRef = useRef(null);
  const context = useRef(null);

  useEffect(() => {
    if (!context.current) {
      const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
        rootContainer: vtkContainerRef.current,
        containerStyle: { width: "100%", height: "100%", position: "relative" },
      });
      const renderer = fullScreenRenderer.getRenderer();
      const renderWindow = fullScreenRenderer.getRenderWindow();

      // ----- Cargar la imagen -----
      const img = new Image();
      img.src = "/test.png"; // debe estar en /public/test.png
      img.onload = () => {
        console.log("Imagen cargada:", img.width, "x", img.height);

        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const pixels = ctx.getImageData(0, 0, img.width, img.height).data;

        // Convertir a RGB (sin alpha)
        const rgbPixels = new Uint8Array(img.width * img.height * 3);
        for (let i = 0; i < img.width * img.height; i++) {
          rgbPixels[i * 3] = pixels[i * 4];       // R
          rgbPixels[i * 3 + 1] = pixels[i * 4+1]; // G
          rgbPixels[i * 3 + 2] = pixels[i * 4+2]; // B
        }

        const image = vtkImageData.newInstance();
        image.setDimensions(img.width, img.height, 1);
        image.getPointData().setScalars(
          vtkDataArray.newInstance({
            name: "Pixels",
            numberOfComponents: 3,
            values: rgbPixels,
          })
        );

        const mapper = vtkImageMapper.newInstance();
        mapper.setInputData(image);
        mapper.setSlicingMode(vtkImageMapper.SlicingMode.Z);
        mapper.setSlice(0);

        const actor = vtkImageSlice.newInstance();
        actor.setMapper(mapper);
        actor.getProperty().setColorWindow(255);
        actor.getProperty().setColorLevel(127.5);

        renderer.addActor(actor);
        renderer.resetCamera();
        renderWindow.render();

        context.current = { fullScreenRenderer, renderer, renderWindow, actor, mapper, image };
      };
    }

    return () => {
      if (context.current) {
        context.current.fullScreenRenderer.delete();
        context.current = null;
      }
    };
  }, []);

  return (
    <div ref={vtkContainerRef} style={{ width: "100%", height: "100vh", background: "black" }} />
  );
}

export default VtkViewer;
