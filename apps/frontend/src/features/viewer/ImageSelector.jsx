import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./viewer.css";

function getToken() {
  return localStorage.getItem("token") || "";
}

// Normaliza neonato como lo devuelve ms-usuarios
function normalizeNeonato(raw) {
  return {
    id:
      raw.id ||
      raw.id_neonato ||
      raw.uuid ||
      raw.ID ||
      "",
    nombres: raw.nombres || raw.nombre || "",
    apellidos: raw.apellidos || raw.apellido || "",
    documento:
      raw.documento ||
      raw.num_documento ||
      raw.numero_documento ||
      raw.identificacion ||
      "",
  };
}

// Normaliza ecografía como la devuelve ms-ecografias
function normalizeEcografia(raw) {
  return {
    id: raw.id,
    neonato_id: raw.neonato_id,
    timestamp: raw.timestamp || raw.fecha_hora || null,
    descripcion: raw.descripcion || raw.detalle || "",
  };
}

// ENDPOINTS detrás del gateway Nginx
const LIST_NEONATOS_URL = "/api/usuarios/neonatos";
const LIST_ECOGRAFIAS_URL = (neonatoId) =>
  `/api/ecografias/neonatos/${encodeURIComponent(
    neonatoId
  )}`;

function ImageSelector({ onImageSelected }) {
  const navigate = useNavigate();

  // Estado pacientes
  const [pacientes, setPacientes] = useState([]);
  const [loadingPacientes, setLoadingPacientes] = useState(true);
  const [errorPacientes, setErrorPacientes] = useState(null);
  const [selectedPaciente, setSelectedPaciente] = useState(null);

  // Estado ecografías
  const [ecografias, setEcografias] = useState([]);
  const [loadingEcos, setLoadingEcos] = useState(false);
  const [selectedEcografia, setSelectedEcografia] = useState(null);

  // Modo comparación
  const [isLongitudinalMode, setIsLongitudinalMode] = useState(false);
  const [selectedEcografiaA, setSelectedEcografiaA] = useState(null);
  const [selectedEcografiaB, setSelectedEcografiaB] = useState(null);

  // 1. cargar neonatos al inicio
  useEffect(() => {
    const fetchNeonatos = async () => {
      try {
        setLoadingPacientes(true);
        setErrorPacientes(null);

        const resp = await fetch(LIST_NEONATOS_URL, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
        });

        if (!resp.ok) {
          throw new Error(`Error ${resp.status} cargando neonatos`);
        }

        const data = await resp.json();
        const lista = Array.isArray(data)
          ? data
          : Array.isArray(data.items)
          ? data.items
          : [];
        const normalizados = lista.map(normalizeNeonato);
        setPacientes(normalizados);
      } catch (err) {
        console.error("[ImageSelector] neonatos error:", err);
        setErrorPacientes("No se pudieron cargar los neonatos.");
        setPacientes([]);
      } finally {
        setLoadingPacientes(false);
      }
    };

    fetchNeonatos();
  }, []);

  // 2. cargar ecografías cuando cambia el paciente seleccionado
  useEffect(() => {
    const fetchEcografias = async () => {
      if (!selectedPaciente?.id) {
        setEcografias([]);
        setSelectedEcografia(null);
        setSelectedEcografiaA(null);
        setSelectedEcografiaB(null);
        setIsLongitudinalMode(false);
        return;
      }

      try {
        setLoadingEcos(true);

        const resp = await fetch(
          LIST_ECOGRAFIAS_URL(selectedPaciente.id),
          {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${getToken()}`,
            },
          }
        );

        if (!resp.ok) {
          console.error(
            "[ImageSelector] ecografias status:",
            resp.status
          );
          setEcografias([]);
          return;
        }

        const raw = await resp.json();
        const normalizadas = Array.isArray(raw)
          ? raw.map(normalizeEcografia)
          : [];
        setEcografias(normalizadas);
      } catch (err) {
        console.error("[ImageSelector] ecografias error:", err);
        setEcografias([]);
      } finally {
        setLoadingEcos(false);
      }
    };

    fetchEcografias();
  }, [selectedPaciente]);

  // 3. Ver UNA sola eco
  const handleVisualize = () => {
    if (!selectedEcografia) return;

    onImageSelected({
      neonatoId: selectedEcografia.neonato_id,
      ecografiaId: selectedEcografia.id,
      descripcion: selectedEcografia.descripcion,
      timestamp: selectedEcografia.timestamp,
    });
  };

  // 4. Activar modo longitudinal
  const handleLongitudinalAnalysis = () => {
    setIsLongitudinalMode(true);
    setSelectedEcografia(null);
  };

  // 5. Ir a la pantalla de comparación lado a lado
  const handleVisualizeComparison = () => {
    if (selectedEcografiaA && selectedEcografiaB) {
      navigate("/comparar-ecografias", {
        state: {
          imagenIzquierda: {
            neonatoId: selectedEcografiaA.neonato_id,
            ecografiaId: selectedEcografiaA.id,
            descripcion: selectedEcografiaA.descripcion,
            timestamp: selectedEcografiaA.timestamp,
          },
          imagenDerecha: {
            neonatoId: selectedEcografiaB.neonato_id,
            ecografiaId: selectedEcografiaB.id,
            descripcion: selectedEcografiaB.descripcion,
            timestamp: selectedEcografiaB.timestamp,
          },
        },
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

        {errorPacientes && (
          <p
            style={{
              color: "orange",
              marginBottom: "10px",
              fontSize: "0.9rem",
              textAlign: "center",
            }}
          >
            {errorPacientes}
          </p>
        )}

        {/* Selección de paciente */}
        <div className="vtk-form-section">
          <label className="vtk-form-label">Seleccionar Paciente:</label>

          <select
            className="vtk-form-select"
            disabled={loadingPacientes}
            value={selectedPaciente?.id || ""}
            onChange={(e) => {
              const value = e.target.value;
              const pac = pacientes.find(
                (p) => String(p.id) === String(value)
              );

              setSelectedPaciente(pac || null);
              setSelectedEcografia(null);
              setSelectedEcografiaA(null);
              setSelectedEcografiaB(null);
              setIsLongitudinalMode(false);
            }}
          >
            <option value="">
              {loadingPacientes
                ? "Cargando pacientes..."
                : "-- Selecciona un paciente --"}
            </option>

            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.documento ? `[${p.documento}] ` : ""}
                {p.nombres} {p.apellidos} (ID: {p.id})
              </option>
            ))}
          </select>
        </div>

        {/* --- Modo normal (una ecografía) --- */}
        {selectedPaciente && !isLongitudinalMode && (
          <>
            <div className="vtk-form-section">
              <label className="vtk-form-label">Seleccionar Ecografía:</label>

              <select
                className="vtk-form-select"
                disabled={loadingEcos}
                value={selectedEcografia?.id || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  const eco = ecografias.find(
                    (ec) => String(ec.id) === String(value)
                  );
                  setSelectedEcografia(eco || null);
                }}
              >
                <option value="">
                  {loadingEcos
                    ? "Cargando ecografías..."
                    : "-- Selecciona una ecografía --"}
                </option>

                {ecografias.map((ec) => (
                  <option key={ec.id} value={ec.id}>
                    {ec.descripcion || "Sin descripción"}
                    {ec.timestamp
                      ? ` - ${new Date(ec.timestamp).toLocaleString()}`
                      : ""}
                  </option>
                ))}
              </select>

              {!loadingEcos && ecografias.length === 0 && (
                <p className="vtk-empty-text">
                  No hay ecografías disponibles para este paciente.
                </p>
              )}
            </div>

            <div className="vtk-form-section">
              {selectedEcografia && (
                <button
                  className="vtk-visualize-button"
                  onClick={handleVisualize}
                >
                  Visualizar Ecografía
                </button>
              )}

              {ecografias.length > 1 && (
                <button
                  className="vtk-visualize-button"
                  style={{
                    backgroundColor: "#2196f3",
                    marginLeft: selectedEcografia ? "10px" : "0",
                  }}
                  onClick={handleLongitudinalAnalysis}
                >
                  Análisis Longitudinal
                </button>
              )}
            </div>
          </>
        )}

        {/* --- Modo longitudinal (comparar 2 ecos) --- */}
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
              <h3
                style={{
                  color: "#fff",
                  marginBottom: "15px",
                  textAlign: "center",
                }}
              >
                Selecciona dos ecografías para comparar
              </h3>
            </div>

            <div className="vtk-form-section">
              <label className="vtk-form-label">Ecografía A:</label>

              <select
                className="vtk-form-select"
                value={selectedEcografiaA?.id || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  const ecoA = ecografias.find(
                    (ec) => String(ec.id) === String(value)
                  );
                  setSelectedEcografiaA(ecoA || null);
                }}
              >
                <option value="">-- Selecciona ecografía A --</option>

                {ecografias.map((ec) => (
                  <option key={ec.id} value={ec.id}>
                    {ec.descripcion || "Sin descripción"}
                    {ec.timestamp
                      ? ` - ${new Date(ec.timestamp).toLocaleString()}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="vtk-form-section">
              <label className="vtk-form-label">Ecografía B:</label>

              <select
                className="vtk-form-select"
                value={selectedEcografiaB?.id || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  const ecoB = ecografias.find(
                    (ec) => String(ec.id) === String(value)
                  );
                  setSelectedEcografiaB(ecoB || null);
                }}
              >
                <option value="">-- Selecciona ecografía B --</option>

                {ecografias.map((ec) => (
                  <option key={ec.id} value={ec.id}>
                    {ec.descripcion || "Sin descripción"}
                    {ec.timestamp
                      ? ` - ${new Date(ec.timestamp).toLocaleString()}`
                      : ""}
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
