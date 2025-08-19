import React, { useState } from "react";

export default function App() {
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  return (
    <div style={{ background: "#111", height: "100vh", width: "100vw", overflow: "hidden" }}>
      {/* Panel de controles */}
      <div
        style={{
          padding: "10px",
          background: "#222",
          color: "white",
          display: "flex",
          gap: "20px",
          justifyContent: "center",
          flexWrap: "wrap",
          position: "fixed",
          top: 0,
          width: "100%",
          zIndex: 10,
        }}
      >
        <div>
          <label>🔍 Zoom </label>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
          />
        </div>
        <div>
          <label>☀️ Brillo </label>
          <input
            type="range"
            min="50"
            max="200"
            value={brightness}
            onChange={(e) => setBrightness(parseInt(e.target.value))}
          />
        </div>
        <div>
          <label>🎨 Contraste </label>
          <input
            type="range"
            min="50"
            max="200"
            value={contrast}
            onChange={(e) => setContrast(parseInt(e.target.value))}
          />
        </div>
        <div>
          <label>↔️ Pan X </label>
          <input
            type="range"
            min="-500"
            max="500"
            step="5"
            value={offset.x}
            onChange={(e) => setOffset({ ...offset, x: parseInt(e.target.value) })}
          />
        </div>
        <div>
          <label>↕️ Pan Y </label>
          <input
            type="range"
            min="-500"
            max="500"
            step="5"
            value={offset.y}
            onChange={(e) => setOffset({ ...offset, y: parseInt(e.target.value) })}
          />
        </div>
      </div>

      {/* Visor de imagen en pantalla completa */}
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "black",
        }}
      >
        <img
          src="/test.png"
          alt="test"
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            transform: `scale(${zoom}) translate(${offset.x / 10}px, ${offset.y / 10}px)`,
            filter: `brightness(${brightness}%) contrast(${contrast}%)`,
            transition: "0.2s",
          }}
        />
      </div>
    </div>
  );
}
