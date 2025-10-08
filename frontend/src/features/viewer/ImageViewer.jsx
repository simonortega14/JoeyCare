import { useRef, useEffect, useState } from "react";
import "@kitware/vtk.js/Rendering/Profiles/All";
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkImageMapper from "@kitware/vtk.js/Rendering/Core/ImageMapper";
import vtkImageSlice from "@kitware/vtk.js/Rendering/Core/ImageSlice";
import vtkInteractorStyleImage from "@kitware/vtk.js/Interaction/Style/InteractorStyleImage";
import vtkITKHelper from "@kitware/vtk.js/Common/DataModel/ITKHelper";
import { readImage } from "@itk-wasm/image-io";
import "./viewer.css";

function ImageViewer({ imageFile, onClose }) {
  const vtkContainerRef = useRef(null);
  const context = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!imageFile || !vtkContainerRef.current) return;

    loadAndRenderImage();

    return () => {
      if (context.current) {
        context.current.fullScreenRenderer.delete();
        context.current = null;
      }
    };
  }, [imageFile]);

  const loadAndRenderImage = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('1. Iniciando carga de:', imageFile.filename);
      
      // Descargar el archivo
      const response = await fetch(`http://localhost:4000/api/uploads/${imageFile.filename}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('2. Archivo descargado, tamaño:', arrayBuffer.byteLength, 'bytes');
      
      // Crear un File object para itk-wasm
      const file = new File([arrayBuffer], imageFile.filename, {
        type: getMimeType(imageFile.filename)
      });

      console.log('3. Leyendo imagen con itk-wasm...');
      
      // Leer la imagen con itk-wasm (soporta DICOM, PNG, JPG, etc.)
      let itkImage;
      try {
        const result = await readImage(file);
        itkImage = result.image;
        console.log('4. Imagen ITK cargada exitosamente');
      } catch (itkError) {
        console.error('Error en readImage:', itkError);
        throw new Error(`Error leyendo imagen con itk-wasm: ${itkError.message}`);
      }
      
      console.log('5. Detalles imagen ITK:', {
        dimensions: itkImage.size,
        spacing: itkImage.spacing,
        components: itkImage.imageType.components,
        pixelType: itkImage.imageType.pixelType,
        componentType: itkImage.imageType.componentType
      });

      // Convertir imagen ITK a VTK
      console.log('6. Convirtiendo ITK a VTK...');
      const vtkImageData = vtkITKHelper.convertItkToVtkImage(itkImage);
      
      // Para imágenes RGB, configurar correctamente
      const scalars = vtkImageData.getPointData().getScalars();
      scalars.setNumberOfComponents(itkImage.imageType.components);
      
      const dims = vtkImageData.getDimensions();
      const range = scalars.getRange();
      
      console.log('7. Imagen VTK convertida:', {
        dimensions: dims,
        dataRange: range,
        numberOfComponents: scalars.getNumberOfComponents(),
        numberOfPoints: vtkImageData.getNumberOfPoints()
      });

      // Crear el renderizador
      console.log('8. Creando renderizador...');
      if (context.current) {
        context.current.fullScreenRenderer.delete();
        context.current = null;
      }

      const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
        rootContainer: vtkContainerRef.current,
        containerStyle: { width: "100%", height: "100%", position: "relative" },
      });

      const renderer = fullScreenRenderer.getRenderer();
      const renderWindow = fullScreenRenderer.getRenderWindow();
      renderer.setBackground(0.1, 0.1, 0.15);

      // IMPORTANTE: Esperar a que el canvas se cree
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('9. Canvas creado:', vtkContainerRef.current?.querySelector('canvas') !== null);

      // Crear el mapper de imagen
      const imageMapper = vtkImageMapper.newInstance();
      imageMapper.setInputData(vtkImageData);

      // Configurar para imagen 2D
      const slicingMode = vtkImageMapper.SlicingMode.K; // Z axis
      imageMapper.setSlicingMode(slicingMode);
      
      // Si es 3D, usar el slice del medio, si es 2D usar 0
      const sliceToShow = dims[2] > 1 ? Math.floor(dims[2] / 2) : 0;
      imageMapper.setSlice(sliceToShow);

      console.log('10. Configuración mapper:', {
        slicingMode,
        slice: sliceToShow,
        totalSlices: dims[2]
      });

      // Crear el actor
      const imageActor = vtkImageSlice.newInstance();
      imageActor.setMapper(imageMapper);
      
      // Configurar el property del actor
      const property = imageActor.getProperty();
      
      // Para imágenes RGB, no usar window/level
      const isRGB = itkImage.imageType.components === 3;
      
      if (isRGB) {
        console.log('10.1. Imagen RGB detectada - sin window/level');
        property.setIndependentComponents(false);
      } else {
        property.setColorWindow(range[1] - range[0]);
        property.setColorLevel((range[0] + range[1]) / 2);
        console.log('10.2. Configuración de color (escala de grises):', {
          window: range[1] - range[0],
          level: (range[0] + range[1]) / 2
        });
      }

      renderer.addActor(imageActor);
      console.log('12. Actor agregado al renderer');

      // Configurar cámara para visualización 2D correcta
      const camera = renderer.getActiveCamera();
      camera.setParallelProjection(true);
      
      // Posicionar la cámara mirando hacia la imagen
      const bounds = vtkImageData.getBounds();
      const centerX = (bounds[0] + bounds[1]) / 2;
      const centerY = (bounds[2] + bounds[3]) / 2;
      const centerZ = (bounds[4] + bounds[5]) / 2;
      
      camera.setFocalPoint(centerX, centerY, centerZ);
      camera.setPosition(centerX, centerY, centerZ + 1);
      camera.setViewUp(0, 1, 0); // Cambié de -1 a 1 para que no esté invertida
      
      // Resetear cámara para ajustar al contenido
      renderer.resetCamera();
      renderer.resetCameraClippingRange();
      
      console.log('13. Cámara configurada:', {
        position: camera.getPosition(),
        focalPoint: camera.getFocalPoint(),
        viewUp: camera.getViewUp()
      });

      // Configurar interactor DESPUÉS de que todo esté listo
      const canvas = vtkContainerRef.current?.querySelector('canvas');
      console.log('14. Canvas para interactor:', canvas !== null);
      
      if (canvas) {
        const interactor = renderWindow.getInteractor();
        const interactorStyle = vtkInteractorStyleImage.newInstance();
        interactor.setInteractorStyle(interactorStyle);
        console.log('15. Interactor configurado correctamente');
      } else {
        console.warn('⚠️ Canvas no encontrado, interactor no configurado');
      }

      context.current = {
        fullScreenRenderer,
        renderer,
        renderWindow,
        camera,
        imageMapper,
        imageActor,
        vtkImageData,
        property,
        isRGB
      };

      console.log('16. Renderizando...');
      renderWindow.render();
      
      setLoading(false);
      console.log('✅ Imagen renderizada correctamente');

    } catch (err) {
      console.error("❌ Error completo:", err);
      console.error("Stack:", err.stack);
      setError(`Error: ${err.message}`);
      setLoading(false);
    }
  };

  const getMimeType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      'dcm': 'application/dicom',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'nii': 'application/octet-stream',
      'nrrd': 'application/octet-stream'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  };

  const handleResetView = () => {
    if (context.current) {
      context.current.renderer.resetCamera();
      context.current.renderWindow.render();
    }
  };

  const handleAdjustBrightness = (delta) => {
    if (context.current && context.current.property && !context.current.isRGB) {
      const currentLevel = context.current.property.getColorLevel();
      context.current.property.setColorLevel(currentLevel + delta);
      context.current.renderWindow.render();
    }
  };

  const handleAdjustContrast = (delta) => {
    if (context.current && context.current.property && !context.current.isRGB) {
      const currentWindow = context.current.property.getColorWindow();
      const newWindow = Math.max(1, currentWindow + delta);
      context.current.property.setColorWindow(newWindow);
      context.current.renderWindow.render();
    }
  };

  return (
    <div className="vtk-fullscreen">
      <div className="vtk-toolbar">
        <button onClick={onClose}>← Volver</button>
        <button onClick={handleResetView}>Reset View</button>
        {context.current && !context.current.isRGB && (
          <>
            <button onClick={() => handleAdjustBrightness(10)}>Brillo +</button>
            <button onClick={() => handleAdjustBrightness(-10)}>Brillo -</button>
            <button onClick={() => handleAdjustContrast(50)}>Contraste +</button>
            <button onClick={() => handleAdjustContrast(-50)}>Contraste -</button>
          </>
        )}
        <span style={{ marginLeft: "10px", color: "#fff", fontSize: "14px" }}>
          {imageFile.filename}
        </span>
      </div>

      {loading && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          color: "white",
          fontSize: "20px",
          backgroundColor: "rgba(0,0,0,0.7)",
          padding: "20px",
          borderRadius: "8px",
          zIndex: 1000
        }}>
          Cargando imagen...
        </div>
      )}

      {error && (
        <div style={{
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
          maxWidth: "80%"
        }}>
          {error}
        </div>
      )}

      <div ref={vtkContainerRef} className="vtk-viewer-canvas" />
    </div>
  );
}

export default ImageViewer;