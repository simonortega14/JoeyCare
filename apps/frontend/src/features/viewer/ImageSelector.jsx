import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./viewer.css";

function getToken() {
  return localStorage.getItem("token") || "";
}

// === Normaliza neonato como viene de ms-usuarios ===
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

// === Normaliza ecografía como viene de ms-ecografias ===
// Backend devuelve:
// {
//   ecografia_id,
//   neonato_id,
//   fecha_hora,
//   descripcion,
//   has_frames,
//   file_url (opcional, si lo agregaste)
// }
function normalizeEcografia(raw) {
  return {
    id: raw.ecografia_id,                      // <- usamos esto como value en <option>
    ecografia_id: raw.ecografia_id,            // redundante pero explícito
    neonato_id: raw.neonato_id,
    timestamp: raw.fecha_hora || null,         // para mostrar fecha
    descripcion: raw.descripcion || "",        // para mostrar quién la subió
    has_frames: !!raw.has_frames,
    file_url: raw.file_url || null,            // para abrir el .dcm directo si queremos
  };
}

// ENDPOINTS vía nginx
const LIST_NEONATOS_URL = "/api/usuarios/neonatos";
const LIST_ECOGRAFIAS_URL = (neonatoId) =>
  `/api/neonatos/${encodeURIComponent(neonatoId)}/ecografias`;

function ImageSelector({ onImageSelected }) {
  const navigate = useNavigate();

  // ---- estado pacientes
  const [pacientes, setPacientes] = useState([]);
  const [loadingPacientes, setLoadingPacientes] = useState(true);
  const [errorPacientes, setErrorPacientes] = useState(null);
  const [selectedPaciente, setSelectedPaciente] = useState(null);

  // ---- estado ecografías
  const [ecografias, setEcografias] = useState([]);
  const [loadingEcos, setLoadingEcos] = useState(false);

  // selección en modo normal (una sola eco)
  const [selectedEcografia, setSelectedEcografia] = useState(null);

  // modo comparación longitudinal
  const [isLongitudinalMode, setIsLongitudinalMode] = useState(false);
  const [selectedEcografiaA, setSelectedEcografiaA] = useState(null);
  const [selectedEcografiaB, setSelectedEcografiaB] = useState(null);

  // ======================================================
  // 1. cargar neonatos al inicio
  // ======================================================
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

        setPacientes(lista.map(normalizeNeonato));
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

  // ======================================================
  // 2. cargar ecografías cuando cambia el paciente seleccionado
  // ======================================================
  useEffect(() => {
    const fetchEcografias = async () => {
      // si no hay paciente seleccionado => limpiar todo
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

        const resp = await fetch(LIST_ECOGRAFIAS_URL(selectedPaciente.id), {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
        });

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

        // ordenar por fecha_hora más reciente primero (por si backend no lo hizo)
        normalizadas.sort((a, b) => {
          const ta = a.timestamp ? Date.parse(a.timestamp) : 0;
          const tb = b.timestamp ? Date.parse(b.timestamp) : 0;
          return tb - ta;
        });

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

  // ======================================================
  // 3. Visualizar UNA sola eco
  // ======================================================
  const handleVisualize = () => {
    if (!selectedEcografia) return;

    onImageSelected({
      neonatoId: selectedEcografia.neonato_id,
      ecografiaId: selectedEcografia.id,
      descripcion: selectedEcografia.descripcion,
      timestamp: selectedEcografia.timestamp,
      // opcional: pasar file_url si quieres que el visor pueda pedir
      // ese archivo directamente sin volver a consultar ms-ecografias
      file_url: selectedEcografia.file_url || null,
    });
  };

  // ======================================================
  // 4. Activar modo longitudinal (comparar 2 ecos)
  // ======================================================
  const handleLongitudinalAnalysis = () => {
    setIsLongitudinalMode(true);
    setSelectedEcografia(null); // abandonamos selección simple
  };

  // ======================================================
  // 5. Ir a pantalla de comparación
  // ======================================================
  const handleVisualizeComparison = () => {
    if (selectedEcografiaA && selectedEcografiaB) {
      navigate("/comparar-ecografias", {
        state: {
          imagenIzquierda: {
            neonatoId: selectedEcografiaA.neonato_id,
            ecografiaId: selectedEcografiaA.id,
            descripcion: selectedEcografiaA.descripcion,
            timestamp: selectedEcografiaA.timestamp,
            file_url: selectedEcografiaA.file_url || null,
          },
          imagenDerecha: {
            neonatoId: selectedEcografiaB.neonato_id,
            ecografiaId: selectedEcografiaB.id,
            descripcion: selectedEcografiaB.descripcion,
            timestamp: selectedEcografiaB.timestamp,
            file_url: selectedEcografiaB.file_url || null,
          },
        },
      });
    }
  };

  // volver al modo normal desde el modo longitudinal
  const handleBackToNormal = () => {
    setIsLongitudinalMode(false);
    setSelectedEcografiaA(null);
    setSelectedEcografiaB(null);
    setSelectedEcografia(null);
  };

  // ======================================================
  // RENDER
  // ======================================================
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

              // reset de selección de ecos cuando cambiamos de paciente
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

        {/* === MODO NORMAL: ver una sola ecografía === */}
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
                  No hay ecografías para este paciente.
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

        {/* === MODO LONGITUDINAL: comparar dos ecos === */}
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
