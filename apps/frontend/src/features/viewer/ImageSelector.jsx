import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./viewer.css";

function getToken() {
  return localStorage.getItem("token") || "";
}

// Normaliza neonato como viene de ms-usuarios
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

// Normaliza ecografía como viene de ms-ecografias
// Esperado del backend (resumenPorNeonato):
// {
//   id,               // ecografia_id
//   neonato_id,
//   timestamp,
//   medico,
//   has_frames,
//   label,            // "2025-11-03 01:18 – Dr(a). Carlos López"
// }
function normalizeEcografia(raw) {
  return {
    id:
      raw.id ||
      raw.ecografia_id ||
      raw.ecografiaId ||
      raw.eco_id,
    neonato_id: raw.neonato_id,
    timestamp: raw.timestamp || raw.fecha_hora || null,
    medico: raw.medico || raw.medico_responsable || "",
    has_frames: !!raw.has_frames,
    label: raw.label || "",
  };
}

// ENDPOINTS detrás del Nginx
// lista de neonatos
const LIST_NEONATOS_URL = "/api/usuarios/neonatos";

// lista de ecografías para un neonato
// OJO: esto debe estar apuntando al ms-ecografias por Nginx
// location /api/neonatos/ -> proxy_pass ms-ecografias:3002/api/neonatos/
const LIST_ECOGRAFIAS_URL = (neonatoId) =>
  `/api/neonatos/${encodeURIComponent(neonatoId)}/ecografias`;

export default function ImageSelector() {
  const navigate = useNavigate();

  // ---- estado pacientes
  const [pacientes, setPacientes] = useState([]);
  const [loadingPacientes, setLoadingPacientes] = useState(true);
  const [errorPacientes, setErrorPacientes] = useState(null);
  const [selectedPaciente, setSelectedPaciente] = useState(null);

  // ---- estado ecografías
  const [ecografias, setEcografias] = useState([]);
  const [loadingEcos, setLoadingEcos] = useState(false);

  // selección normal: 1 ecografía
  const [selectedEcografia, setSelectedEcografia] = useState(null);

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

        // soporta array directo o {items:[...]}
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
      // si no hay paciente => cleanup
      if (!selectedPaciente?.id) {
        setEcografias([]);
        setSelectedEcografia(null);
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
          console.error("[ImageSelector] ecografias status:", resp.status);
          setEcografias([]);
          return;
        }

        const raw = await resp.json();

        // soporta array directo o {items:[...]}
        const arr = Array.isArray(raw)
          ? raw
          : Array.isArray(raw.items)
          ? raw.items
          : [];

        const normalizadas = arr.map(normalizeEcografia);

        // ordenar más recientes primero
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
  //    -> Navegamos a la ruta del visor, pasando la info en state
  //    -> TU ImageViewer usa useLocation().state
  // ======================================================
  const handleVisualize = () => {
    if (!selectedEcografia) return;

    const ecografiaId = selectedEcografia.id;
    const medico = selectedEcografia.medico;
    const timestamp = selectedEcografia.timestamp;

    // Navegamos a la pantalla del visor
    // OJO: esta ruta "/visualizar-ecografias/ver" DEBE existir en tu router
    // con <Route path="/visualizar-ecografias/ver" element={<ImageViewer />} />
    navigate("/visualizar-ecografias/ver", {
      state: {
        ecografiaId,
        medico,
        timestamp,
      },
    });
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

              // reset selección ecos cuando cambiamos de paciente
              setSelectedEcografia(null);
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

        {/* Selección de ecografía */}
        {selectedPaciente && (
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
                    {ec.label || "Sin datos"}
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}
