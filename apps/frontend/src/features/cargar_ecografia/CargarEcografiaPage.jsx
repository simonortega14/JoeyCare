import { useEffect, useMemo, useRef, useState } from "react";
import "./CargarEcografia.css";

// =====================================
// Helpers de auth
// =====================================
function getAuthHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Normalizar cualquier forma de neonato que venga del backend ms-usuarios
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

// Detectar el médico autenticado (quien sube la eco)
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

// =====================================
// Componente principal
// =====================================
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
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // --- historial de ecografías del neonato seleccionado ---
  const [examList, setExamList] = useState([]);
  const [examLoading, setExamLoading] = useState(false);

  // rutas backend detrás de nginx
  const NEONATOS_PATH = "/api/usuarios/neonatos";
  const ECO_UPLOAD_URL = "/api/ecografias/upload"; // POST
  const ECO_LIST_BASE = "/api/ecografias/neonatos"; // GET /:id

  // =====================================
  // 1) Cargar neonatos al montar
  // =====================================
  useEffect(() => {
    const cargarNeonatos = async () => {
      try {
        setLoading(true);
        setError(null);

        const resp = await fetch(NEONATOS_PATH, {
          headers: {
            Accept: "application/json",
            ...getAuthHeader(),
          },
        });

        if (resp.status === 401) {
          // sesión vencida
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          throw new Error("Sesión expirada. Ingresa de nuevo.");
        }

        if (!resp.ok) {
          throw new Error(`Error del servidor: ${resp.status}`);
        }

        const data = await resp.json();

        // puede venir como [ ... ] o { items:[ ... ] }
        const brutos = Array.isArray(data)
          ? data
          : Array.isArray(data.items)
          ? data.items
          : [];

        setPacientes(brutos.map(normalizeNeonato));
      } catch (err) {
        console.error("[CargarEcografia] Error cargando neonatos:", err);
        setError(
          "No se pudieron cargar los neonatos desde el servidor. Usando datos de prueba."
        );

        // fallback demo
        setPacientes(
          [
            {
              id: "13",
              nombres: "Bebé",
              apellidos: "García",
              documento: "123456",
            },
            {
              id: "99",
              nombres: "Bebé",
              apellidos: "Prueba",
              documento: "000000",
            },
          ].map(normalizeNeonato)
        );
      } finally {
        setLoading(false);
      }
    };

    cargarNeonatos();
  }, []);

  // =====================================
  // 2) Cargar exámenes del neonato seleccionado
  // =====================================
  useEffect(() => {
    if (!patient || !patient.id) {
      setExamList([]);
      return;
    }

    const fetchExamList = async () => {
      try {
        setExamLoading(true);

        // GET /api/ecografias/neonatos/:neonatoId
        const url = `${ECO_LIST_BASE}/${encodeURIComponent(patient.id)}`;

        const resp = await fetch(url, {
          headers: {
            Accept: "application/json",
            ...getAuthHeader(),
          },
        });

        if (!resp.ok) {
          console.warn(
            "[CargarEcografia] listar ecografías status:",
            resp.status
          );
          setExamList([]);
          return;
        }

        const data = await resp.json();

        // este endpoint devuelve un ARRAY plano tipo:
        // [
        //   {
        //     "ecografia_id": 9,
        //     "neonato_id": 13,
        //     "fecha_hora": "2025-10-31T03:22:58.000Z",
        //     "descripcion": "Dr(a). Carlos López",
        //     "has_frames": true
        //   },
        //   ...
        // ]
        if (Array.isArray(data)) {
          setExamList(data);
        } else {
          setExamList([]);
        }
      } catch (err) {
        console.error("[CargarEcografia] Error cargando ecografías:", err);
        setExamList([]);
      } finally {
        setExamLoading(false);
      }
    };

    fetchExamList();
  }, [patient]);

  // =====================================
  // 3) Autosuggest filtrado
  // =====================================
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

  // cerrar dropdown cuando hacemos click afuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (listRef.current && !listRef.current.contains(e.target)) {
        setOpenList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // =====================================
  // 4) Validar archivo seleccionado
  // =====================================
  const allowedTypes = [".png", ".jpg", ".jpeg", ".dcm"];

  const handleChangeFile = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return setFile(null);

    const ext = selected.name.split(".").pop().toLowerCase();
    if (!allowedTypes.includes("." + ext)) {
      alert(
        `Tipo de archivo no permitido. Usa: ${allowedTypes.join(", ")}`
      );
      e.target.value = null;
      return setFile(null);
    }

    setFile(selected);
  };

  // =====================================
  // 5) Subir ecografía (POST /api/ecografias/upload)
  // =====================================
  const handleSubmit = async (e) => {
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
          // NO forzar Content-Type aquí, fetch lo arma con boundary del FormData
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
        const url = `${ECO_LIST_BASE}/${encodeURIComponent(patient.id)}`;
        const r2 = await fetch(url, {
          headers: { Accept: "application/json", ...getAuthHeader() },
        });
        if (r2.ok) {
          const d2 = await r2.json();
          if (Array.isArray(d2)) {
            setExamList(d2);
          }
        }
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
  };

  // =====================================
  // 6) Seleccionar paciente desde la lista
  // =====================================
  const handlePick = (p) => {
    setPatient(p);

    const doc = p.documento ? `${p.documento} — ` : "";
    setQuery(`${doc}${p.nombres} ${p.apellidos}`);

    setOpenList(false);
  };

  const resetPatient = () => {
    setPatient(null);
    setQuery("");
    setExamList([]);
  };

  // =====================================
  // RENDER
  // =====================================

  if (loading) {
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

        {error && (
          <div
            className="error-message"
            style={{ color: "orange", marginBottom: "1rem" }}
          >
            {error}
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

          {!patient && (
            <div className="cargar-hint">
              Selecciona un neonato para habilitar la carga.
              {pacientes.length === 0 && " (No hay neonatos disponibles)"}
            </div>
          )}

          {patient && (
            <div className="pill-ok">
              Neonato seleccionado:{" "}
              <strong>{patient.documento || "—"}</strong> — {patient.nombres}{" "}
              {patient.apellidos}
            </div>
          )}
        </div>

        {/* === Formulario de carga === */}
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
        {patient && (
          <div className="exam-section-card">
            <div className="exam-section-header">
              <h3 className="cargar-subtitle">
                Ecografías previas de {patient.nombres} {patient.apellidos}
              </h3>

              {examLoading && (
                <div className="exam-loading">Cargando estudios...</div>
              )}
            </div>

            {!examLoading && examList.length === 0 && (
              <div className="cargar-hint exam-empty">
                No hay ecografías registradas para este neonato.
              </div>
            )}

            {!examLoading && examList.length > 0 && (
              <div className="exam-table-wrapper">
                {/* Encabezado tipo tabla */}
                <div className="exam-header-row">
                  <div>Fecha / Hora</div>
                  <div>Médico / Descripción</div>
                  <div>Archivo</div>
                </div>

                {/* Filas */}
                {examList.map((eco) => (
                  <div key={eco.ecografia_id} className="exam-row">
                    <div className="exam-col exam-date">
                      {eco.fecha_hora
                        ? new Date(eco.fecha_hora).toLocaleString()
                        : "—"}
                    </div>

                    <div className="exam-col exam-doctor">
                      {eco.descripcion || `Eco #${eco.ecografia_id}`}
                    </div>

                    <div className="exam-col exam-link">
                      {/* en esta lista de GET /neonatos/:id todavía no estamos
                         devolviendo file_url directo, pero si lo agregas en el futuro
                         puedes renderizarlo acá. Por ahora mostramos el id */}
                      <span className="exam-file-link">
                        ID {eco.ecografia_id}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CargarEcografiaPage;
