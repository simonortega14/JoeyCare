import { useEffect, useMemo, useRef, useState } from "react";
import "./CargarEcografia.css";

function getAuthHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Normaliza cualquier forma de neonato que venga del API
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

const CargarEcografiaPage = () => {
  const [pacientes, setPacientes] = useState([]);
  const [file, setFile] = useState(null);
  const [query, setQuery] = useState("");
  const [patient, setPatient] = useState(null);
  const [openList, setOpenList] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const listRef = useRef(null);

  // 👇 NUEVO: lista de ecografías del neonato seleccionado
  const [examList, setExamList] = useState([]);
  const [examLoading, setExamLoading] = useState(false);


// obtener info del usuario actual (médico que sube)
let currentUserId = null;
try {
  const rawUser = localStorage.getItem("user");
  if (rawUser) {
    const parsed = JSON.parse(rawUser);

    // mira en consola qué trae el user guardado
    console.log("[CargarEcografia] user localStorage:", parsed);

    currentUserId =
      parsed.id ||
      parsed.id_medico ||
      parsed.medico_id ||
      parsed.user_id ||
      parsed.usuario_id ||
      null;
  }
} catch (e) {
  console.warn("No pude parsear localStorage.user:", e);
}
console.log("[CargarEcografia] currentUserId detectado:", currentUserId);
  // Tipos permitidos
  const allowedTypes = [".png", ".jpg", ".jpeg", ".dcm"];

  // ENDPOINTS
  const NEONATOS_PATH = "/api/usuarios/neonatos";
  const ECO_UPLOAD_URL = "/api/ecografias/"; // POST
  const ECO_LIST_URL = "/api/ecografias";    // GET ?neonato_id=...

  // 1. Cargar neonatos al inicio
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
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          throw new Error("Sesión expirada. Ingresa de nuevo.");
        }

        if (!resp.ok) throw new Error(`Error del servidor: ${resp.status}`);
        const data = await resp.json();

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.items)
          ? data.items
          : [];

        setPacientes(list.map(normalizeNeonato));
      } catch (err) {
        console.error("Error cargando neonatos:", err);
        setError("No se pudieron cargar los neonatos. Usando datos de prueba.");
        setPacientes(
          [
            { id: "123", nombres: "Bebé", apellidos: "García", documento: "—" },
            { id: "456", nombres: "Bebé", apellidos: "Rodríguez", documento: "—" },
            { id: "789", nombres: "Bebé", apellidos: "López", documento: "—" },
            { id: "012", nombres: "Bebé", apellidos: "Martínez", documento: "—" },
            { id: "345", nombres: "Bebé", apellidos: "González", documento: "—" },
          ].map(normalizeNeonato)
        );
      } finally {
        setLoading(false);
      }
    };
    cargarNeonatos();
  }, []);

  // 2. Cuando seleccionamos un paciente, traemos su historial de ecos 👇 NUEVO
  useEffect(() => {
    if (!patient || !patient.id) {
      setExamList([]);
      return;
    }

    const fetchExamList = async () => {
      try {
        setExamLoading(true);

        const url = `${ECO_LIST_URL}?neonato_id=${encodeURIComponent(
          patient.id
        )}&page=1&size=50`;

        const resp = await fetch(url, {
          headers: {
            Accept: "application/json",
            ...getAuthHeader(),
          },
        });

        if (!resp.ok) {
          console.error("Error listando ecografías:", resp.status);
          setExamList([]);
          return;
        }

        const data = await resp.json();
        // esperamos { items: [...] }
        setExamList(Array.isArray(data.items) ? data.items : []);
      } catch (err) {
        console.error("Error cargando ecografías:", err);
        setExamList([]);
      } finally {
        setExamLoading(false);
      }
    };

    fetchExamList();
  }, [patient]); // <- cada vez que cambie el paciente

  // Filtrar pacientes para el autosuggest
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return pacientes
      .filter((p) => {
        const full = `${p.documento || ""} ${p.nombres || ""} ${p.apellidos || ""}`.toLowerCase();
        return full.includes(q);
      })
      .slice(0, 6);
  }, [query, pacientes]);

  // Click fuera del autosuggest
  useEffect(() => {
    function handleClickOutside(e) {
      if (listRef.current && !listRef.current.contains(e.target)) setOpenList(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Validar tipo de archivo
  const handleChangeFile = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return setFile(null);

    const ext = selected.name.split(".").pop().toLowerCase();
    if (!allowedTypes.includes("." + ext)) {
      alert(`Tipo de archivo no permitido. Usa: ${allowedTypes.join(", ")}`);
      e.target.value = null;
      return setFile(null);
    }

    setFile(selected);
  };

  // Subir archivo al ms-ecografias
const handleSubmit = async (e) => {
  e.preventDefault();

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
      "No se detectó el usuario médico actual (uploader). Vuelve a iniciar sesión."
    );
    return;
  }

  try {
    setIsSubmitting(true);

    // armamos el formData EXACTAMENTE como espera el backend
    const formData = new FormData();
    formData.append("file", file);
    formData.append("neonato_id", patient.id);
    formData.append("uploader_medico_id", currentUserId);

    console.log("[CargarEcografia] Subiendo con payload:");
    console.log(" neonato_id =", patient.id);
    console.log(" uploader_medico_id =", currentUserId);
    console.log(" file.name =", file.name);

    const resp = await fetch(ECO_UPLOAD_URL, {
      method: "POST",
      headers: {
        // NO pongas Content-Type aquí porque fetch con FormData
        // lo setea solo con el boundary. Sólo auth:
        ...getAuthHeader(),
      },
      body: formData,
    });

    const contentType = resp.headers.get("content-type") || "";
    let data;
    if (contentType.includes("application/json")) {
      data = await resp.json();
    } else {
      data = await resp.text();
    }

    console.log("[CargarEcografia] upload status:", resp.status);
    console.log("[CargarEcografia] upload body:", data);

    if (!resp.ok) {
      // mensaje amigable
      let backendMsg =
        typeof data === "string"
          ? data
          : data?.error ||
            data?.message ||
            JSON.stringify(data, null, 2);

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

    // limpiamos file input visualmente
    setFile(null);

    // refrescar lista de estudios del bebé
    try {
      if (patient?.id) {
        const url = `${ECO_LIST_URL}?neonato_id=${encodeURIComponent(
          patient.id
        )}&page=1&size=50`;

        const r2 = await fetch(url, {
          headers: { Accept: "application/json", ...getAuthHeader() },
        });

        if (r2.ok) {
          const d2 = await r2.json();
          console.log("[CargarEcografia] Lista actualizada:", d2);
          setExamList(Array.isArray(d2.items) ? d2.items : []);
        } else {
          console.warn(
            "[CargarEcografia] No pude refrescar la lista, status:",
            r2.status
          );
        }
      }
    } catch (refreshErr) {
      console.warn(
        "[CargarEcografia] Error refrescando lista post-upload:",
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

      {/* Picker de neonato */}
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
                    {p.nombres} {p.apellidos}
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

      {/* Formulario de carga */}
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
        <div className="cargar-filename">Seleccionado: {file.name}</div>
      )}

      {/* Historial del neonato */}
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
                <div>Tamaño</div>
                <div>Médico</div>
                <div>Ver archivo</div>
              </div>

              {/* Filas */}
              {examList.map((eco) => (
                <div key={eco.id} className="exam-row">
                  <div className="exam-col exam-date">
                    <div className="exam-date-main">
                      {eco.fecha_hora || "—"}
                    </div>
                    {/* si quieres puedes partir fecha y hora con más formato luego */}
                  </div>

                  <div className="exam-col exam-size">
                    {eco.size_bytes
                      ? `${(eco.size_bytes / (1024 * 1024)).toFixed(2)} MB`
                      : "—"}
                  </div>

                  <div className="exam-col exam-doctor">
                    {eco.uploader_medico_id ?? "—"}
                  </div>

                  <div className="exam-col exam-link">
                    {eco.file_url ? (
                      <a
                        className="exam-file-link"
                        href={eco.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Abrir →
                      </a>
                    ) : (
                      <span className="exam-file-missing">—</span>
                    )}
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
