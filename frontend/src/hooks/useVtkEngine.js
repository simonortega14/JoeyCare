// src/hooks/useVtkEngine.js
import { useRef, useEffect, useState, useCallback } from "react";
// Importaciones de VTK necesarias
import "@kitware/vtk.js/Rendering/Profiles/All";
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';

// NUEVA DEPENDENCIA: Usamos el lector de Cornerstone
import { useCornerstoneReader } from './useCornerstoneReader'; 
import { calculateAutoWindowLevel } from '../utils/imageProcessing'; 

/**
 * Hook personalizado para la inicialización y el control del motor de visualización VTK.js.
 * Ahora obtiene los datos de imagen decodificados de useCornerstoneReader.
 */
export function useVtkEngine(selectedEcografia) {
    const vtkContainerRef = useRef(null);
    const context = useRef(null);

    const [zoom, setZoom] = useState(1);
    const [windowLevel, setWindowLevel] = useState({ width: 256, center: 128 });

    // *** NUEVA LÍNEA: Consumir el hook de lectura Cornerstone ***
    const { vtkImageData, pixelData, loading: csLoading, error: csError } = useCornerstoneReader(selectedEcografia);

    // El estado de carga y error del visor ahora depende del lector Cornerstone
    const loading = csLoading;
    const error = csError;

    // Detectar si es DICOM para aplicar lógica de W/L automática o específica.
    const isDicom = selectedEcografia?.filename.toLowerCase().endsWith(".dcm");

    // =========================================================================
    // EFECTO PRINCIPAL: INICIALIZACIÓN Y MONTAJE DE DATOS VTK
    // =========================================================================
    useEffect(() => {
        // Ejecutar solo cuando los datos de Cornerstone están listos
        if (!vtkImageData || !vtkContainerRef.current) return;

        // Limpieza de instancias anteriores
        if (context.current) {
            context.current.fullScreenRenderer.delete();
            context.current = null;
        }

        // --- 1. Inicialización del Renderizador ---
        const fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
            rootContainer: vtkContainerRef.current,
            containerStyle: { width: "100%", height: "100%", position: "relative" },
        });
        const renderWindow = fullScreenRenderWindow.getRenderWindow();
        const renderer = fullScreenRenderWindow.getRenderer();
        renderer.setBackground(0.1, 0.1, 0.15); 
        
        const imageActorI = vtkImageSlice.newInstance();
        renderer.addActor(imageActorI);
        const camera = renderer.getActiveCamera();
        
        context.current = { fullScreenRenderer: fullScreenRenderWindow, renderWindow, renderer, imageActorI, camera };

        // --- 2. Montaje de Datos desde Cornerstone/VTK ---
        const dataRange = vtkImageData.getPointData().getScalars().getRange();
                
        const imageMapperI = vtkImageMapper.newInstance();
        imageMapperI.setInputData(vtkImageData); // <--- Usa los datos convertidos por Cornerstone
        imageActorI.setMapper(imageMapperI);
        
        // Inicializar el W/L si es DICOM
        if (isDicom) {
            const initialWidth = dataRange[1] - dataRange[0];
            const initialCenter = (dataRange[0] + dataRange[1]) / 2;
            setWindowLevel({ width: initialWidth, center: initialCenter });
        }

        renderer.resetCamera();
        renderWindow.render();

        // Función de limpieza de React
        return () => {
            if (context.current) {
                context.current.fullScreenRenderer.delete();
                context.current = null;
            }
        };
        // Se ejecuta cuando vtkImageData (de Cornerstone) está listo
    }, [vtkImageData, isDicom]);


    // =========================================================================
    // EFECTOS DE CONTROL DE INTERACCIÓN (Zoom y W/L)
    // =========================================================================

    // Aplicar Zoom
    useEffect(() => {
        if (context.current && context.current.camera) {
            context.current.camera.setParallelScale(1 / zoom); 
            context.current.renderWindow.render();
        }
    }, [zoom]);

    // Aplicar Window/Level
    useEffect(() => {
        if (context.current && context.current.imageActorI) {
            context.current.imageActorI.getProperty().setColorWindow(windowLevel.width);
            context.current.imageActorI.getProperty().setColorLevel(windowLevel.center);
            context.current.renderWindow.render();
        }
    }, [windowLevel]);


    // =========================================================================
    // FUNCIONES DE CONTROL
    // =========================================================================
    
    // Control: Resetear Vista
    const handleResetView = useCallback(() => {
        if (context.current) {
            context.current.renderer.resetCamera();
            context.current.renderWindow.render();
            setZoom(1); 
        }
    }, []);
    
    // Control: Auto Window/Level
    const handleAutoWindowLevel = useCallback(() => {
        // Usa los pixelData directamente del useCornerstoneReader
        if (pixelData) {
            const { width, center } = calculateAutoWindowLevel(pixelData);
            setWindowLevel({ width, center });
        }
    }, [pixelData]);


    return {
        vtkContainerRef,
        zoom, setZoom,
        loading, error,
        windowLevel, setWindowLevel,
        handleAutoWindowLevel,
        handleResetView,
    };
}