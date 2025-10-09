
// src/components/ViewerUI.jsx
import React from "react";
import "../features/viewer/viewer.css";

/**
 * Interfaz de usuario del visor Cornerstone.
 * Renderiza toolbar, controles básicos y el contenedor del visor.
 */
export function ViewerUI({ ecografia, onBack, vtkProps }) {
  const { elementRef, loading, error } = vtkProps || {};

  const isDicom = ecografia?.filename?.toLowerCase().endsWith(".dcm");

  return (
    <div className="vtk-fullscreen">
      {/* Barra de Herramientas */}
      <div className="vtk-toolbar">
        <button onClick={onBack}>← Volver</button>
        <span style={{ marginLeft: "1rem", color: "#fff" }}>
          {isDicom ? "Modo DICOM" : "Modo Imagen"}
        </span>
      </div>

      {/* Contenedor del Visor Cornerstone */}
      <div
        ref={elementRef}
        className="vtk-viewer-canvas"
        style={{
          backgroundColor: "black",
          position: "relative",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100%",
        }}
      >
        {/* Spinner y mensajes */}
        {loading && (
          <div
            className="vtk-spinner"
            style={{
              position: "absolute",
              color: "white",
              fontSize: "1.2rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                border: "4px solid rgba(255, 255, 255, 0.2)",
                borderTop: "4px solid white",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                animation: "spin 1s linear infinite",
                marginBottom: "10px",
              }}
            />
            Cargando ecografía...
          </div>
        )}

        {error && !loading && (
          <div
            className="vtk-error-overlay"
            style={{
              position: "absolute",
              color: "red",
              textAlign: "center",
              padding: "10px",
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Animación del spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
