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
        maxWidth: "600px",
        width: "90%",
        maxHeight: "80vh",
        overflowY: "auto"
      }}>
        <h3 style={{ color: "#fff", marginTop: 0 }}>Seleccionar ecografías para comparar</h3>
        <p style={{ color: "#ccc", marginBottom: "20px" }}>
          Elige una ecografía de cada paciente para comparar.
        </p>

        <div style={{ display: "flex", gap: "20px" }}>
          {/* Paciente 1 */}
          <div style={{ flex: 1 }}>
            <h4 style={{ color: "#fff", marginBottom: "10px" }}>
              {paciente1.nombre} {paciente1.apellido}
            </h4>
            <select
              style={{
                width: "100%",
                padding: "8px",
                backgroundColor: "#555",
                color: "#fff",
                border: "1px solid #777",
                borderRadius: "4px"
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
              <p style={{ color: "#ccc", fontSize: "14px", marginTop: "5px" }}>
                No hay ecografías disponibles
              </p>
            )}
          </div>

          {/* Paciente 2 */}
          <div style={{ flex: 1 }}>
            <h4 style={{ color: "#fff", marginBottom: "10px" }}>
              {paciente2.nombre} {paciente2.apellido}
            </h4>
            <select
              style={{
                width: "100%",
                padding: "8px",
                backgroundColor: "#555",
                color: "#fff",
                border: "1px solid #777",
                borderRadius: "4px"
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
              <p style={{ color: "#ccc", fontSize: "14px", marginTop: "5px" }}>
                No hay ecografías disponibles
              </p>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
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
            disabled={!selectedEcografia1 || !selectedEcografia2}
            style={{
              padding: "8px 16px",
              backgroundColor: (selectedEcografia1 && selectedEcografia2) ? "#4caf50" : "#444",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: (selectedEcografia1 && selectedEcografia2) ? "pointer" : "not-allowed"
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