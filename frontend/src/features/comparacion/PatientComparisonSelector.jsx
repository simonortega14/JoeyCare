import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function PatientComparisonSelector({ selectedPacientes, onClose }) {
  const navigate = useNavigate();
  const [ecografiasPaciente1, setEcografiasPaciente1] = useState([]);
  const [ecografiasPaciente2, setEcografiasPaciente2] = useState([]);
  const [selectedEcografia1, setSelectedEcografia1] = useState(null);
  const [selectedEcografia2, setSelectedEcografia2] = useState(null);

  const paciente1 = selectedPacientes[0];
  const paciente2 = selectedPacientes[1];

  useEffect(() => {
    if (paciente1) {
      fetch(`http://localhost:4000/api/neonatos/${paciente1.id}/ecografias`)
        .then(res => res.json())
        .then(setEcografiasPaciente1)
        .catch(() => setEcografiasPaciente1([]));
    }
  }, [paciente1]);

  useEffect(() => {
    if (paciente2) {
      fetch(`http://localhost:4000/api/neonatos/${paciente2.id}/ecografias`)
        .then(res => res.json())
        .then(setEcografiasPaciente2)
        .catch(() => setEcografiasPaciente2([]));
    }
  }, [paciente2]);

  const handleCompare = () => {
    if (selectedEcografia1 && selectedEcografia2) {
      navigate("/comparar-ecografias", {
        state: { imagenIzquierda: selectedEcografia1, imagenDerecha: selectedEcografia2 }
      });
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10000
    }}>
      <div style={{
        backgroundColor: "#F5FFFF",
        padding: "20px",
        borderRadius: "15px",
        maxWidth: "600px",
        width: "90%",
        maxHeight: "80vh",
        overflowY: "auto",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
        borderLeft: "5px solid #2196f3"
      }}>
        <h3 style={{
          color: "#1565c0",
          fontSize: "2rem",
          fontWeight: 800,
          marginTop: 0,
          marginBottom: "10px"
        }}>Seleccionar ecografías para comparar</h3>
        <p style={{
          color: "#666",
          marginBottom: "20px",
          fontSize: "1rem",
          fontWeight: 500
        }}>
          Elige una ecografía de cada paciente para comparar.
        </p>

        <div style={{ display: "flex", gap: "20px" }}>
          {/* Paciente 1 */}
          <div style={{ flex: 1 }}>
            <h4 style={{
              color: "#1565c0",
              fontSize: "1.2rem",
              fontWeight: 700,
              marginBottom: "10px"
            }}>
              {paciente1.nombre} {paciente1.apellido}
            </h4>
            <select
              style={{
                width: "100%",
                padding: "8px",
                backgroundColor: "#f8f9fa",
                color: "#000000",
                border: "2px solid #2196f3",
                borderRadius: "8px",
                fontSize: "14px",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                outline: "none"
              }}
              value={selectedEcografia1?.id || ""}
              onChange={e => {
                const ec = ecografiasPaciente1.find(ec => ec.id === parseInt(e.target.value));
                setSelectedEcografia1(ec || null);
              }}
            >
              <option value="">-- Selecciona ecografía --</option>
              {ecografiasPaciente1.map(ec => (
                <option key={ec.id} value={ec.id}>
                  {ec.filepath} - {new Date(ec.fecha_hora).toLocaleDateString()}
                </option>
              ))}
            </select>
            {ecografiasPaciente1.length === 0 && (
              <p style={{
                color: "#666",
                fontSize: "14px",
                marginTop: "5px",
                fontWeight: 500
              }}>
                No hay ecografías disponibles
              </p>
            )}
          </div>

          {/* Paciente 2 */}
          <div style={{ flex: 1 }}>
            <h4 style={{
              color: "#1565c0",
              fontSize: "1.2rem",
              fontWeight: 700,
              marginBottom: "10px"
            }}>
              {paciente2.nombre} {paciente2.apellido}
            </h4>
            <select
              style={{
                width: "100%",
                padding: "8px",
                backgroundColor: "#f8f9fa",
                color: "#000000",
                border: "2px solid #2196f3",
                borderRadius: "8px",
                fontSize: "14px",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                outline: "none"
              }}
              value={selectedEcografia2?.id || ""}
              onChange={e => {
                const ec = ecografiasPaciente2.find(ec => ec.id === parseInt(e.target.value));
                setSelectedEcografia2(ec || null);
              }}
            >
              <option value="">-- Selecciona ecografía --</option>
              {ecografiasPaciente2.map(ec => (
                <option key={ec.id} value={ec.id}>
                  {ec.filepath} - {new Date(ec.fecha_hora).toLocaleDateString()}
                </option>
              ))}
            </select>
            {ecografiasPaciente2.length === 0 && (
              <p style={{
                color: "#666",
                fontSize: "14px",
                marginTop: "5px",
                fontWeight: 500
              }}>
                No hay ecografías disponibles
              </p>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
          <button
            onClick={onClose}
            style={{
              padding: "12px 24px",
              backgroundColor: "#2196f3",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "20px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 600,
              transition: "background-color 0.3s ease, transform 0.2s ease",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleCompare}
            disabled={!selectedEcografia1 || !selectedEcografia2}
            style={{
              padding: "12px 24px",
              backgroundColor: (selectedEcografia1 && selectedEcografia2) ? "#4caf50" : "#cccccc",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "20px",
              cursor: (selectedEcografia1 && selectedEcografia2) ? "pointer" : "not-allowed",
              fontSize: "14px",
              fontWeight: 600,
              transition: "background-color 0.3s ease, transform 0.2s ease",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
            }}
          >
            Comparar
          </button>
        </div>
      </div>
    </div>
  );
}

export default PatientComparisonSelector;