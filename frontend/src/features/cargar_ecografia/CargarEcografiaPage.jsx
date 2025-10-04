import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppHeader from '../../components/AppHeader';
import AppSidebar from '../../components/AppSidebar';
import './CargarEcografia.css';

const CargarEcografiaPage = ({ onOpenSettings }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Obtener datos del paciente desde la navegación
  const { paciente } = location.state || {};
  const pacienteNombre = paciente?.nombre || 'Paciente no especificado';
  const pacienteId = paciente?.id || 'ID no disponible';

  const [formData, setFormData] = useState({
    fecha: '',
    observaciones: '',
    archivo: null
  });
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, archivo: file }));
      simulateUpload();
    }
  };

  const simulateUpload = () => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 200);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const datosCompletos = {
      ...formData,
      pacienteNombre,
      pacienteId,
      tipo: 'cerebral' 
    };
    console.log('Datos a enviar:', datosCompletos);
    navigate('/buscar-pacientes');
  };

  return (
    <div className="cargar-container">
      <AppHeader onOpenSettings={onOpenSettings} />
      <AppSidebar activeItem="Cargar Ecografías" />
      
      <div className="cargar-content">
        <div className="cargar-card">
          <h1 className="cargar-title">Cargar nueva ecografía</h1>
          
          {/* Información del paciente */}
          <div className="patient-info-header">
            <h3 className="patient-name">{pacienteNombre}</h3>
            <p className="patient-id">ID: {pacienteId}</p>
          </div>
          
          <form className="cargar-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="cargar-label">Fecha del estudio</label>
              <input
                type="date"
                className="cargar-input"
                name="fecha"
                value={formData.fecha}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="cargar-label">Observaciones</label>
              <textarea
                className="cargar-input"
                name="observaciones"
                value={formData.observaciones}
                onChange={handleInputChange}
                rows="4"
                placeholder="Agregar observaciones relevantes del estudio..."
              />
              <span className="cargar-hint">Opcional</span>
            </div>

            <div className="form-group">
              <label className="cargar-label">Archivo de ecografía </label>
              <div className="file-upload-area">
                <div className="upload-icon">📁</div>
                <div className="upload-text">Arrastra y suelta el archivo DICOM aquí</div>
                <div className="upload-subtext">o</div>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  accept=".dcm,.dicom"
                  style={{ display: 'none' }}
                  id="file-input"
                />
                <label htmlFor="file-input" className="cargar-btn">
                  Seleccionar archivo DICOM
                </label>
              </div>
              {formData.archivo && (
                <div className="cargar-filename">
                  📄 {formData.archivo.name}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="upload-progress">
                      <div 
                        className="progress-bar" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <button type="submit" className="cargar-btn cargar-btn-primary">
              ⬆️ Subir ecografía 
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CargarEcografiaPage;