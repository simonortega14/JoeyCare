// src/components/ViewerUI.jsx
import React from 'react';
// Importa los estilos compartidos con el formulario de selección
import '../features/viewer/viewer.css'; 

/**
 * Componente de UI para la barra de herramientas del visor.
 * Renderiza los botones, sliders, mensajes de estado, y el contenedor VTK.
 * Es un componente de presentación; no tiene lógica interna de VTK ni de fetch.
 */
export function ViewerUI({ ecografia, onBack, vtkProps }) {
    
    // Desestructuramos el estado y las funciones de control del hook useVtkEngine
    const { 
        zoom, setZoom, 
        loading, error, 
        windowLevel, setWindowLevel, 
        handleAutoWindowLevel, 
        handleResetView, 
        vtkContainerRef 
    } = vtkProps;
    
    // Determinación del tipo de archivo (solo para mostrar controles relevantes)
    const isDicom = ecografia?.filename.toLowerCase().endsWith(".dcm");

    // Handlers para los cambios de W/L desde los inputs
    const handleWindowWidthChange = (e) => {
        setWindowLevel(prev => ({ ...prev, width: parseFloat(e.target.value) }));
    };

    const handleWindowCenterChange = (e) => {
        setWindowLevel(prev => ({ ...prev, center: parseFloat(e.target.value) }));
    };

    return (
        <div className="vtk-fullscreen">
            {/* Barra de Herramientas (TOOLBAR) */}
            <div className="vtk-toolbar">
                <button onClick={onBack}>← Volver</button>
                <button onClick={handleResetView}>🔄 Reset View</button>
                
                {/* Controles Específicos para DICOM (Window/Level) */}
                {isDicom && (
                    <div className="vtk-wl-controls">
                        <button onClick={handleAutoWindowLevel} className="vtk-auto-wl-btn">
                            🎨 Auto W/L
                        </button>
                        
                        {/* Input de Window Width */}
                        <div className="vtk-control-group">
                            <label className="vtk-label">W:</label>
                            <input
                                type="number"
                                value={Math.round(windowLevel.width)}
                                onChange={handleWindowWidthChange}
                                className="vtk-input-number"
                                title="Window Width"
                            />
                        </div>
                        
                        {/* Input de Window Center (Level) */}
                        <div className="vtk-control-group">
                            <label className="vtk-label">L:</label>
                            <input
                                type="number"
                                value={Math.round(windowLevel.center)}
                                onChange={handleWindowCenterChange}
                                className="vtk-input-number"
                                title="Window Center (Level)"
                            />
                        </div>
                    </div>
                )}
                
                {/* Control de Zoom */}
                <div className="vtk-control-group vtk-zoom-control">
                    <label className="vtk-label">Zoom:</label>
                    <input
                        type="range"
                        min="0.1" max="5" step="0.05"
                        value={zoom}
                        onChange={e => setZoom(parseFloat(e.target.value))}
                        className="vtk-slider"
                    />
                    <span className="vtk-zoom-value">{zoom.toFixed(2)}x</span>
                </div>
            </div>
            
            {/* Mensajes de Estado (Loading o Error) */}
            {(loading || error) && (
                <div className="vtk-status-overlay" style={{ color: loading ? 'white' : 'red' }}>
                    {loading ? "Cargando ecografía..." : error}
                </div>
            )}
            
            {/* Contenedor del Visor VTK. La referencia es gestionada por el hook. */}
            <div ref={vtkContainerRef} className="vtk-viewer-canvas" />
        </div>
    );
}