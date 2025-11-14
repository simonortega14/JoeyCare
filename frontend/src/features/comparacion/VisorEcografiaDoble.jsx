import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ImageViewer from "../viewer/ImageViewer";
import "./VisorEcografiaDoble.css";

function VisorEcografiaDoble({ user, datosIzquierda = null, datosDerecha = null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [imagenIzquierda, setImagenIzquierda] = useState(null);
  const [imagenDerecha, setImagenDerecha] = useState(null);
  const [isReady, setIsReady] = useState(false);
  
  // Estados para controlar los modos de widgets
  const [pointMode, setPointMode] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [pointColor, setPointColor] = useState([1, 0, 0]);
  const [drawColor, setDrawColor] = useState([1, 0, 0]);
  const [lineWidth, setLineWidth] = useState(2);
  
  // Referencias a los viewers
  const LeftViewerRef = useRef(null);
  const RightViewerRef = useRef(null);

  useEffect(() => {
    console.log("=== VISOR DOBLE - INICIALIZANDO ===");
    console.log("location.state:", location.state);
    
    setIsReady(false);
    
    let izq = null;
    let der = null;
    
    if (location.state) {
      if (location.state.imagenIzquierda) {
        izq = location.state.imagenIzquierda;
      }
      if (location.state.imagenDerecha) {
        der = location.state.imagenDerecha;
      }
    }
    
    if (!izq && datosIzquierda) izq = datosIzquierda;
    if (!der && datosDerecha) der = datosDerecha;
    
    setImagenIzquierda(izq);
    setImagenDerecha(der);
    
    setTimeout(() => {
      setIsReady(true);
    }, 100);
    
  }, [location.state, datosIzquierda, datosDerecha]);

  const handleVolver = () => {
    navigate("/visualizar-ecografias");
  };

  const handleResetViewBoth = () => {
    // Disparar evento personalizado para ambos viewers
    window.dispatchEvent(new CustomEvent('resetView'));
  };

  const handleAutoWLBoth = () => {
    window.dispatchEvent(new CustomEvent('autoWindowLevel'));
  };

  const handleClearPointsLeft = () => {
    window.dispatchEvent(new CustomEvent('clearPoints', { detail: { side: 'left' } }));
  };

  const handleClearPointsRight = () => {
    window.dispatchEvent(new CustomEvent('clearPoints', { detail: { side: 'right' } }));
  };

  const handleClearPointsBoth = () => {
    window.dispatchEvent(new CustomEvent('clearPoints', { detail: { side: 'both' } }));
  };

  const handleClearDrawingsLeft = () => {
    window.dispatchEvent(new CustomEvent('clearDrawings', { detail: { side: 'left' } }));
  };

  const handleClearDrawingsRight = () => {
    window.dispatchEvent(new CustomEvent('clearDrawings', { detail: { side: 'right' } }));
  };

  const handleClearDrawingsBoth = () => {
    window.dispatchEvent(new CustomEvent('clearDrawings', { detail: { side: 'both' } }));
  };

  const togglePointMode = () => {
    const newMode = !pointMode;
    setPointMode(newMode);
    if (newMode) setDrawMode(false);
    window.dispatchEvent(new CustomEvent('setPointMode', { detail: { enabled: newMode } }));
  };

  const toggleDrawMode = () => {
    const newMode = !drawMode;
    setDrawMode(newMode);
    if (newMode) setPointMode(false);
    window.dispatchEvent(new CustomEvent('setDrawMode', { detail: { enabled: newMode } }));
  };

  const handlePointColorChange = (color) => {
    setPointColor(color);
    window.dispatchEvent(new CustomEvent('setPointColor', { detail: { color } }));
  };

  const handleDrawColorChange = (color) => {
    setDrawColor(color);
    window.dispatchEvent(new CustomEvent('setDrawColor', { detail: { color } }));
  };

  const handleLineWidthChange = (width) => {
    setLineWidth(width);
    window.dispatchEvent(new CustomEvent('setLineWidth', { detail: { width } }));
  };

  return (
    <div className="visor-doble-container">
      {/* Barra de herramientas unificada */}
      <div className="visor-toolbar-unified">
        <button onClick={handleVolver} className="visor-button">← Volver</button>
        <button onClick={handleResetViewBoth} className="visor-button">Reset View (Ambos)</button>
        <button onClick={handleAutoWLBoth} className="visor-button">Auto W/L (Ambos)</button>

        {/* Controles de Punto */}
        <button
          className={`visor-button ${pointMode ? 'point-active' : ''}`}
          onClick={togglePointMode}
        >
          📍 Punto {pointMode ? "ON" : "OFF"}
        </button>

        {pointMode && (
          <>
            <select
              value={pointColor.join(',')}
              onChange={(e) => handlePointColorChange(e.target.value.split(',').map(Number))}
              className="visor-select"
            >
              <option value="1,0,0">🔴 Rojo</option>
              <option value="0,1,0">🟢 Verde</option>
              <option value="0,0,1">🔵 Azul</option>
              <option value="1,1,0">🟡 Amarillo</option>
              <option value="1,0,1">🟣 Magenta</option>
              <option value="0,1,1">🔵 Cian</option>
              <option value="1,1,1">⚪ Blanco</option>
            </select>
            <button onClick={handleClearPointsLeft} className="visor-button">Limpiar Puntos (Izq)</button>
            <button onClick={handleClearPointsRight} className="visor-button">Limpiar Puntos (Der)</button>
            <button onClick={handleClearPointsBoth} className="visor-button">Limpiar Puntos (Ambos)</button>
          </>
        )}

        {/* Controles de Lápiz */}
        <button
          className={`visor-button ${drawMode ? 'draw-active' : ''}`}
          onClick={toggleDrawMode}
        >
          ✏️ Lápiz {drawMode ? "ON" : "OFF"}
        </button>

        {drawMode && (
          <>
            <select
              value={drawColor.join(',')}
              onChange={(e) => handleDrawColorChange(e.target.value.split(',').map(Number))}
              className="visor-select"
            >
              <option value="1,0,0">🔴 Rojo</option>
              <option value="0,1,0">🟢 Verde</option>
              <option value="0,0,1">🔵 Azul</option>
              <option value="1,1,0">🟡 Amarillo</option>
              <option value="1,0,1">🟣 Magenta</option>
              <option value="0,1,1">🔵 Cian</option>
              <option value="1,1,1">⚪ Blanco</option>
            </select>
            <select
              value={lineWidth}
              onChange={(e) => handleLineWidthChange(Number(e.target.value))}
              className="visor-select"
            >
              <option value="1">Fino</option>
              <option value="2">Normal</option>
              <option value="3">Grueso</option>
              <option value="5">Muy Grueso</option>
            </select>
            <button onClick={handleClearDrawingsLeft} className="visor-button">Limpiar Trazos (Izq)</button>
            <button onClick={handleClearDrawingsRight} className="visor-button">Limpiar Trazos (Der)</button>
            <button onClick={handleClearDrawingsBoth} className="visor-button">Limpiar Trazos (Ambos)</button>
          </>
        )}

        <span className="visor-title">
          Comparación de Ecografías
        </span>
      </div>

      {/* Contenido con ambos paneles */}
      <div className="visor-content">
        <div className="visor-panel">
          <h3 className="titulo-panel">Ecografía A</h3>
          {isReady && imagenIzquierda ? (
            <ImageViewer
              key={`left-${imagenIzquierda.id}`}
              imageFile={imagenIzquierda}
              onClose={() => {}}
              user={user}
              isEmbedded={true}
              side="left"
              externalPointMode={pointMode}
              externalDrawMode={drawMode}
              externalPointColor={pointColor}
              externalDrawColor={drawColor}
              externalLineWidth={lineWidth}
            />
          ) : (
            <div className="visor-placeholder">
              {!isReady ? 'Cargando...' : 'No hay imagen seleccionada'}
            </div>
          )}
        </div>

        <div className="visor-panel">
          <h3 className="titulo-panel">Ecografía B</h3>
          {isReady && imagenDerecha ? (
            <ImageViewer
              key={`right-${imagenDerecha.id}`}
              imageFile={imagenDerecha}
              onClose={() => {}}
              user={user}
              isEmbedded={true}
              side="right"
              externalPointMode={pointMode}
              externalDrawMode={drawMode}
              externalPointColor={pointColor}
              externalDrawColor={drawColor}
              externalLineWidth={lineWidth}
            />
          ) : (
            <div className="visor-placeholder">
              {!isReady ? 'Cargando...' : 'No hay imagen seleccionada'}
            </div>
          )}
        </div>
      </div>

      {/* Ayuda en la esquina inferior */}
      <div className="visor-help">
        {drawMode ? (
          <span className="visor-help-highlight draw">
            🖱️ Click izq + arrastrar: Dibujar | Rueda: Zoom
          </span>
        ) : pointMode ? (
          <span className="visor-help-highlight point">
            🖱️ Click izq: Colocar punto | Rueda: Zoom
          </span>
        ) : (
          <span>🖱️ Rueda: Zoom | Click izq: W/L</span>
        )}
      </div>
    </div>
  );
}

export default VisorEcografiaDoble;