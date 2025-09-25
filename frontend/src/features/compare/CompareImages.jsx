// src/features/compare/CompareImages.jsx
import React, { useState } from "react";
import PngVtkViewer from "../viewer/PngVtkViewer";
import "../viewer/viewer.css";

const CompareImages = () => {
  // inicializamos con test.png para que ambos muestren la misma imagen por defecto
  const [leftImage, setLeftImage] = useState("/test.png");
  const [rightImage, setRightImage] = useState("/test.png");

  // estilo: damos altura explícita al contenedor de cada visor para evitar tamaño 0
  const viewerBoxStyle = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: "600px",       // <- altura explícita; ajusta si lo prefieres
    height: "600px",
    background: "#111",       // fondo neutro
    borderRadius: 8,
    overflow: "hidden",
    padding: 8,
  };

  return (
    <div className="image-viewer-page" style={{ padding: 12, gap: 12 }}>
      <div className="viewer-header" style={{ marginBottom: 8 }}>
        <h2 className="viewer-title">🔍 Comparación de Imágenes</h2>
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "stretch" }}>
        {/* Columna izquierda */}
        <div style={viewerBoxStyle}>
          <h4 style={{ textAlign: "center", margin: "6px 0", color: "#fff" }}>
            Imagen 1
          </h4>

          {/* PngVtkViewer ocupará todo el espacio disponible */}
          <div style={{ flex: 1 }}>
            <PngVtkViewer pngSource={leftImage} />
          </div>

          <div style={{ marginTop: 8 }}>
            <input
              type="file"
              accept="image/png,image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  const url = URL.createObjectURL(e.target.files[0]);
                  setLeftImage(url);
                }
              }}
            />
          </div>
        </div>

        {/* Columna derecha */}
        <div style={viewerBoxStyle}>
          <h4 style={{ textAlign: "center", margin: "6px 0", color: "#fff" }}>
            Imagen 2
          </h4>

          <div style={{ flex: 1 }}>
            <PngVtkViewer pngSource={rightImage} />
          </div>

          <div style={{ marginTop: 8 }}>
            <input
              type="file"
              accept="image/png,image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  const url = URL.createObjectURL(e.target.files[0]);
                  setRightImage(url);
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompareImages;
