// src/features/cargar_ecografia/CargarEcografiaPage.jsx
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

  // Tipos permitidos
  const allowedTypes = [".png", ".jpg", ".jpeg", ".dcm"];

  // ENDPOINTS (¡ojo al slash final en ecografías!)
  const NEONATOS_PATH = "/api/usuarios/neonatos";
  const ECO_UPLOAD_URL = "/api/ecografias/"; // <-- barra final OBLIGATORIA

  // Cargar neonatos
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
          // sesión expirada: limpia y manda a login
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

  // Filtrar pacientes
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

  // Click fuera
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

  // Subir archivo al ms-ecografias (campo: 'file', body: neonato_id)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patient) return alert("Selecciona primero un neonato");
    if (!file) return alert("Por favor selecciona un archivo válido");

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append("file", file);                 // upload.single('file')
      formData.append("neonato_id", patient.id);     // el back lo espera en el body
      // formData.append("sede_id", "1");            // opcional si tu back lo usa
      // formData.append("fecha_hora", new Date().toISOString()); // opcional

      const resp = await fetch(ECO_UPLOAD_URL, {
        method: "POST",
        headers: {
          ...getAuthHeader(), // NUNCA pongas Content-Type con FormData
        },
        body: formData,
      });

      if (!resp.ok) {
        const contentType = resp.headers.get("content-type") || "";
        let errorMessage = `Error al subir ecografía (${resp.status})`;
        if (contentType.includes("application/json")) {
          try {
            const err = await resp.json();
            if (err?.message) errorMessage = err.message;
          } catch {}
        } else {
          const txt = await resp.text().catch(() => "");
          if (txt) errorMessage += ` — ${txt}`;
        }
        throw new Error(errorMessage);
      }

      alert(`Ecografía subida correctamente para ${patient.nombres} ${patient.apellidos}`);
      setFile(null);
      setPatient(null);
      setQuery("");
    } catch (err) {
      console.error("Error al subir:", err);
      alert(err.message || "Error al subir ecografía");
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
          <div className="error-message" style={{ color: "orange", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

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
                setOpenList(true);
              }}
              onFocus={() => setOpenList(true)}
              disabled={!!patient}
            />
            {patient && (
              <button type="button" className="mini-btn" onClick={resetPatient} title="Cambiar paciente">
                Cambiar
              </button>
            )}

            {openList && suggestions.length > 0 && !patient && (
              <ul className="patient-list">
                {suggestions.map((p) => (
                  <li key={p.id} className="patient-item" onClick={() => handlePick(p)}>
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
              Neonato seleccionado: <strong>{patient.documento || "—"}</strong> — {patient.nombres} {patient.apellidos}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <label className="cargar-label">Archivo (.png, .jpg, .jpeg, .dcm)</label>
          <input
            className="cargar-input"
            type="file"
            accept=".png,.jpg,.jpeg,.dcm"
            onChange={handleChangeFile}
            disabled={!patient}
          />
          <div className="cargar-hint">Tamaño recomendado &lt; 10 MB.</div>

          <button type="submit" className="cargar-btn" disabled={!patient || !file || isSubmitting}>
            {isSubmitting ? "Subiendo..." : "Subir"}
          </button>
        </form>

        {file && <div className="cargar-filename">Seleccionado: {file.name}</div>}
      </div>
    </div>
  );
};

export default CargarEcografiaPage;
