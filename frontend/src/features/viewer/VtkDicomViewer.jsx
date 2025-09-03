import { useRef, useEffect, useState, useCallback } from "react";
import "@kitware/vtk.js/Rendering/Profiles/All";
import vtkGenericRenderWindow from "@kitware/vtk.js/Rendering/Misc/GenericRenderWindow";
import vtkImageMapper from "@kitware/vtk.js/Rendering/Core/ImageMapper";
import vtkImageSlice from "@kitware/vtk.js/Rendering/Core/ImageSlice";
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";
import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import vtkWidgetManager from "@kitware/vtk.js/Widgets/Core/WidgetManager";
import vtkLineWidget from "@kitware/vtk.js/Widgets/Widgets3D/LineWidget";
import vtkRectangleWidget from "@kitware/vtk.js/Widgets/Widgets3D/RectangleWidget";

function VtkDicomViewer({ 
  dicomSource,
  controls = {}, 
  activeTool = 'none',
  onToolChange,
  onDicomMetadata,
  onMeasurement
}) {
  const vtkContainerRef = useRef(null);
  const context = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // ✅ Función de carga sin variables no usadas
  const loadDicomImage = useCallback(async (dicomPath) => {
    try {
      setIsLoading(true);
      setLoadError(null);
      console.log("📁 Cargando archivo:", dicomPath);
      
      // Verificar que existe
      const response = await fetch(dicomPath);
      if (!response.ok) {
        console.warn(`Archivo no encontrado: ${dicomPath}, usando datos simulados`);
      }
      
      // Modo simulado (sin itk-wasm)
      console.log("⚠️ Modo simulado activo");
      
      // Generar imagen de prueba única para cada archivo
      const fileIndex = dicomPath.split('/').pop().replace('.dcm', '');
      const baseValue = parseInt(fileIndex) * 40 + 80; // Diferentes tonos de gris
      
      const simulatedImage = {
        size: [512, 512, 1],
        spacing: [1, 1, 1],
        origin: [0, 0, 0],
        data: new Uint8Array(512 * 512).fill(baseValue),
        imageType: { components: 1 },
        metadata: {
          PatientName: `Paciente Test ${fileIndex}`,
          StudyDate: '20250903',
          Modality: 'US',
          InstitutionName: 'Fundación Canguro',
          ManufacturerModelName: 'Equipo Test',
          ImageType: 'ORIGINAL\\PRIMARY',
          StudyDescription: 'Ecografía Transfontanelar',
          SeriesDescription: `Serie ${fileIndex}`,
          ImageComments: `Estudio simulado ${fileIndex}`
        }
      };
      
      // Metadatos extraídos
      const metadata = {
        patientName: simulatedImage.metadata.PatientName,
        studyDate: simulatedImage.metadata.StudyDate,
        modality: simulatedImage.metadata.Modality,
        institutionName: simulatedImage.metadata.InstitutionName,
        manufacturerModelName: simulatedImage.metadata.ManufacturerModelName,
        imageType: simulatedImage.metadata.ImageType,
        studyDescription: simulatedImage.metadata.StudyDescription,
        seriesDescription: simulatedImage.metadata.SeriesDescription,
        imageComments: simulatedImage.metadata.ImageComments,
        pixelSpacing: simulatedImage.spacing
      };
      
      if (onDicomMetadata) {
        onDicomMetadata(metadata);
      }
      
      setIsLoading(false);
      return simulatedImage;
      
    } catch (error) {
      console.error("❌ Error:", error);
      setLoadError(`Error: ${error.message}`);
      setIsLoading(false);
      throw error;
    }
  }, [onDicomMetadata]);

  // Aplicar controles (sin cambios)
  useEffect(() => {
    if (context.current && controls) {
      const { zoom = 1, brightness = 100, contrast = 100 } = controls;
      
      try {
        const camera = context.current.renderer.getActiveCamera();
        const baseScale = context.current?.baseParallelScale || 100;
        camera.setParallelScale(baseScale / zoom);
        
        if (context.current.actor) {
          const property = context.current.actor.getProperty();
          property.setColorWindow(brightness * 2.55);
          property.setColorLevel(contrast * 1.275);
        }
        
        context.current.renderWindow.render();
      } catch (error) {
        console.warn("Error aplicando controles:", error);
      }
    }
  }, [controls]);

  // Herramientas (sin cambios)
  useEffect(() => {
    if (context.current && context.current.widgetManager) {
      const { widgetManager, widgets } = context.current;
      
      Object.values(widgets).forEach(widget => {
        widgetManager.disableWidget(widget);
      });

      switch (activeTool) {
        case 'line':
          widgetManager.enableWidget(widgets.lineWidget);
          break;
        case 'rectangle':
          widgetManager.enableWidget(widgets.rectangleWidget);
          break;
        case 'clear':
          Object.values(widgets).forEach(widget => {
            widget.reset();
            widgetManager.disableWidget(widget);
          });
          if (onToolChange) onToolChange('none');
          break;
        default:
          break;
      }
      
      if (context.current.renderWindow) {
        context.current.renderWindow.render();
      }
    }
  }, [activeTool, onToolChange]);

  // Inicialización (sin cambios en lógica)
  useEffect(() => {
    if (!context.current && vtkContainerRef.current && dicomSource) {
      const initializeViewer = async () => {
        try {
          const genericRenderWindow = vtkGenericRenderWindow.newInstance();
          genericRenderWindow.setContainer(vtkContainerRef.current);
          genericRenderWindow.resize();
          
          const renderer = genericRenderWindow.getRenderer();
          const renderWindow = genericRenderWindow.getRenderWindow();
          const interactor = genericRenderWindow.getInteractor();
          
          renderer.setBackground(0.02, 0.02, 0.02);

          const widgetManager = vtkWidgetManager.newInstance();
          widgetManager.setRenderer(renderer);

          const lineWidget = vtkLineWidget.newInstance();
          const rectangleWidget = vtkRectangleWidget.newInstance();

          lineWidget.getWidgetState().onModified(() => {
            try {
              const distance = lineWidget.getDistance();
              const measurement = {
                type: 'distance',
                value: distance,
                unit: 'mm',
                timestamp: new Date().toISOString()
              };
              if (onMeasurement) onMeasurement(measurement);
            } catch (error) {
              console.warn("Error calculando distancia:", error);
            }
          });

          rectangleWidget.getWidgetState().onModified(() => {
            try {
              const bounds = rectangleWidget.getBounds();
              if (bounds && bounds.length >= 6) {
                const width = Math.abs(bounds[1] - bounds[0]);
                const height = Math.abs(bounds[3] - bounds[2]);
                const area = width * height;
                const measurement = {
                  type: 'area',
                  value: area,
                  unit: 'mm²',
                  width: width,
                  height: height,
                  timestamp: new Date().toISOString()
                };
                if (onMeasurement) onMeasurement(measurement);
              }
            } catch (error) {
              console.warn("Error calculando área:", error);
            }
          });

          const widgets = {
            lineWidget: widgetManager.addWidget(lineWidget),
            rectangleWidget: widgetManager.addWidget(rectangleWidget)
          };

          // Cargar imagen simulada
          const dicomImage = await loadDicomImage(dicomSource);
          
          const vtkImage = vtkImageData.newInstance();
          vtkImage.setDimensions(dicomImage.size);
          vtkImage.setSpacing(dicomImage.spacing);
          vtkImage.setOrigin(dicomImage.origin);
          
          vtkImage.getPointData().setScalars(
            vtkDataArray.newInstance({
              name: 'SimulatedPixels',
              numberOfComponents: 1,
              values: dicomImage.data,
            })
          );

          const mapper = vtkImageMapper.newInstance();
          mapper.setInputData(vtkImage);
          mapper.setSlicingMode(vtkImageMapper.SlicingMode.Z);
          mapper.setSlice(0);

          const actor = vtkImageSlice.newInstance();
          actor.setMapper(mapper);
          actor.getProperty().setColorWindow(256);
          actor.getProperty().setColorLevel(128);
          actor.getProperty().setInterpolationType(1);
          
          renderer.addActor(actor);
          
          const camera = renderer.getActiveCamera();
          camera.setParallelProjection(true);
          
          const bounds = actor.getBounds();
          const centerX = (bounds[0] + bounds[1]) / 2;
          const centerY = (bounds[2] + bounds[3]) / 2;
          const centerZ = (bounds[4] + bounds[5]) / 2;
          
          camera.setPosition(centerX, centerY, centerZ + 1000);
          camera.setFocalPoint(centerX, centerY, centerZ);
          camera.setViewUp(0, 1, 0);
          
          renderer.resetCamera();
          renderWindow.render();

          context.current = { 
            genericRenderWindow, 
            renderer, 
            renderWindow, 
            actor, 
            mapper, 
            image: vtkImage,
            baseParallelScale: 100,
            widgetManager,
            widgets,
            interactor
          };

          console.log("✅ Visor VTK inicializado (modo simulado)");
          
        } catch (error) {
          console.error("❌ Error inicializando:", error);
          setLoadError(`Error: ${error.message}`);
        }
      };

      initializeViewer();
    }

    const handleResize = () => {
      if (context.current) {
        try {
          context.current.genericRenderWindow.resize();
          context.current.renderWindow.render();
        } catch (error) {
          console.warn("Error redimensionando:", error);
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (context.current) {
        try {
          context.current.genericRenderWindow.delete();
          context.current = null;
        } catch (error) {
          console.warn("Error limpiando:", error);
        }
      }
    };
  }, [dicomSource, loadDicomImage, onMeasurement]);

  if (isLoading) {
    return (
      <div className="vtk-loading">
        <div className="vtk-spinner"></div>
        <div>Cargando...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="vtk-error">
        <div>❌ Error cargando archivo</div>
        <div><small>Usando datos simulados</small></div>
      </div>
    );
  }

  return (
    <div 
      ref={vtkContainerRef} 
      className="vtk-container"
    />
  );
}

export default VtkDicomViewer;
