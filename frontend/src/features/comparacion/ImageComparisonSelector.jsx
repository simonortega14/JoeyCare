import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function ImageComparisonSelector({ currentImage, onClose }) {
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState([]);
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [ecografias, setEcografias] = useState([]);
  const [selectedEcografia, setSelectedEcografia] = useState(null);

  useEffect(() => {
    console.log("=== IMAGE COMPARISON SELECTOR ===");
    console.log("currentImage:", currentImage);
    
    fetch("http://localhost:4000/api/neonatos")
      .then(res => res.json())
      .then(data => {
        console.log("Pacientes cargados:", data);
        setPacientes(data);
      })
      .catch(err => {
        console.error("Error cargando pacientes:", err);
        setPacientes([{ id: 1, nombre: "Prueba", apellido: "Paciente" }]);
      });
  }, [currentImage]);

  useEffect(() => {
    if (!selectedPaciente) {
      setEcografias([]);
      return;
    }
    console.log("Cargando ecografías para paciente:", selectedPaciente.id);
    
    fetch(`http://localhost:4000/api/neonatos/${selectedPaciente.id}/ecografias`)
      .then(res => res.json())
      .then(data => {
        console.log("Ecografías cargadas:", data);
        setEcografias(data);
      })
      .catch(err => {
        console.error("Error cargando ecografías:", err);
        setEcografias([]);
      });
  }, [selectedPaciente]);

  const handleCompare = () => {
    console.log("=== INICIANDO COMPARACIÓN ===");
    console.log("Imagen izquierda (current):", currentImage);
    console.log("Imagen derecha (selected):", selectedEcografia);
    
    if (selectedEcografia && currentImage) {
      navigate("/comparar-ecografias", {
        state: { 
          imagenIzquierda: currentImage, 
          imagenDerecha: selectedEcografia 
        }
      });
    } else {
      console.error("Faltan imágenes para comparar");
    }
  };

  return (
    <div className="image-comparison-overlay">
      <div className="image-comparison-modal">
        <h3 className="image-comparison-title">Seleccionar imagen para comparar</h3>
        <p className="image-comparison-text">
          Imagen actual: <strong>{currentImage?.filename || currentImage?.filepath || 'Sin nombre'}</strong>
        </p>
        <p className="image-comparison-text">
          Elige una ecografía de otro paciente para comparar con la imagen actual.
        </p>

        <div className="image-comparison-section">
          <label className="image-comparison-label">
            Paciente:
          </label>
          <select
            className="image-comparison-select"
            value={selectedPaciente?.id || ""}
            onChange={e => {
              const p = pacientes.find(p => p.id === parseInt(e.target.value));
              console.log("Paciente seleccionado:", p);
              setSelectedPaciente(p || null);
              setSelectedEcografia(null);
            }}
          >
            <option value="">-- Selecciona un paciente --</option>
            {pacientes.map(p => (
              <option key={p.id} value={p.id}>
                {p.nombre} {p.apellido} (ID: {p.id})
              </option>
            ))}
          </select>
        </div>

        {selectedPaciente && (
          <div className="image-comparison-section">
            <label className="image-comparison-label">
              Ecografía:
            </label>
            <select
              className="image-comparison-select"
              value={selectedEcografia?.id || ""}
              onChange={e => {
                const ec = ecografias.find(ec => ec.id === parseInt(e.target.value));
                console.log("Ecografía seleccionada:", ec);
                setSelectedEcografia(ec || null);
              }}
            >
              <option value="">-- Selecciona una ecografía --</option>
              {ecografias.map(ec => (
                <option key={ec.id} value={ec.id}>
                  {ec.filename || ec.filepath} - {new Date(ec.uploaded_at || ec.fecha_hora).toLocaleDateString()}
                </option>
              ))}
            </select>
            {ecografias.length === 0 && (
              <p className="image-comparison-no-data">
                No hay ecografías disponibles para este paciente
              </p>
            )}
          </div>
        )}

        <div className="image-comparison-buttons-row">
          <button
            onClick={onClose}
            className="image-comparison-button"
          >
            Cancelar
          </button>
          <button
            onClick={handleCompare}
            disabled={!selectedEcografia}
            className={`image-comparison-button primary ${!selectedEcografia ? 'disabled' : ''}`}
          >
            Comparar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImageComparisonSelector;