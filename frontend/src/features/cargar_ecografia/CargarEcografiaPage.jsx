import { useState } from "react";
import "./CargarEcografia.css";
import AppHeader from '../../components/AppHeader.jsx';

const CargarEcografiaPage = () => {
  const [file, setFile] = useState(null);

  const handleChange = (e) => setFile(e.target.files[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      alert("Por favor selecciona un archivo primero");
      return;
    }
    // Ejemplo de envío al backend:
    // const fd = new FormData();
    // fd.append("ecografia", file);
    // await fetch("/api/dicom/upload", { method: "POST", body: fd });
    alert(`Archivo listo para subir: ${file.name}`);
  };

  return (
    
    <div className="cargar-page">
      
      <div className="cargar-card">
        <h2 className="cargar-title">Cargar Ecografía</h2>
        <form onSubmit={handleSubmit}>
          <label className="cargar-label">Archivo (.dcm, .dicom o .zip)</label>
          <input
            className="cargar-input"
            type="file"
            accept=".dcm,.dicom,.zip"
            onChange={handleChange}
          />
          <div className="cargar-hint">Tamaño recomendado &lt; 1 GB.</div>
          <button type="submit" className="cargar-btn">Subir</button>
        </form>
        {file && <div className="cargar-filename">Seleccionado: {file.name}</div>}
      </div>
    </div>
  );
};

export default CargarEcografiaPage;
