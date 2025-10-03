import React, { useEffect, useState } from "react";
import VtkViewer from "./VtkViewer";

export default function EcografiaApp() {
  const [pacientes, setPacientes] = useState([]);
  const [ecografias, setEcografias] = useState([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
  const [ecoSeleccionada, setEcoSeleccionada] = useState(null);

  // 1. Listar pacientes
  useEffect(() => {
    fetch("http://localhost:4000/api/pacientes")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setPacientes(data || []))
      .catch((err) => {
        console.error("Error al cargar pacientes:", err);
        setPacientes([]);
      });
  }, []);

  // 2. Cuando cambia el paciente, obtener sus ecografías
  useEffect(() => {
    if (pacienteSeleccionado == null) {
      setEcografias([]);
      setEcoSeleccionada(null);
      return;
    }

    fetch(`http://localhost:4000/api/pacientes/${pacienteSeleccionado}/ecografias`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setEcografias(Array.isArray(data) ? data : []);
        setEcoSeleccionada(null);
      })
      .catch((err) => {
        console.error("Error al cargar ecografías:", err);
        setEcografias([]);
        setEcoSeleccionada(null);
      });
  }, [pacienteSeleccionado]);

  // 3. Construir URL de la eco seleccionada
  const ecoURL = ecoSeleccionada && ecoSeleccionada.filename
    ? `http://localhost:4000/uploads/${encodeURIComponent(ecoSeleccionada.filename)}`
    : null;

  return (
    <div style={{ padding: 16 }}>
      <h2>Visualizador de Ecografías</h2>

      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8 }}>Paciente:</label>
        <select
          value={pacienteSeleccionado ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "") {
              setPacienteSeleccionado(null);
              setEcografias([]);
              setEcoSeleccionada(null);
            } else {
              setPacienteSeleccionado(Number(val));
              setEcografias([]);
              setEcoSeleccionada(null);
            }
          }}
        >
          <option value="">-- Seleccione un paciente --</option>
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} {p.apellido || ""}
            </option>
          ))}
        </select>
      </div>

      {pacienteSeleccionado != null && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ marginRight: 8 }}>Ecografía:</label>
          <select
            value={ecoSeleccionada?.id || ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "") setEcoSeleccionada(null);
              else {
                const found = ecografias.find((eco) => eco.id === Number(val));
                setEcoSeleccionada(found || null);
              }
            }}
          >
            <option value="">-- Seleccione una ecografía --</option>
            {ecografias.map((eco) => (
              <option key={eco.id} value={eco.id}>
                {eco.filename}{" "}
                {eco.uploaded_at
                  ? `(${new Date(eco.uploaded_at).toLocaleString()})`
                  : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {ecoURL ? (
        <div style={{ marginTop: 16 }}>
          <VtkViewer imageURL={ecoURL} />
        </div>
      ) : (
        <div style={{ marginTop: 16, color: "#666" }}>
          Selecciona una ecografía para visualizarla.
        </div>
      )}
    </div>
  );
}
