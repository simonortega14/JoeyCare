import { useRef, useEffect } from "react";
import "@kitware/vtk.js/Rendering/Profiles/All";
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkPlaneSource from "@kitware/vtk.js/Filters/Sources/PlaneSource";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkTexture from "@kitware/vtk.js/Rendering/Core/Texture";

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

      // Crear plano (superficie para la imagen)
      const planeSource = vtkPlaneSource.newInstance({
        XResolution: 1,
        YResolution: 1,
      });

      const mapper = vtkMapper.newInstance();
      mapper.setInputConnection(planeSource.getOutputPort());

      const actor = vtkActor.newInstance();
      actor.setMapper(mapper);

      // Crear textura
      const texture = vtkTexture.newInstance();
      const img = new Image();
      img.src = "/ecografia.png"; // 👈 debe estar en /public
      img.onload = () => {
        texture.setImage(img);
        actor.addTexture(texture);

        // Ajustar proporción del plano a la imagen
        const aspect = img.width / img.height;
        actor.setScale(aspect, 1, 1);

        renderer.addActor(actor);
        renderer.resetCamera();
        renderWindow.render();

        context.current = { fullScreenRenderer, renderer, renderWindow };
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
    <div
      ref={vtkContainerRef}
      style={{ width: "100%", height: "100vh", background: "black" }}
    />
  );
}

export default VtkViewer;
