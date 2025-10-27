import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./viewer.css";

// ===== helpers =====
function getToken() {
  return localStorage.getItem("token") || "";
}

function getAuthHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// normaliza un neonato para el dropdown
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

// normaliza una ecografía que viene de /api/visor/neonatos/:id/ecografias
function normalizeEcografia(raw, neonatoId) {
  return {
    id: raw.id,
    neonato_id: neonatoId,
    fecha_hora: raw.fecha_hora || null,
    file_url: raw.file_url || null, // <- ej "/files/carpeta/imagen-abc.dcm"
  };
}

// endpoints detrás de nginx
const NEONATOS_PATH = "/api/usuarios/neonatos";

// nueva ruta REST que lista ecografías de un neonato
const VISOR_LIST_ECOS = (neonatoId) =>
  `/api/visor/neonatos/${encodeURIComponent(neonatoId)}/ecografias`;

function ImageSelector({ onImageSelected }) {
  const navigate = useNavigate();

  // --- pacientes / neonatos ---
  const [pacientes, setPacientes] = useState([]);
  const [loadingPacientes, setLoadingPacientes] = useState(true);
  const [errorPacientes, setErrorPacientes] = useState(null);
  const [selectedPaciente, setSelectedPaciente] = useState(null);

  // --- ecografías de ese neonato ---
  const [ecografias, setEcografias] = useState([]);
  const [loadingEcos, setLoadingEcos] = useState(false);
  const [selectedEcografia, setSelectedEcografia] = useState(null);

  // --- modo comparación longitudinal ---
  const [isLongitudinalMode, setIsLongitudinalMode] = useState(false);
  const [selectedEcografiaA, setSelectedEcografiaA] = useState(null);
  const [selectedEcografiaB, setSelectedEcografiaB] = useState(null);

  // -------------------------------------------------
  // 1. cargar neonatos al montar
  // -------------------------------------------------
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
          console.warn("[VISOR] 401 cargando neonatos.");
          setPacientes([]);
          setErrorPacientes("No se pudieron cargar los neonatos (401).");
          return;
        }

        if (!resp.ok) {
          throw new Error(`Error ${resp.status} cargando neonatos`);
        }

        const data = await resp.json();

        // puede venir como [ ... ] o { items:[ ... ] }
        const listaBruta = Array.isArray(data)
          ? data
          : Array.isArray(data.items)
          ? data.items
          : [];

        const normalizados = listaBruta.map(normalizeNeonato);
        setPacientes(normalizados);
      } catch (err) {
        console.error("[VISOR] Error cargando neonatos:", err);
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
          ].map(normalizeNeonato)
        );
      } finally {
        setLoadingPacientes(false);
      }
    };

    fetchPacientes();
  }, []);

  // -------------------------------------------------
  // 2. cuando cambia el paciente seleccionado -> cargar ecografías
  // -------------------------------------------------
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

        const token = getToken();
        if (!token) {
          console.warn("[VISOR] No hay token en localStorage.");
          setEcografias([]);
          return;
        }

        const url = VISOR_LIST_ECOS(selectedPaciente.id);

        const resp = await fetch(url, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const rawText = await resp.text();

        // si 401 acá, NO tumbamos sesión
        if (resp.status === 401) {
          console.warn("[VISOR] 401 al pedir ecografías (nuevo flujo).");
          setEcografias([]);
          return;
        }

        if (!resp.ok) {
          console.error(
            "[VISOR] backend error ecos:",
            resp.status,
            resp.statusText
          );
          setEcografias([]);
          return;
        }

        let listaBruta;
        try {
          listaBruta = JSON.parse(rawText);
        } catch (e) {
          console.error("[VISOR] JSON.parse falló ecos:", e);
          setEcografias([]);
          return;
        }

        // backend devuelve ARRAY PLANO
        // ej: [ {id, fecha_hora, file_url}, ... ]
        const normalizadas = Array.isArray(listaBruta)
          ? listaBruta.map((ec) =>
              normalizeEcografia(ec, selectedPaciente.id)
            )
          : [];

        setEcografias(normalizadas);
      } catch (err) {
        console.error("[VISOR] Excepción cargando ecografías:", err);
        setEcografias([]);
      } finally {
        setLoadingEcos(false);
      }
    };

    fetchEcografias();
  }, [selectedPaciente]);

  // -------------------------------------------------
  // acciones de UI
  // -------------------------------------------------

  // abre el viewer normal con UNA ecografía
  const handleVisualize = () => {
    if (!selectedEcografia) return;

    const fullUrl = selectedEcografia.file_url || "";

    // agarramos sólo el último segmento -> "imagen-abc.dcm"
    let filename = "";
    if (fullUrl) {
      const parts = fullUrl.split("/");
      filename = parts[parts.length - 1] || "";
    }

    // le avisamos al padre (VisualizadorPage)
    onImageSelected({
      filename, // usado por ImageViewer -> /api/visualizador/uploads/:filename
      fullUrl,
      fecha_hora: selectedEcografia.fecha_hora,
      neonato_id: selectedEcografia.neonato_id,
      id: selectedEcografia.id,
    });
  };

  // entra en modo longitudinal (comparar A vs B)
  const handleLongitudinalAnalysis = () => {
    setIsLongitudinalMode(true);
    setSelectedEcografia(null);
  };

  // abre la pantalla de comparación lado a lado
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

  // -------------------------------------------------
  // render
  // -------------------------------------------------

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

        {/* === PACIENTE === */}
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

        {/* === MODO NORMAL (una eco) === */}
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
                    {ec.file_url || "sin archivo"}
                    {ec.fecha_hora
                      ? ` - ${new Date(ec.fecha_hora).toLocaleString()}`
                      : ""}
                  </option>
                ))}
              </select>

              {!loadingEcos && ecografias.length === 0 && (
                <p className="vtk-empty-text">
                  No hay ecografías disponibles o no se pudieron cargar.
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

        {/* === MODO LONGITUDINAL (comparar 2 ecos) === */}
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
                    {ec.file_url || "sin archivo"}
                    {ec.fecha_hora
                      ? ` - ${new Date(ec.fecha_hora).toLocaleString()}`
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
                    {ec.file_url || "sin archivo"}
                    {ec.fecha_hora
                      ? ` - ${new Date(ec.fecha_hora).toLocaleString()}`
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
