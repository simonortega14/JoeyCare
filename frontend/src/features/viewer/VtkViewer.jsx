import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // 👈 Agregado
import "@kitware/vtk.js/Rendering/Profiles/All";
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkImageMapper from "@kitware/vtk.js/Rendering/Core/ImageMapper";
import vtkImageSlice from "@kitware/vtk.js/Rendering/Core/ImageSlice";
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";
import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";

function VtkViewer() {
  const vtkContainerRef = useRef(null);
  const context = useRef(null);
  const navigate = useNavigate(); // 👈 Hook de navegación

  useEffect(() => {
    if (!context.current) {
      const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
        rootContainer: vtkContainerRef.current,
        containerStyle: { width: "100%", height: "100%", position: "relative" },
      });
      const renderer = fullScreenRenderer.getRenderer();
      const renderWindow = fullScreenRenderer.getRenderWindow();

      const img = new Image();
      img.src = "/test.png";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const pixels = ctx.getImageData(0, 0, img.width, img.height).data;
        const rgbPixels = new Uint8Array(img.width * img.height * 3);
        for (let i = 0; i < img.width * img.height; i++) {
          rgbPixels[i * 3] = pixels[i * 4];
          rgbPixels[i * 3 + 1] = pixels[i * 4 + 1];
          rgbPixels[i * 3 + 2] = pixels[i * 4 + 2];
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
    <div style={{ width: "100%", height: "100vh", background: "#2f3241", position: "relative" }}>
      {/* 🔘 Botón flotante para ir a comparar imágenes */}
      <button
        onClick={() => navigate("/visualizar-ecografias/comparar")}
        style={{
          position: "absolute",
          top: "15px",
          right: "15px",
          zIndex: 9999,
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "8px 14px",
          cursor: "pointer",
          boxShadow: "0px 2px 6px rgba(0,0,0,0.3)",
        }}
      >
        Comparar Imágenes
      </button>
      {/* Contenedor de VTK */}
      <div ref={vtkContainerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

export default VtkViewer;
