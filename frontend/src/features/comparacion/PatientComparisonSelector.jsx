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
    <div className="comparison-overlay">
      <div className="comparison-modal">
        <h3 className="comparison-title">Seleccionar ecografías para comparar</h3>
        <p className="comparison-subtitle">
          Elige una ecografía de cada paciente para comparar.
        </p>

        <div className="comparison-patients-row">
          {/* Paciente 1 */}
          <div className="comparison-patient-section">
            <h4 className="comparison-patient-name">
              {paciente1.nombre} {paciente1.apellido}
            </h4>
            <select
              className="comparison-select"
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
              <p className="comparison-no-data">
                No hay ecografías disponibles
              </p>
            )}
          </div>

          {/* Paciente 2 */}
          <div className="comparison-patient-section">
            <h4 className="comparison-patient-name">
              {paciente2.nombre} {paciente2.apellido}
            </h4>
            <select
              className="comparison-select"
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
              <p className="comparison-no-data">
                No hay ecografías disponibles
              </p>
            )}
          </div>
        </div>

        <div className="comparison-buttons-row">
          <button
            onClick={onClose}
            className="comparison-button"
          >
            Cancelar
          </button>
          <button
            onClick={handleCompare}
            disabled={!selectedEcografia1 || !selectedEcografia2}
            className={`comparison-button primary ${(!selectedEcografia1 || !selectedEcografia2) ? 'disabled' : ''}`}
          >
            Comparar
          </button>
        </div>
      </div>
    </div>
  );
}

export default PatientComparisonSelector;