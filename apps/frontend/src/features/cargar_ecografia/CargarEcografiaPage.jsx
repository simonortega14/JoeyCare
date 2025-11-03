import { useEffect, useMemo, useRef, useState } from "react";
import "./CargarEcografia.css";

// ============================
// Helpers
// ============================

// Obtiene el token guardado local (si usas JWT)
function getAuthHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Normaliza un neonato como lo entrega ms-usuarios
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

// Intenta extraer el ID del médico autenticado del localStorage
function getCurrentUserId() {
  try {
    const rawUser = localStorage.getItem("user");
    if (!rawUser) return null;
    const parsed = JSON.parse(rawUser);
    return (
      parsed.id ||
      parsed.id_medico ||
      parsed.medico_id ||
      parsed.user_id ||
      parsed.usuario_id ||
      null
    );
  } catch (e) {
    console.warn("[CargarEcografia] No pude parsear localStorage.user:", e);
    return null;
  }
}

// Formatea timestamp a fecha legible
function formatFechaHora(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  const fecha = d.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const hora = d.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${fecha} ${hora}`;
}

// ============================
// URLs centralizadas (todas detrás de Nginx, sin :3002)
// ============================

// lista de neonatos (ms-usuarios)
const NEONATOS_PATH = "/api/usuarios/neonatos";

// listar ecografías de un neonato
// GET /api/neonatos/:id/ecografias
function urlEcografiasDeNeonato(neonatoId) {
  return `/api/neonatos/${encodeURIComponent(neonatoId)}/ecografias`;
}

// ver/descargar el archivo de una ecografía
// GET /api/ecografias/:ecografiaId/archivo
function urlArchivoEcografia(ecografiaId) {
  return `/api/ecografias/${encodeURIComponent(ecografiaId)}/archivo`;
}

// subir nueva ecografía
// POST /api/ecografias/upload
const ECO_UPLOAD_URL = "/api/ecografias/upload";

// ============================
// Componente principal
// ============================
const CargarEcografiaPage = () => {
  // --- estado de pacientes / búsqueda ---
  const [pacientes, setPacientes] = useState([]);
  const [query, setQuery] = useState("");
  const [patient, setPatient] = useState(null);
  const [openList, setOpenList] = useState(false);
  const listRef = useRef(null);

  // --- archivo a subir ---
  const [file, setFile] = useState(null);

  // --- estado UI general ---
  const [loadingPacientes, setLoadingPacientes] = useState(true);
  const [errorPacientes, setErrorPacientes] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- listado de ecografías del neonato seleccionado ---
  const [examList, setExamList] = useState([]);
  const [examLoading, setExamLoading] = useState(false);
  const [examError, setExamError] = useState(null);

  // ============================
  // 1. Cargar lista de neonatos al inicio
  // ============================
  useEffect(() => {
    async function cargarNeonatos() {
      try {
        setLoadingPacientes(true);
        setErrorPacientes(null);

        const resp = await fetch(NEONATOS_PATH, {
          headers: {
            Accept: "application/json",
            ...getAuthHeader(),
          },
        });

        if (!resp.ok) {
          throw new Error(`Error cargando neonatos: ${resp.status}`);
        }

        const data = await resp.json();

        const brutos = Array.isArray(data)
          ? data
          : Array.isArray(data.items)
          ? data.items
          : [];

        setPacientes(brutos.map(normalizeNeonato));
      } catch (err) {
        console.error("[CargarEcografia] neonatos error:", err);
        setErrorPacientes(
          "No se pudieron cargar los neonatos desde el servidor."
        );

        // fallback demo si backend falla
        setPacientes([
          {
            id: "24",
            nombres: "Bebé",
            apellidos: "Gómez",
            documento: "1234",
          },
          {
            id: "25",
            nombres: "Bebé",
            apellidos: "Demo",
            documento: "5678",
          },
        ]);
      } finally {
        setLoadingPacientes(false);
      }
    }

    cargarNeonatos();
  }, []);

  // ============================
  // 2. Cargar ecografías del neonato seleccionado
  // ============================
  async function cargarEcografiasDePaciente(neonatoId) {
    if (!neonatoId) {
      setExamList([]);
      return;
    }

    try {
      setExamLoading(true);
      setExamError(null);

      const resp = await fetch(urlEcografiasDeNeonato(neonatoId), {
        headers: {
          Accept: "application/json",
          ...getAuthHeader(),
        },
      });

      if (!resp.ok) {
        throw new Error(`Error listando ecografías: ${resp.status}`);
      }

      const data = await resp.json();

      // esperamos:
      // {
      //   "items": [
      //     {
      //       "id": 26,
      //       "neonato_id": 24,
      //       "timestamp": "2025-11-03T01:24:44.000Z",
      //       "descripcion": "Dr(a). Juan Pérez",
      //       "has_frames": true
      //     }
      //   ],
      //   "total": 1,
      //   "page": 1,
      //   "size": 1
      // }
      if (Array.isArray(data.items)) {
        setExamList(data.items);
      } else {
        setExamList([]);
      }
    } catch (err) {
      console.error("[CargarEcografia] ecografías error:", err);
      setExamError("No pude cargar las ecografías de este neonato.");
      setExamList([]);
    } finally {
      setExamLoading(false);
    }
  }

  // cuando cambia `patient`, traemos su lista
  useEffect(() => {
    if (patient && patient.id) {
      cargarEcografiasDePaciente(patient.id);
    } else {
      setExamList([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient]);

  // ============================
  // 3. Autosuggest filtrado
  // ============================
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return pacientes
      .filter((p) => {
        const full = `${p.documento || ""} ${p.nombres || ""} ${
          p.apellidos || ""
        }`.toLowerCase();
        return full.includes(q);
      })
      .slice(0, 6);
  }, [query, pacientes]);

  // cerrar dropdown click afuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (listRef.current && !listRef.current.contains(e.target)) {
        setOpenList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ============================
  // 4. Seleccionar paciente del autosuggest
  // ============================
  function handlePick(p) {
    setPatient(p);

    const doc = p.documento ? `${p.documento} — ` : "";
    setQuery(`${doc}${p.nombres} ${p.apellidos}`);

    setOpenList(false);
    // el useEffect de arriba va a llamar cargarEcografiasDePaciente
  }

  function resetPatient() {
    setPatient(null);
    setQuery("");
    setExamList([]);
    setExamError(null);
    setFile(null);
  }

  // ============================
  // 5. Seleccionar archivo local
  // ============================
  const allowedTypes = [".png", ".jpg", ".jpeg", ".dcm"];

  function handleChangeFile(e) {
    const selected = e.target.files?.[0];
    if (!selected) {
      setFile(null);
      return;
    }

    const ext = selected.name.split(".").pop().toLowerCase();
    if (!allowedTypes.includes("." + ext)) {
      alert(
        `Tipo de archivo no permitido. Usa: ${allowedTypes.join(", ")}`
      );
      e.target.value = null;
      setFile(null);
      return;
    }

    setFile(selected);
  }

  // ============================
  // 6. Subir ecografía
  // ============================
  async function handleSubmit(e) {
    e.preventDefault();

    const currentUserId = getCurrentUserId();

    if (!patient) {
      alert("Selecciona primero un neonato");
      return;
    }
    if (!file) {
      alert("Por favor selecciona un archivo válido");
      return;
    }
    if (!currentUserId) {
      alert(
        "No se detectó el usuario médico actual. Vuelve a iniciar sesión."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("neonato_id", patient.id);
      formData.append("uploader_medico_id", currentUserId);

      console.log("[CargarEcografia] Subiendo:");
      console.log("  neonato_id =", patient.id);
      console.log("  uploader_medico_id =", currentUserId);
      console.log("  file.name =", file.name);

      const resp = await fetch(ECO_UPLOAD_URL, {
        method: "POST",
        headers: {
          // ¡NO pongas Content-Type aquí! fetch lo arma con boundary del FormData
          ...getAuthHeader(),
        },
        body: formData,
      });

      const ct = resp.headers.get("content-type") || "";
      let data;
      if (ct.includes("application/json")) {
        data = await resp.json();
      } else {
        data = await resp.text();
      }

      console.log("[CargarEcografia] upload status:", resp.status);
      console.log("[CargarEcografia] upload body:", data);

      if (!resp.ok) {
        const backendMsg =
          typeof data === "string"
            ? data
            : data?.error || data?.message || JSON.stringify(data, null, 2);

        alert(
          `Error al subir (${resp.status}).\n` +
            `Detalle servidor:\n${backendMsg}`
        );
        return;
      }

      alert(
        `Ecografía subida correctamente para ${patient.nombres} ${patient.apellidos}` +
          (data?.file_url ? `\nURL pública: ${data.file_url}` : "")
      );

      // limpiar selección de archivo
      setFile(null);

      // refrescar lista de exámenes del neonato
      try {
        await cargarEcografiasDePaciente(patient.id);
      } catch (refreshErr) {
        console.warn(
          "[CargarEcografia] No se pudo refrescar la lista tras subir:",
          refreshErr
        );
      }
    } catch (err) {
      console.error("[CargarEcografia] Error en submit:", err);
      alert(
        err.message
          ? `Error inesperado:\n${err.message}`
          : "Error inesperado al subir la ecografía"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // ============================
  // 7. Ver archivo de una ecografía
  // ============================
  function handleVerArchivo(ecografiaId) {
    if (!ecografiaId) return;
    const url = urlArchivoEcografia(ecografiaId);
    window.open(url, "_blank");
  }

  // ============================
  // RENDER
  // ============================

  if (loadingPacientes) {
    return (
      <div className="cargar-page">
        <div className="cargar-card">
          <div className="loading">Cargando pacientes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="cargar-page">
      <div className="cargar-card">
        <h2 className="cargar-title">Cargar Ecografía</h2>

        {errorPacientes && (
          <div
            className="error-message"
            style={{ color: "orange", marginBottom: "1rem" }}
          >
            {errorPacientes}
          </div>
        )}

        {/* === Selector / buscador de neonato === */}
        <div className="campo">
          <label className="cargar-label">Neonato</label>
          <div className="patient-picker" ref={listRef}>
            <input
              className="cargar-input"
              placeholder="Buscar por documento o nombre"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPatient(null);
                setExamList([]);
                setExamError(null);
                setOpenList(true);
              }}
              onFocus={() => setOpenList(true)}
              disabled={!!patient}
            />

            {patient && (
              <button
                type="button"
                className="mini-btn"
                onClick={resetPatient}
                title="Cambiar paciente"
              >
                Cambiar
              </button>
            )}

            {openList && suggestions.length > 0 && !patient && (
              <ul className="patient-list">
                {suggestions.map((p) => (
                  <li
                    key={p.id}
                    className="patient-item"
                    onClick={() => handlePick(p)}
                  >
                    <span className="patient-id">{p.documento || "—"}</span>
                    <span className="patient-name">
                      {p.nombres} {p.apellidos} (ID {p.id})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {patient && (
            <div className="pill-ok" style={{ marginTop: "0.5rem" }}>
              Neonato seleccionado:{" "}
              <strong>{patient.documento || "—"}</strong> — {patient.nombres}{" "}
              {patient.apellidos} (ID {patient.id})
            </div>
          )}

          {!patient && (
            <div className="cargar-hint">
              Selecciona un neonato para habilitar la carga.
              {pacientes.length === 0 && " (No hay neonatos disponibles)"}
            </div>
          )}
        </div>

        {/* === Formulario de carga de archivo === */}
        <form onSubmit={handleSubmit}>
          <label className="cargar-label">
            Archivo (.png, .jpg, .jpeg, .dcm)
          </label>
          <input
            className="cargar-input"
            type="file"
            accept=".png,.jpg,.jpeg,.dcm"
            onChange={handleChangeFile}
            disabled={!patient}
          />
          <div className="cargar-hint">Tamaño recomendado &lt; 10 MB.</div>

          <button
            type="submit"
            className="cargar-btn"
            disabled={!patient || !file || isSubmitting}
          >
            {isSubmitting ? "Subiendo..." : "Subir"}
          </button>
        </form>

        {file && (
          <div className="cargar-filename">
            Archivo seleccionado: {file.name}
          </div>
        )}

        {/* === Historial de ecografías del neonato === */}
        <div className="exam-section-card" style={{ marginTop: "2rem" }}>
          <div className="exam-section-header">
            <h3 className="cargar-subtitle">
              Ecografías del paciente
              {patient
                ? `: ${patient.nombres} ${patient.apellidos}`
                : ": (ninguno seleccionado)"}
            </h3>

            {examLoading && (
              <div className="exam-loading">Cargando estudios...</div>
            )}
          </div>

          {examError && (
            <div className="cargar-hint exam-empty" style={{ color: "red" }}>
              {examError}
            </div>
          )}

          {!examLoading && !examError && patient && examList.length === 0 && (
            <div className="cargar-hint exam-empty">
              No hay ecografías registradas para este neonato.
            </div>
          )}

          {!examLoading && !examError && examList.length > 0 && (
            <div className="exam-table-wrapper">
              {/* Encabezado tipo tabla */}
              <div className="exam-header-row">
                <div>Fecha / Hora</div>
                <div>Médico / Descripción</div>
                <div>Archivo</div>
              </div>

              {/* Filas */}
              {examList.map((eco) => (
                <div key={eco.id} className="exam-row">
                  <div className="exam-col exam-date">
                    {formatFechaHora(eco.timestamp)}
                  </div>

                  <div className="exam-col exam-doctor">
                    {eco.descripcion || `Eco #${eco.id}`}
                  </div>

                  <div className="exam-col exam-link">
                    <button
                      type="button"
                      className="mini-btn"
                      onClick={() => handleVerArchivo(eco.id)}
                    >
                      Ver
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CargarEcografiaPage;
