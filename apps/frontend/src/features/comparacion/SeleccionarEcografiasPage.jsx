import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppHeader from "../../components/AppHeader.jsx";
import AppSidebar from "../../components/AppSidebar.jsx";
import { apiGet, getToken } from "../../lib/api";
import "./SeleccionarEcografiasPage.css";
/** Normaliza una ecografía como viene del ms-ecografias */
function normalizeEcografia(raw, neonatoId) {
  return {
    id: String(raw.id || raw.ecografia_id || raw.ecografiaId || raw.eco_id || ""),
    neonato_id: String(neonatoId),
    timestamp: raw.timestamp || raw.fecha_hora || raw.created_at || raw.uploaded_at || null,
    medico: raw.medico || raw.medico_responsable || "",
    has_frames: !!raw.has_frames,
    label:
      raw.label ||
      raw.descripcion ||
      raw.detalle ||
      raw.filename ||
      (raw.timestamp ? new Date(raw.timestamp).toLocaleString() : "Ecografía"),
  };
}

// Puedes usar esta forma si tu gateway enruta /api/neonatos/** hacia ms-ecografias
const LIST_ECOGRAFIAS_URL = (neonatoId) =>
  `/api/neonatos/${encodeURIComponent(neonatoId)}/ecografias`;

// Alternativa por query (descomenta si prefieres /api/ecografias?neonato_id=...)
// const LIST_ECOGRAFIAS_URL_Q = (neonatoId) =>
//   `/api/ecografias?neonato_id=${encodeURIComponent(neonatoId)}&page=1&size=100`;

export default function SeleccionarEcografiasPage({ onOpenSettings }) {
  const navigate = useNavigate();
  const { state } = useLocation() || {};
  const neonatoAId = state?.neonatoAId ? String(state.neonatoAId) : null;
  const neonatoBId = state?.neonatoBId ? String(state.neonatoBId) : null;

  // Listas
  const [ecoA, setEcoA] = useState([]);
  const [ecoB, setEcoB] = useState([]);

  // Loading/error
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [errorA, setErrorA] = useState(null);
  const [errorB, setErrorB] = useState(null);

  // Selección
  const [selA, setSelA] = useState(null);
  const [selB, setSelB] = useState(null);
  const listo = useMemo(() => Boolean(selA && selB), [selA, selB]);

  // Guard 1: si no llegan IDs, volvemos a búsqueda
  useEffect(() => {
    if (!neonatoAId || !neonatoBId) {
      navigate("/buscar-pacientes", { replace: true });
    }
  }, [neonatoAId, neonatoBId, navigate]);

  // Guard 2: token presente (no redirige por cualquier 401, solo si falta token)
  useEffect(() => {
    const t = getToken();
    if (!t) {
      navigate("/login", {
        replace: true,
        state: { redirectTo: "/seleccionar-ecografias", ...state },
      });
    }
  }, [navigate, state]);

  // Cargar ecografías del neonato A
  useEffect(() => {
    if (!neonatoAId) return;
    (async () => {
      setLoadingA(true);
      setErrorA(null);
      try {
        const res = await apiGet(LIST_ECOGRAFIAS_URL(neonatoAId));
        console.log("[A] status:", res.status);
        if (res.status === 401 || res.status === 403) {
          setErrorA("No autorizado (A). Revisa que Authorization llegue al micro.");
          setEcoA([]);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
        const norm = arr
          .map((r) => normalizeEcografia(r, neonatoAId))
          .sort(
            (a, b) =>
              (Date.parse(b.timestamp || "") || 0) -
              (Date.parse(a.timestamp || "") || 0)
          );
        setEcoA(norm);
      } catch (e) {
        setErrorA(e.message || "No se pudieron cargar las ecografías del Paciente A.");
        setEcoA([]);
      } finally {
        setLoadingA(false);
      }
    })();
  }, [neonatoAId]);

  // Cargar ecografías del neonato B
  useEffect(() => {
    if (!neonatoBId) return;
    (async () => {
      setLoadingB(true);
      setErrorB(null);
      try {
        const res = await apiGet(LIST_ECOGRAFIAS_URL(neonatoBId));
        console.log("[B] status:", res.status);
        if (res.status === 401 || res.status === 403) {
          setErrorB("No autorizado (B). Revisa que Authorization llegue al micro.");
          setEcoB([]);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
        const norm = arr
          .map((r) => normalizeEcografia(r, neonatoBId))
          .sort(
            (a, b) =>
              (Date.parse(b.timestamp || "") || 0) -
              (Date.parse(a.timestamp || "") || 0)
          );
        setEcoB(norm);
      } catch (e) {
        setErrorB(e.message || "No se pudieron cargar las ecografías del Paciente B.");
        setEcoB([]);
      } finally {
        setLoadingB(false);
      }
    })();
  }, [neonatoBId]);

  const formatFecha = (ts) => {
    if (!ts) return "—";
    try {
      const d = new Date(ts);
      return Number.isNaN(d.getTime()) ? String(ts) : d.toLocaleString();
    } catch {
      return String(ts);
    }
  };

  // Ir al visor doble (VisorEcografiaDoble.jsx)
const abrirVisorDoble = () => {
  if (!selA || !selB) return;

  // 1) Persistimos en sessionStorage (respaldo para back/forward o entrada directa)
  sessionStorage.setItem(
    "viewer:double",
    JSON.stringify({
      left: selA.id,
      right: selB.id,
      metaLeft: selA,
      metaRight: selB,
    })
  );

  // 2) Navegamos pasando también por querystring (para deep-link)
  navigate(
    `/comparar-ecografias?left=${encodeURIComponent(selA.id)}&right=${encodeURIComponent(selB.id)}`,
    {
      state: {
        imagenIzquierda: {
          id: selA.id,
          ecografiaId: selA.id, // compat
          neonato_id: selA.neonato_id,
          timestamp: selA.timestamp,
          medico: selA.medico,
          label: selA.label,
        },
        imagenDerecha: {
          id: selB.id,
          ecografiaId: selB.id, // compat
          neonato_id: selB.neonato_id,
          timestamp: selB.timestamp,
          medico: selB.medico,
          label: selB.label,
        },
      },
    }
  );
};

  return (
    <div className="page-container">
      <AppHeader onOpenSettings={onOpenSettings} />
      <AppSidebar activeItem="Comparar Ecografías" />

      <div style={{ padding: 16 }}>
        <h1 style={{ marginBottom: 6 }}>Seleccionar ecografías</h1>
        <p style={{ marginTop: 0, color: "#6b7280" }}>
          Paciente A: <strong>{neonatoAId}</strong> · Paciente B:{" "}
          <strong>{neonatoBId}</strong>
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            alignItems: "start",
          }}
        >
          {/* Columna A */}
          <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: 12, borderBottom: "1px solid #eee", background: "#fafafa" }}>
              <strong>Paciente A</strong>{" "}
              <span style={{ color: "#888" }}>({ecoA.length} estudios)</span>
            </div>

            {errorA && <div className="error" style={{ padding: 12 }}>{errorA}</div>}
            {loadingA && <div className="loading" style={{ padding: 12 }}>Cargando ecografías...</div>}

            {!loadingA && !errorA && (
              <div style={{ maxHeight: 420, overflow: "auto", padding: 8 }}>
                {ecoA.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: "#666" }}>
                    Este paciente no tiene ecografías.
                  </div>
                ) : (
                  ecoA.map((e) => (
                    <label
                      key={e.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr auto",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 12px",
                        border: "1px solid #eee",
                        borderRadius: 12,
                        marginBottom: 8,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="ecoA"
                        checked={selA?.id === e.id}
                        onChange={() => setSelA(e)}
                      />
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {e.label || "Ecografía"}
                        </div>
                        <div style={{ color: "#6b7280", fontSize: 12 }}>
                          {formatFecha(e.timestamp)}
                        </div>
                      </div>
                      <div style={{ color: "#6b7280", fontSize: 12 }}>#{e.id}</div>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Columna B */}
          <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: 12, borderBottom: "1px solid #eee", background: "#fafafa" }}>
              <strong>Paciente B</strong>{" "}
              <span style={{ color: "#888" }}>({ecoB.length} estudios)</span>
            </div>

            {errorB && <div className="error" style={{ padding: 12 }}>{errorB}</div>}
            {loadingB && <div className="loading" style={{ padding: 12 }}>Cargando ecografías...</div>}

            {!loadingB && !errorB && (
              <div style={{ maxHeight: 420, overflow: "auto", padding: 8 }}>
                {ecoB.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: "#666" }}>
                    Este paciente no tiene ecografías.
                  </div>
                ) : (
                  ecoB.map((e) => (
                    <label
                      key={e.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr auto",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 12px",
                        border: "1px solid #eee",
                        borderRadius: 12,
                        marginBottom: 8,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="ecoB"
                        checked={selB?.id === e.id}
                        onChange={() => setSelB(e)}
                      />
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {e.label || "Ecografía"}
                        </div>
                        <div style={{ color: "#6b7280", fontSize: 12 }}>
                          {formatFecha(e.timestamp)}
                        </div>
                      </div>
                      <div style={{ color: "#6b7280", fontSize: 12 }}>#{e.id}</div>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff" }}
          >
            Cancelar
          </button>
          <button
            disabled={!listo}
            onClick={abrirVisorDoble}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: listo ? "#111827" : "#777",
              color: "#fff",
              cursor: listo ? "pointer" : "not-allowed",
            }}
          >
            Ver en visor doble
          </button>
        </div>
      </div>
    </div>
  );
}
