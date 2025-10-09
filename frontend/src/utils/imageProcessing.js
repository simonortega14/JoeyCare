// src/utils/imageProcessing.js
/**
 * Calcula automáticamente el ancho (Window Width) y el centro (Window Center/Level)
 * para una visualización óptima de los datos crudos de píxeles (escalares) obtenidos por ITK.
 */
export const calculateAutoWindowLevel = (pixelData) => {
    // ITK.js generalmente devuelve TypedArrays (Int16Array, Uint8Array, etc.)
    if (!pixelData || pixelData.length === 0) {
        console.warn("calculateAutoWindowLevel: Los datos de píxeles están vacíos.");
        return { width: 0, center: 0 };
    }
    
    // 1. Cálculo de Mínimo y Máximo
    let min = pixelData[0];
    let max = pixelData[0];

    // Usamos un bucle for tradicional para TypedArrays grandes (más eficiente que spread operator)
    for (let i = 1; i < pixelData.length; i++) {
        const value = pixelData[i];
        if (value < min) min = value;
        if (value > max) max = value;
    }
    
    // 2. Cálculo de Window/Level
    const width = max - min;
    const center = min + width / 2;
    
    return { width, center };
};