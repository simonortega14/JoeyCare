import { useRef, useEffect } from "react";
import "@kitware/vtk.js/Rendering/Profiles/All";
import vtkGenericRenderWindow from "@kitware/vtk.js/Rendering/Misc/GenericRenderWindow";
import vtkImageMapper from "@kitware/vtk.js/Rendering/Core/ImageMapper";
import vtkImageSlice from "@kitware/vtk.js/Rendering/Core/ImageSlice";
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";
import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";

function VtkViewer() {
  const vtkContainerRef = useRef(null);
  const context = useRef(null);

  useEffect(() => {
    if (!context.current) {
      // Usar GenericRenderWindow en lugar de FullScreenRenderWindow
      const genericRenderWindow = vtkGenericRenderWindow.newInstance();
      genericRenderWindow.setContainer(vtkContainerRef.current);
      
      // Configurar el tamaño del render window
      genericRenderWindow.resize();
      
      const renderer = genericRenderWindow.getRenderer();
      const renderWindow = genericRenderWindow.getRenderWindow();

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
          rgbPixels[i * 3 + 1] = pixels[i * 4 + 1]; // G
          rgbPixels[i * 3 + 2] = pixels[i * 4 + 2]; // B
        }

        const image = vtkImageData.newInstance();
        image.setDimensions(img.width, img.height, 1);
        image.setSpacing(1, 1, 1);
        image.setOrigin(0, 0, 0);
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
        
        // Configurar la cámara para vista 2D correcta
        const camera = renderer.getActiveCamera();
        camera.setParallelProjection(true);
        
        // Obtener los bounds de la imagen
        const bounds = actor.getBounds();
        const centerX = (bounds[0] + bounds[1]) / 2;
        const centerY = (bounds[2] + bounds[3]) / 2;
        const centerZ = (bounds[4] + bounds[5]) / 2;
        
        // Configurar la cámara para vista frontal (como una imagen 2D normal)
        camera.setPosition(centerX, centerY, centerZ + 1000);
        camera.setFocalPoint(centerX, centerY, centerZ);
        camera.setViewUp(0, 1, 0); // Y hacia arriba
        
        // Resetear la cámara para ajustar el zoom automáticamente
        renderer.resetCamera();
        
        // Ajustar el viewport para que se vea toda la imagen sin rotación
        const imageWidth = bounds[1] - bounds[0];
        const imageHeight = bounds[3] - bounds[2];
        const containerElement = vtkContainerRef.current;
        const containerWidth = containerElement.clientWidth;
        const containerHeight = containerElement.clientHeight;
        
        // Calcular el factor de escala para que quepa toda la imagen
        const scaleX = containerWidth / imageWidth;
        const scaleY = containerHeight / imageHeight;
        const scale = Math.min(scaleX, scaleY) * 0.9; // 0.9 para dar un poco de margen
        
        camera.setParallelScale(Math.max(imageWidth, imageHeight) / (2 * scale));
        
        renderWindow.render();

        context.current = { 
          genericRenderWindow, 
          renderer, 
          renderWindow, 
          actor, 
          mapper, 
          image 
        };
      };

      img.onerror = (error) => {
        console.error("Error cargando la imagen:", error);
      };
    }

    // Manejar el redimensionamiento
    const handleResize = () => {
      if (context.current) {
        context.current.genericRenderWindow.resize();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (context.current) {
        context.current.genericRenderWindow.delete();
        context.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={vtkContainerRef} 
      style={{ 
        width: "100%", 
        height: "100vh", 
        background: "black",
        position: "relative",
        overflow: "hidden" // Evitar scroll
      }} 
    />
  );
}

export default VtkViewer;