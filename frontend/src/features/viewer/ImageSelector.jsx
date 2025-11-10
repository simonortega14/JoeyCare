import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./viewer.css";

function ImageSelector({ onImageSelected }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pacientes, setPacientes] = useState([]);
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [ecografias, setEcografias] = useState([]);
  const [selectedEcografia, setSelectedEcografia] = useState(null);
  const [isLongitudinalMode, setIsLongitudinalMode] = useState(false);
  const [selectedEcografiaA, setSelectedEcografiaA] = useState(null);
  const [selectedEcografiaB, setSelectedEcografiaB] = useState(null);

  useEffect(() => {
    fetch("http://localhost:4000/api/neonatos")
      .then(res => res.json())
      .then(data => {
        setPacientes(data);

        // Verificar parámetros de URL para preseleccionar paciente y archivo
        const patientId = searchParams.get('patient');
        const fileName = searchParams.get('file');

        // Log para debugging (usa fileName para evitar warning)
        if (fileName) {
          console.log('Archivo especificado en URL:', fileName);
        }

        if (patientId) {
          const patient = data.find(p => p.id.toString() === patientId);
          if (patient) {
            setSelectedPaciente(patient);
          }
        }
      })
      .catch(() => setPacientes([{ id: 1, nombre: "Prueba", apellido: "Paciente" }]));
  }, [searchParams]);

  // Limpiar selecciones cuando se monta el componente (al volver desde el visor)
  // Solo si NO hay parámetros en la URL (es decir, si vino desde el selector normal)
  useEffect(() => {
    const patientId = searchParams.get('patient');
    const fileName = searchParams.get('file');

    if (!patientId && !fileName) {
      setSelectedPaciente(null);
      setSelectedEcografia(null);
      setSelectedEcografiaA(null);
      setSelectedEcografiaB(null);
      setIsLongitudinalMode(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedPaciente) {
      setEcografias([]);
      return;
    }
    fetch(`http://localhost:4000/api/neonatos/${selectedPaciente.id}/ecografias`)
      .then(res => res.json())
      .then(data => {
        setEcografias(data);

        // Si hay un archivo específico en los parámetros, seleccionarlo automáticamente
        const fileName = searchParams.get('file');
        if (fileName && data.length > 0) {
          const ecografia = data.find(ec => ec.filepath === fileName);
          if (ecografia) {
            setSelectedEcografia(ecografia);
            // Auto-visualizar después de un breve delay para que se renderice
            setTimeout(() => {
              onImageSelected(ecografia);
            }, 100);
          }
        }
      })
      .catch(() => setEcografias([]));
  }, [selectedPaciente, searchParams, onImageSelected]);

  const handleVisualize = () => {
    if (selectedEcografia) {
      onImageSelected(selectedEcografia);
    }
  };

  const handleLongitudinalAnalysis = () => {
  setIsLongitudinalMode(true);

  if (selectedEcografia) {
    setSelectedEcografiaA(selectedEcografia);
  }

};


  const handleVisualizeComparison = () => {
    if (selectedEcografiaA && selectedEcografiaB) {
      navigate("/comparar-ecografias", {
        state: { imagenIzquierda: selectedEcografiaA, imagenDerecha: selectedEcografiaB }
      });
    }
  };

  const handleBackToNormal = () => {
    setIsLongitudinalMode(false);
    setSelectedEcografiaA(null);
    setSelectedEcografiaB(null);
    setSelectedEcografia(null);
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
              setSelectedEcografiaA(null);
              setSelectedEcografiaB(null);
              setIsLongitudinalMode(false);
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

        {selectedPaciente && !isLongitudinalMode && (
          <>
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
                    {ec.filepath} - {new Date(ec.fecha_hora).toLocaleDateString()}
                  </option>
                ))}
              </select>
              {ecografias.length === 0 && (
                <p className="vtk-empty-text">No hay ecografías disponibles para este paciente</p>
              )}
            </div>

            <div className="vtk-form-section">
              {selectedEcografia && (
                <button className="vtk-visualize-button" onClick={handleVisualize}>
                  Visualizar Ecografía
                </button>
              )}
              {ecografias.length > 1 && (
                <button
                  className="vtk-visualize-button"
                  style={{ backgroundColor: "#2196f3", marginLeft: selectedEcografia ? "10px" : "0" }}
                  onClick={handleLongitudinalAnalysis}
                >
                  Análisis Longitudinal
                </button>
              )}
            </div>
          </>
        )}

        {selectedPaciente && isLongitudinalMode && (
          <>
            <div className="vtk-form-section">
              <button
                className="vtk-visualize-button"
                style={{ backgroundColor: "#666", marginBottom: "15px" }}
                onClick={handleBackToNormal}
              >
                ← Volver a modo normal
              </button>
              <h3 style={{ color: "#fff", marginBottom: "15px" }}>Selecciona dos ecografías para comparar</h3>
            </div>

            <div className="vtk-form-section">
              <label className="vtk-form-label">Ecografía A:</label>
              <select
                className="vtk-form-select"
                value={selectedEcografiaA?.id || ""}
                onChange={e => {
                  const ec = ecografias.find(ec => ec.id === parseInt(e.target.value));
                  setSelectedEcografiaA(ec || null);
                }}
              >
                <option value="">-- Selecciona ecografía A --</option>
                {ecografias.map(ec => (
                  <option key={ec.id} value={ec.id}>
                    {ec.filepath} - {new Date(ec.fecha_hora).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="vtk-form-section">
              <label className="vtk-form-label">Ecografía B:</label>
              <select
                className="vtk-form-select"
                value={selectedEcografiaB?.id || ""}
                onChange={e => {
                  const ec = ecografias.find(ec => ec.id === parseInt(e.target.value));
                  setSelectedEcografiaB(ec || null);
                }}
              >
                <option value="">-- Selecciona ecografía B --</option>
                {ecografias.map(ec => (
                  <option key={ec.id} value={ec.id}>
                    {ec.filepath} - {new Date(ec.fecha_hora).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            {selectedEcografiaA && selectedEcografiaB && (
              <div className="vtk-form-section">
                <button
                  className="vtk-visualize-button"
                  style={{ backgroundColor: "#4caf50" }}
                  onClick={handleVisualizeComparison}
                >
                  Visualizar Comparación
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ImageSelector;