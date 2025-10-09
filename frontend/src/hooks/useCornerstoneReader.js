// src/hooks/useCornerstoneReader.js

import { useState, useEffect } from 'react';
import vtk from '@kitware/vtk.js/vtk'; 
// Importaciones de Cornerstone
import { imageLoader } from '@cornerstonejs/core'; 
import dicomParser from 'dicom-parser';

// 🛑 Importamos el módulo completo.
import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader'; 

const API_BASE_URL = "http://localhost:4000/api";

// =========================================================================
// FUNCIÓN DE INICIALIZACIÓN DE CORNERSTONE (Manejo de Módulos Legacy)
// =========================================================================

let cornerstoneInitialized = false;

function initializeCornerstone() {
    if (cornerstoneInitialized) {
        return;
    }

    try {
        // 🛑 Lógica para manejar el bundling de Vite (acceso a .default o raíz)
        const loader = cornerstoneDICOMImageLoader.default || cornerstoneDICOMImageLoader;

        // Desestructuración de las funciones a través del objeto loader corregido
        const { setCornerstone, setDicomParser, registerImageLoader, set2DToolingConfig } = loader;

        // Enlaza el Core con el Dicom Image Loader y el Parser
        setCornerstone(imageLoader);
        setDicomParser(dicomParser);
        
        // Registrar cargadores para esquemas HTTP/HTTPS
        registerImageLoader('http');
        registerImageLoader('https');
        
        set2DToolingConfig({ maxWebWorkers: 1 }); 

        console.log("Cornerstone Image Loader inicializado exitosamente.");
        cornerstoneInitialized = true;
    } catch (e) {
        // Reportar el fallo explícitamente si ocurre de nuevo
        console.error("Fallo al inicializar Cornerstone:", e);
    }
}

// =========================================================================
// HOOK PRINCIPAL
// =========================================================================

/**
 * Hook para cargar y procesar un archivo de imagen (DICOM, PNG, JPG) usando Cornerstone.
 */
export function useCornerstoneReader(selectedEcografia) {
    // La inicialización debe ocurrir aquí antes del estado.
    initializeCornerstone(); 
    
    const [vtkImageData, setVtkImageData] = useState(null);
    const [pixelData, setPixelData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const imageId = selectedEcografia 
        ? `${API_BASE_URL}/uploads/${selectedEcografia.filename}`
        : null;
    
    const ecografiaUrl = imageId; 
    const filename = selectedEcografia ? selectedEcografia.filename.toLowerCase() : null;

    useEffect(() => {
        if (!ecografiaUrl) return;

        const loadAndConvertImage = async () => {
            setLoading(true);
            setError(null);
            setVtkImageData(null);
            setPixelData(null);

            try {
                // 1. Obtener el ArrayBuffer (Fetch)
                const response = await fetch(ecografiaUrl);
                if (!response.ok) throw new Error(`Fallo al cargar el archivo. HTTP Status: ${response.status}`);
                const arrayBuffer = await response.arrayBuffer();

                // 2. Cargar la imagen con Cornerstone
                // Obtenemos wadouri del módulo importado
                const { wadouri } = cornerstoneDICOMImageLoader.default || cornerstoneDICOMImageLoader;

                // Usamos wadouri.loadImage con el ArrayBuffer
                const image = await wadouri.loadImage(imageId, { arrayBuffer: arrayBuffer });
                
                // 3. Extracción y conversión de datos (getPixelData debería existir ahora)
                const pixelDataArray = image.getPixelData(); 
                const pixelSpacing = image.columnPixelSpacing || 1.0;
                
                // Conversion VTK
                const typedArray = new Int16Array(pixelDataArray.buffer, pixelDataArray.byteOffset, pixelDataArray.length);

                const vtkDataArray = vtk.Common.Core.DataArray.newInstance({
                    values: typedArray,
                    name: 'Scalars',
                    numberOfComponents: 1, 
                });

                const vtkImage = vtk.Common.DataModel.ImageData.newInstance();
                vtkImage.setDimensions([image.columns, image.rows, 1]);
                vtkImage.setSpacing([pixelSpacing, pixelSpacing, 1.0]); 
                vtkImage.setOrigin([0, 0, 0]);
                vtkImage.getPointData().setScalars(vtkDataArray);

                setVtkImageData(vtkImage);
                setPixelData(typedArray);
                setLoading(false);

            } catch (err) {
                console.error("Error en la carga y procesamiento con Cornerstone:", err);
                // Si llegamos aquí, es probable que 'image' sea undefined, lo que causa el error de getPixelData
                setError(`Error al procesar la imagen: ${err.message}. Verifique el formato DICOM/PNG.`);
                setLoading(false);
            }
        };

        loadAndConvertImage();

    }, [ecografiaUrl, imageId, filename]); 

    return { vtkImageData, pixelData, loading, error };
}