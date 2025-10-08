import { useState, useEffect } from "react";
import "./viewer.css";

function ImageSelector({ onImageSelected }) {
  const [pacientes, setPacientes] = useState([]);
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [ecografias, setEcografias] = useState([]);
  const [selectedEcografia, setSelectedEcografia] = useState(null);

  useEffect(() => {
    fetch("http://localhost:4000/api/pacientes")
      .then(res => res.json())
      .then(setPacientes)
      .catch(() => setPacientes([{ id: 1, nombre: "Prueba", apellido: "Paciente" }]));
  }, []);

  useEffect(() => {
    if (!selectedPaciente) {
      setEcografias([]);
      return;
    }
    fetch(`http://localhost:4000/api/pacientes/${selectedPaciente.id}/ecografias`)
      .then(res => res.json())
      .then(setEcografias)
      .catch(() => setEcografias([]));
  }, [selectedPaciente]);

  const handleVisualize = () => {
    if (selectedEcografia) {
      onImageSelected(selectedEcografia);
    }
  };

  return (
    <div className="vtk-page-container">
      <div className="vtk-selection-wrapper">
        <h2 className="vtk-main-title">Visualizar Ecografías</h2>
        
        <div className="vtk-form-section">
          <label className="vtk-form-label">Seleccionar Paciente:</label>
          <select
            className="vtk-form-select"
            value={selectedPaciente?.id || ""}
            onChange={e => {
              const p = pacientes.find(p => p.id === parseInt(e.target.value));
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
          <div className="vtk-form-section">
            <label className="vtk-form-label">Seleccionar Ecografía:</label>
            <select
              className="vtk-form-select"
              value={selectedEcografia?.id || ""}
              onChange={e => {
                const ec = ecografias.find(ec => ec.id === parseInt(e.target.value));
                setSelectedEcografia(ec || null);
              }}
            >
              <option value="">-- Selecciona una ecografía --</option>
              {ecografias.map(ec => (
                <option key={ec.id} value={ec.id}>
                  {ec.filename} - {new Date(ec.uploaded_at).toLocaleDateString()}
                </option>
              ))}
            </select>
            {ecografias.length === 0 && (
              <p className="vtk-empty-text">No hay ecografías disponibles para este paciente</p>
            )}
          </div>
        )}

        {selectedEcografia && (
          <div className="vtk-form-section">
            <button className="vtk-visualize-button" onClick={handleVisualize}>
              Visualizar Ecografía
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImageSelector;