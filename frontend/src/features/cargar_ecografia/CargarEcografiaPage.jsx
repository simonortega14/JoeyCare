// src/features/viewer/CargarEcografiaPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import "./CargarEcografia.css";

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

  // Cargar pacientes
  useEffect(() => {
    const cargarPacientes = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("http://localhost:4000/api/pacientes");
        if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
        const data = await response.json();
        setPacientes(data || []);
      } catch (err) {
        console.error("Error cargando pacientes:", err);
        setError("No se pudieron cargar los pacientes. Usando datos de prueba.");
        setPacientes([
          { id: "123", nombre: "Bebé García" },
          { id: "456", nombre: "Bebé Rodríguez" },
          { id: "789", nombre: "Bebé López" },
          { id: "012", nombre: "Bebé Martínez" },
          { id: "345", nombre: "Bebé González" },
        ]);
      } finally {
        setLoading(false);
      }
    };
    cargarPacientes();
  }, []);

  // Filtrar pacientes
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return pacientes.filter(
      (p) => p.id.toString().includes(q) || p.nombre.toLowerCase().includes(q)
    ).slice(0, 6);
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
    const selected = e.target.files[0];
    if (!selected) return setFile(null);

    const ext = selected.name.split(".").pop().toLowerCase();
    if (!allowedTypes.includes("." + ext)) {
      alert(`Tipo de archivo no permitido. Usa: ${allowedTypes.join(", ")}`);
      e.target.value = null;
      return setFile(null);
    }

    setFile(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patient) return alert("Selecciona primero un paciente");
    if (!file) return alert("Por favor selecciona un archivo válido");

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("imagen", file);

      const response = await fetch(
        `http://localhost:4000/api/ecografias/${patient.id}`,
        { method: "POST", body: formData }
      );

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorMessage = "Error al subir ecografía";
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } else {
          const errorText = await response.text();
          console.error("Respuesta del servidor:", errorText);
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      alert(`Ecografía subida correctamente para ${patient.nombre}`);
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
    setQuery(`${p.id} — ${p.nombre}`);
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
          <div className="error-message" style={{color: 'orange', marginBottom: '1rem'}}>
            {error}
          </div>
        )}

        <div className="campo">
          <label className="cargar-label">Paciente</label>
          <div className="patient-picker" ref={listRef}>
            <input
              className="cargar-input"
              placeholder="Buscar por ID o nombre"
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
                    <span className="patient-id">{p.id}</span>
                    <span className="patient-name">{p.nombre}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {!patient && (
            <div className="cargar-hint">
              Selecciona un paciente para habilitar la carga.
              {pacientes.length === 0 && " (No hay pacientes disponibles)"}
            </div>
          )}
          {patient && (
            <div className="pill-ok">
              Paciente seleccionado: <strong>{patient.id}</strong> — {patient.nombre}
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

          <button
            type="submit"
            className="cargar-btn"
            disabled={!patient || !file || isSubmitting}
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
