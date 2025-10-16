import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import VtkViewer from "../viewer/VtkViewer";
import "./VisorEcografiaDoble.css"; // estilos para el layout


function VisorEcografiaDoble({ datosIzquierda = null, datosDerecha = null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [imagenIzquierda, setImagenIzquierda] = useState(datosIzquierda);
  const [imagenDerecha, setImagenDerecha] = useState(datosDerecha);

  useEffect(() => {
    // Si se pasan imágenes desde la navegación, úsalas
    if (location.state) {
      if (location.state.imagenIzquierda) setImagenIzquierda(location.state.imagenIzquierda);
      if (location.state.imagenDerecha) setImagenDerecha(location.state.imagenDerecha);
    }
  }, [location.state]);

  const handleVolver = () => {
    navigate("/visualizar-ecografias");
  };

  return (
    <div className="visor-doble-container">
      <div className="visor-toolbar">
        <button onClick={handleVolver}>← Volver</button>
        <h2 style={{ margin: "0 auto", color: "#fff" }}>Comparación de Ecografías</h2>
      </div>
      <div className="visor-content">
        <div className="visor-panel">
          <h3 className="titulo-panel">Ecografía A</h3>
          <VtkViewer defaultImage={imagenIzquierda} />
        </div>

        <div className="visor-panel">
          <h3 className="titulo-panel">Ecografía B</h3>
          <VtkViewer defaultImage={imagenDerecha} />
        </div>
      </div>
    </div>
  );
}

export default VisorEcografiaDoble;
