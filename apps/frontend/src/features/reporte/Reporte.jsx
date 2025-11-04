/* eslint-disable */
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Reporte.css";

const API_BASE = import.meta.env.VITE_API_URL || ""; // ej. http://localhost

function getToken() {
  return localStorage.getItem("token") || "";
}
function getAuthHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
function getMedicoIdFromToken() {
  try {
    const t = localStorage.getItem("token");
    if (!t) return null;
    const payload = JSON.parse(atob(t.split(".")[1]));
    return payload?.medico_id || payload?.id || null;
  } catch {
    return null;
  }
}
function dataURLtoBlob(dataurl) {
  // data:image/png;base64,xxxx
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

export default function Reporte() {
  const { state } = useLocation() || {};
  const navigate = useNavigate();

  // Cargar payload desde state o respaldo en sessionStorage
  const initial = useMemo(() => {
    if (state && (state.ecografiaId || state.neonatoId)) return state;
    try {
      const raw = sessionStorage.getItem("report:payload");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, [state]);

  const [neonatoId, setNeonatoId] = useState(initial.neonatoId || initial.neonato_id || "");
  const [ecografiaId, setEcografiaId] = useState(initial.ecografiaId || initial.ecografia_id || "");
  const [medicoIdNav] = useState(initial.medicoId ?? null);
  const [imageDataUrl, setImageDataUrl] = useState(initial.imageDataUrl || null);
  const [medidas, setMedidas] = useState(initial.medidas || { puntos: [], trazos: [] });

  // Campos del reporte
  const [diagnostico, setDiagnostico] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [estado, setEstado] = useState("borrador");

  const medicoIdBackup = getMedicoIdFromToken();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [okMsg, setOkMsg] = useState("");

  useEffect(() => {
    // Si no tenemos los IDs mínimos, volver al visor
    if (!neonatoId || !ecografiaId) {
      setError("Faltan datos del contexto del reporte (neonato/ecografía).");
    }
  }, [neonatoId, ecografiaId]);

  async function handleGuardar() {
    setSaving(true);
    setError(null);
    setOkMsg("");

    try {
      if (!neonatoId || !ecografiaId) {
        throw new Error("Faltan IDs (neonato/ecografía).");
      }

      const medicoFinal = medicoIdNav ?? medicoIdBackup;

      const fd = new FormData();
      fd.append("neonato_id", String(neonatoId));
      fd.append("ecografia_id", String(ecografiaId));
      if (medicoFinal) fd.append("medico_id", String(medicoFinal)); // opcional si tu API infiere del JWT
      fd.append("diagnostico", diagnostico || "");
      fd.append("conclusion", conclusion || "");
      fd.append("estado", estado || "borrador");
      fd.append("medidas", JSON.stringify(medidas || {}));

      if (imageDataUrl) {
        const blob = dataURLtoBlob(imageDataUrl);
        fd.append("captura_png", blob, `captura_${ecografiaId}.png`);
      }

      // Ajusta la URL a tu ms-reportes real (ej: /api/reportes)
      const resp = await fetch(`${API_BASE}/api/reportes`, {
        method: "POST",
        headers: {
          ...getAuthHeader(),
        },
        body: fd,
      });

      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`Error backend: ${resp.status} ${t}`);
      }
      const json = await resp.json().catch(() => ({}));
      setOkMsg(`✅ Reporte guardado${json?.id ? ` (id: ${json.id})` : ""}.`);
      // Limpieza mínima si quieres
      // sessionStorage.removeItem("report:payload");
    } catch (e) {
      setError(e.message || "No se pudo guardar el reporte.");
    } finally {
      setSaving(false);
    }
  }

  function handleVolver() {
    navigate(-1);
  }

  return (
    <div className="rep-wrapper">
      <div className="rep-header">
        <h2>Nuevo Reporte</h2>
        <div className="rep-meta">
          <span>Neonato ID: <b>{neonatoId || "—"}</b></span>
          <span>Ecografía ID: <b>{ecografiaId || "—"}</b></span>
          <span>Médico ID: <b>{(medicoIdNav ?? medicoIdBackup) || "—"}</b></span>
        </div>
      </div>

      <div className="rep-grid">
        <div className="rep-left">
          <div className="rep-preview">
            {imageDataUrl ? (
              <img src={imageDataUrl} alt="Captura del visor con anotaciones" />
            ) : (
              <div className="rep-preview-empty">Sin imagen de captura</div>
            )}
          </div>
          <div className="rep-measures">
            <div><b>Puntos:</b> {medidas?.puntos?.length ?? 0}</div>
            <div><b>Trazos:</b> {medidas?.trazos?.length ?? 0}</div>
          </div>
        </div>

        <div className="rep-right">
          <label className="rep-label">Diagnóstico</label>
          <textarea
            className="rep-input"
            rows={5}
            value={diagnostico}
            onChange={(e) => setDiagnostico(e.target.value)}
            placeholder="Describe hallazgos clave…"
          />
          <label className="rep-label">Conclusión</label>
          <textarea
            className="rep-input"
            rows={5}
            value={conclusion}
            onChange={(e) => setConclusion(e.target.value)}
            placeholder="Conclusión del estudio…"
          />

          <label className="rep-label">Estado</label>
          <select className="rep-input" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="borrador">Borrador</option>
            <option value="firmado">Firmado</option>
            <option value="publicado">Publicado</option>
          </select>

          {error && <div className="rep-error">⚠ {error}</div>}
          {okMsg && <div className="rep-ok">{okMsg}</div>}

          <div className="rep-actions">
            <button className="rep-btn" onClick={handleVolver} disabled={saving}>Volver</button>
            <button className="rep-btn rep-btn-primary" onClick={handleGuardar} disabled={saving || !neonatoId || !ecografiaId}>
              {saving ? "Guardando…" : "Guardar reporte"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  
}
