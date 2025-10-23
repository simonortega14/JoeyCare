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
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.8)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10000
    }}>
      <div style={{
        backgroundColor: "#333",
        padding: "20px",
        borderRadius: "8px",
        maxWidth: "500px",
        width: "90%",
        maxHeight: "80vh",
        overflowY: "auto"
      }}>
        <h3 style={{ color: "#fff", marginTop: 0 }}>Seleccionar imagen para comparar</h3>
        <p style={{ color: "#ccc", marginBottom: "20px" }}>
          Imagen actual: <strong>{currentImage?.filename || currentImage?.filepath || 'Sin nombre'}</strong>
        </p>
        <p style={{ color: "#ccc", marginBottom: "20px" }}>
          Elige una ecografía de otro paciente para comparar con la imagen actual.
        </p>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ color: "#fff", display: "block", marginBottom: "5px" }}>
            Paciente:
          </label>
          <select
            style={{
              width: "100%",
              padding: "8px",
              backgroundColor: "#555",
              color: "#fff",
              border: "1px solid #777",
              borderRadius: "4px"
            }}
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
          <div style={{ marginBottom: "15px" }}>
            <label style={{ color: "#fff", display: "block", marginBottom: "5px" }}>
              Ecografía:
            </label>
            <select
              style={{
                width: "100%",
                padding: "8px",
                backgroundColor: "#555",
                color: "#fff",
                border: "1px solid #777",
                borderRadius: "4px"
              }}
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
              <p style={{ color: "#ccc", fontSize: "14px", marginTop: "5px" }}>
                No hay ecografías disponibles para este paciente
              </p>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              backgroundColor: "#666",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleCompare}
            disabled={!selectedEcografia}
            style={{
              padding: "8px 16px",
              backgroundColor: selectedEcografia ? "#4caf50" : "#444",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: selectedEcografia ? "pointer" : "not-allowed"
            }}
          >
            Comparar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImageComparisonSelector;