import { useEffect, useMemo, useRef, useState } from "react";
import "./CargarEcografia.css";

const FAKE_PATIENTS = [
  { id: "123", nombre: "Bebé García" },
  { id: "456", nombre: "Bebé Rodríguez" },
  { id: "789", nombre: "Bebé López" },
  { id: "012", nombre: "Bebé Martínez" },
  { id: "345", nombre: "Bebé González" },
];

const CargarEcografiaPage = () => {
  const [file, setFile] = useState(null);
  const [query, setQuery] = useState("");           // texto de búsqueda
  const [patient, setPatient] = useState(null);     // paciente seleccionado
  const [openList, setOpenList] = useState(false);  // controla dropdown
  const [isSubmitting, setIsSubmitting] = useState(false);
  const listRef = useRef(null);

  // Filtrar pacientes por id o nombre
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return FAKE_PATIENTS.filter(
      (p) => p.id.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [query]);

  // Cerrar lista si se hace click fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (listRef.current && !listRef.current.contains(e.target)) {
        setOpenList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChangeFile = (e) => setFile(e.target.files[0]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patient) return alert("Selecciona primero un paciente");
    if (!file)    return alert("Por favor selecciona un archivo primero");

    try {
      setIsSubmitting(true);
      // Ejemplo de envío al backend:
      // const fd = new FormData();
      // fd.append("patientId", patient.id);
      // fd.append("ecografia", file);
      // const res = await fetch("/api/dicom/upload", { method: "POST", body: fd });
      // const json = await res.json();
      // if (!res.ok) throw new Error(json?.message || "Error al subir");
      alert(`Subida lista: paciente ${patient.id} • archivo ${file.name}`);
      setFile(null); // limpiar
    } catch (err) {
      alert(err.message || "Error inesperado al subir");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePick = (p) => {
    setPatient(p);
    setQuery(`${p.id} — ${p.nombre}`);
    setOpenList(false);
  };

  const resetPatient = () => {
    setPatient(null);
    setQuery("");
  };

  return (
    <div className="cargar-page">
      <div className="cargar-card">
        <h2 className="cargar-title">Cargar Ecografía</h2>

        {/* Selección de Paciente */}
        <div className="campo">
          <label className="cargar-label">Paciente</label>
          <div className="patient-picker" ref={listRef}>
            <input
              className="cargar-input"
              placeholder="Buscar por ID o nombre (ej: 123 o García)"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPatient(null);
                setOpenList(true);
              }}
              onFocus={() => setOpenList(true)}
              disabled={!!patient} // si ya está seleccionado, bloquea el input
            />
            {patient ? (
              <button type="button" className="mini-btn" onClick={resetPatient} title="Cambiar paciente">
                Cambiar
              </button>
            ) : null}

            {/* Lista de sugerencias */}
            {openList && suggestions.length > 0 && !patient && (
              <ul className="patient-list">
                {suggestions.map((p) => (
                  <li key={p.id} className="patient-item" onClick={() => handlePick(p)}>
                    <span className="patient-id">{p.id}</span>
                    <span className="patient-name">{p.nombre}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {!patient && <div className="cargar-hint">Selecciona un paciente para habilitar la carga.</div>}
          {patient && (
            <div className="pill-ok">
              Paciente seleccionado: <strong>{patient.id}</strong> — {patient.nombre}
            </div>
          )}
        </div>

        {/* Formulario de carga */}
        <form onSubmit={handleSubmit}>
          <label className="cargar-label">Archivo (.dcm, .dicom o .zip)</label>
          <input
            className="cargar-input"
            type="file"
            accept=".dcm,.dicom,.zip"
            onChange={handleChangeFile}
            disabled={!patient}  // bloquea hasta elegir paciente
          />
          <div className="cargar-hint">Tamaño recomendado &lt; 1 GB.</div>

          <button
            type="submit"
            className="cargar-btn"
            disabled={!patient || !file || isSubmitting}
            title={!patient ? "Selecciona un paciente" : (!file ? "Selecciona un archivo" : "Subir")}
          >
            {isSubmitting ? "Subiendo..." : "Subir"}
          </button>
        </form>

        {file && <div className="cargar-filename">Seleccionado: {file.name}</div>}
      </div>
    </div>
  );
};

export default CargarEcografiaPage;
