import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./viewer.css";

// ======================
// util que ya usas en CargarEcografiaPage
// ======================
function getAuthHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// misma normalización de neonato que usas en CargarEcografiaPage
function normalizeNeonato(raw) {
  return {
    id: raw.id || raw.id_neonato || raw.uuid || raw.ID || "",
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

// normalización muy básica de ecografía
function normalizeEcografia(raw) {
  return {
    id: raw.id || raw.id_ecografia || raw.uuid || "",
    filepath: raw.filepath || raw.filename || raw.file_url || "",
    fecha_hora: raw.fecha_hora || raw.fecha || raw.created_at || null,
    size_bytes: raw.size_bytes || raw.tamano || null,
  };
}

function ImageSelector({ onImageSelected }) {
  const navigate = useNavigate();

  // estado
  const [pacientes, setPacientes] = useState([]);
  const [loadingPacientes, setLoadingPacientes] = useState(true);
  const [errorPacientes, setErrorPacientes] = useState(null);

  const [selectedPaciente, setSelectedPaciente] = useState(null);

  const [ecografias, setEcografias] = useState([]);
  const [loadingEcos, setLoadingEcos] = useState(false);
  const [selectedEcografia, setSelectedEcografia] = useState(null);

  const [isLongitudinalMode, setIsLongitudinalMode] = useState(false);
  const [selectedEcografiaA, setSelectedEcografiaA] = useState(null);
  const [selectedEcografiaB, setSelectedEcografiaB] = useState(null);

  // ======================
  // ENDPOINTS REALES que ya funcionan en tu app
  // ======================
  const NEONATOS_PATH = "/api/usuarios/neonatos";
  const ECO_LIST_URL = "/api/ecografias"; // GET ?neonato_id=...&page=1&size=50

  // 1. cargar lista de pacientes/neonatos al inicio (igual que CargarEcografiaPage)
  useEffect(() => {
    const fetchPacientes = async () => {
      try {
        setLoadingPacientes(true);
        setErrorPacientes(null);

        const resp = await fetch(NEONATOS_PATH, {
          headers: {
            Accept: "application/json",
            ...getAuthHeader(),
          },
        });

        if (resp.status === 401) {
          // sesión expirada
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          throw new Error("Sesión expirada. Ingresa de nuevo.");
        }

        if (!resp.ok) {
          throw new Error(`Error ${resp.status} al obtener neonatos`);
        }

        const data = await resp.json();

        // en tu código original haces:
        // const list = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.items)
          ? data.items
          : [];

        // normalizamos
        const normalizados = list.map(normalizeNeonato);
        setPacientes(normalizados);
      } catch (err) {
        console.error("Error cargando neonatos:", err);
        setErrorPacientes(
          "No se pudieron cargar los neonatos, usando datos de prueba."
        );
        setPacientes(
          [
            {
              id: "123",
              nombres: "Bebé",
              apellidos: "García",
              documento: "—",
            },
            {
              id: "456",
              nombres: "Bebé",
              apellidos: "Rodríguez",
              documento: "—",
            },
            {
              id: "789",
              nombres: "Bebé",
              apellidos: "López",
              documento: "—",
            },
          ].map(normalizeNeonato)
        );
      } finally {
        setLoadingPacientes(false);
      }
    };

    fetchPacientes();
  }, []);

  // 2. cuando seleccionamos un paciente, traemos sus ecografías
  useEffect(() => {
    if (!selectedPaciente || !selectedPaciente.id) {
      setEcografias([]);
      setSelectedEcografia(null);
      setSelectedEcografiaA(null);
      setSelectedEcografiaB(null);
      return;
    }

    const fetchEcografias = async () => {
      try {
        setLoadingEcos(true);

        const url = `${ECO_LIST_URL}?neonato_id=${encodeURIComponent(
          selectedPaciente.id
        )}&page=1&size=50`;

        const resp = await fetch(url, {
          headers: {
            Accept: "application/json",
            ...getAuthHeader(),
          },
        });

        if (!resp.ok) {
          console.error(
            "Error cargando ecografías:",
            resp.status,
            resp.statusText
          );
          setEcografias([]);
          return;
        }

        const data = await resp.json();
        // en tu otra pantalla asumís { items: [...] }
        const items = Array.isArray(data.items) ? data.items : [];

        const ecosNormalizadas = items.map(normalizeEcografia);
        setEcografias(ecosNormalizadas);
      } catch (err) {
        console.error("Excepción cargando ecografías:", err);
        setEcografias([]);
      } finally {
        setLoadingEcos(false);
      }
    };

    fetchEcografias();
  }, [selectedPaciente]);

  // abrir visor simple
  const handleVisualize = () => {
    if (selectedEcografia) {
      // pasamos el objeto ecografía tal cual al visor vtk
      onImageSelected(selectedEcografia);
    }
  };

  const handleLongitudinalAnalysis = () => {
    setIsLongitudinalMode(true);
    setSelectedEcografia(null);
  };

  const handleVisualizeComparison = () => {
    if (selectedEcografiaA && selectedEcografiaB) {
      navigate("/comparar-ecografias", {
        state: {
          imagenIzquierda: selectedEcografiaA,
          imagenDerecha: selectedEcografiaB,
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

  // ======================
  // RENDER
  // ======================

  return (
    <div className="vtk-page-container">
      <div className="vtk-selection-wrapper">
        <h2 className="vtk-main-title">Visualizar Ecografías</h2>

        {/* mostrar si hubo error al cargar pacientes */}
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

        {/* === Seleccionar Paciente === */}
        <div className="vtk-form-section">
          <label className="vtk-form-label">Seleccionar Paciente:</label>

          <select
            className="vtk-form-select"
            disabled={loadingPacientes}
            value={selectedPaciente?.id || ""}
            onChange={(e) => {
              const value = e.target.value;

              // buscamos ese paciente ya normalizado
              const pac = pacientes.find(
                (p) => String(p.id) === String(value)
              );

              setSelectedPaciente(pac || null);

              // reseteamos selección de ecos
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
                {/* Documento + nombre tal como te gusta en la otra pantalla */}
                {p.documento ? `[${p.documento}] ` : ""}
                {p.nombres} {p.apellidos} (ID: {p.id})
              </option>
            ))}
          </select>
        </div>

        {/* === Seleccionar Ecografía (modo normal) === */}
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
                    {ec.filepath || "sin nombre"}{" "}
                    {ec.fecha_hora
                      ? `- ${new Date(ec.fecha_hora).toLocaleString()}`
                      : ""}
                  </option>
                ))}
              </select>

              {!loadingEcos && ecografias.length === 0 && (
                <p className="vtk-empty-text">
                  No hay ecografías disponibles para este paciente
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

        {/* === Modo Longitudinal (comparar A vs B) === */}
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
                    {ec.filepath || "sin nombre"}{" "}
                    {ec.fecha_hora
                      ? `- ${new Date(ec.fecha_hora).toLocaleString()}`
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
                    {ec.filepath || "sin nombre"}{" "}
                    {ec.fecha_hora
                      ? `- ${new Date(ec.fecha_hora).toLocaleString()}`
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
