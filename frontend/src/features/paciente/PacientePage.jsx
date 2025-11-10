import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppHeader from '../../components/AppHeader.jsx';
import AppSidebar from '../../components/AppSidebar.jsx';
import './paciente.css';

const PacientePage = ({ onOpenSettings }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState(null);
  const [ecografias, setEcografias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPaciente = async () => {
      try {
        const response = await fetch(`http://localhost:4000/api/neonatos/${id}`);
        if (!response.ok) {
          throw new Error('Error al obtener los datos del paciente');
        }
        const data = await response.json();
        setPaciente(data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching paciente:', err);
      }
    };

    const fetchEcografias = async () => {
      try {
        const response = await fetch(`http://localhost:4000/api/neonatos/${id}/ecografias`);
        if (!response.ok) {
          throw new Error('Error al obtener las ecografías del paciente');
        }
        const data = await response.json();
        setEcografias(data);
      } catch (err) {
        console.error('Error fetching ecografias:', err);
      }
    };

    Promise.all([fetchPaciente(), fetchEcografias()]).finally(() => {
      setLoading(false);
    });
  }, [id]);


  // Función para traducir el parentesco
  const traducirParentesco = (parentesco) => {
    switch (parentesco) {
      case 'P': return 'Padre';
      case 'M': return 'Madre';
      case 'H': return 'Hermano/a';
      case 'O': return 'Otro';
      default: return 'N/A';
    }
  };

  // Función para manejar el clic en "Ver detalles" de ecografía
  const handleViewEcografia = (ecografia) => {
    window.location.href = `/visualizar-ecografias?patient=${id}&file=${ecografia.filepath}`;
  };

  // Función para manejar el clic en "Cargar Ecografía" - ACTUALIZADA
  const handleCargarEcografia = () => {
    window.location.href = `/cargar-ecografias?patient=${id}`;
  };

  if (loading) {
    return (
      <div className="paciente-container">
        <AppHeader onOpenSettings={onOpenSettings} />
        <AppSidebar activeItem="Buscar Pacientes" />
        <div className="paciente-content">
          <p>Cargando información del paciente...</p>
        </div>
      </div>
    );
  }

  if (error || !paciente) {
    return (
      <div className="paciente-container">
        <AppHeader onOpenSettings={onOpenSettings} />
        <AppSidebar activeItem="Buscar Pacientes" />
        <div className="paciente-content">
          <p>Error: {error || 'Paciente no encontrado'}</p>
          <button onClick={() => navigate('/buscar-pacientes')} className="back-btn">
            ← Volver a buscar pacientes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="paciente-container">
      <AppHeader onOpenSettings={onOpenSettings} />
      <AppSidebar activeItem="Buscar Pacientes" />

      <div className="paciente-content">
        {/* Botón de volver */}
        <div className="back-button-container">
          <button onClick={() => navigate('/buscar-pacientes')} className="back-btn">
            ← Volver a buscar pacientes
          </button>
        </div>

        {/* Información del paciente */}
        <div className="paciente-info-card">
          <div className="paciente-header">
            <div className="paciente-image-container">
              <div className="paciente-logo">N{paciente.id}</div>
            </div>
            <div className="paciente-details">
              <h1>{paciente.nombre} {paciente.apellido}</h1>
              <div className="paciente-stats">
                <div className="stat-item">
                  <span className="stat-label">Documento</span>
                  <span className="stat-value">{paciente.documento}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Sexo</span>
                  <span className="stat-value">
                    {paciente.sexo === 'F' ? 'Femenino' :
                     paciente.sexo === 'M' ? 'Masculino' :
                     paciente.sexo === 'X' ? 'Otro' : 'N/A'}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Fecha de nacimiento</span>
                  <span className="stat-value">
                    {paciente.fecha_nacimiento ?
                      new Date(paciente.fecha_nacimiento).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      }) : 'N/A'}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Edad gestacional</span>
                  <span className="stat-value">{paciente.edad_gestacional_sem ? `${paciente.edad_gestacional_sem} semanas` : 'N/A'}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Edad corregida</span>
                  <span className="stat-value">{paciente.edad_corregida_sem ? `${paciente.edad_corregida_sem} semanas` : 'N/A'}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Peso nacimiento</span>
                  <span className="stat-value">{paciente.peso_nacimiento_g ? `${paciente.peso_nacimiento_g} g` : 'N/A'}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Peso actual</span>
                  <span className="stat-value">{paciente.peso_actual_g ? `${paciente.peso_actual_g} g` : 'N/A'}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Perímetro cefálico</span>
                  <span className="stat-value">{paciente.perimetro_cefalico ? `${paciente.perimetro_cefalico} cm` : 'N/A'}</span>
                </div>
              </div>
            </div>
            <div className="paciente-actions">
              <button className="cargar-ecografia-btn" onClick={handleCargarEcografia}>
                📁 Cargar Ecografía
              </button>
            </div>
          </div>
        </div>

        {/* Información del acudiente */}
        {paciente.nombre_acudiente && (
          <div className="acudiente-info-card">
            <h2>Información del Acudiente</h2>
            <div className="acudiente-details">
              <div className="detail-item">
                <span className="detail-label">Nombre completo</span>
                <span className="detail-value">{paciente.nombre_acudiente} {paciente.apellido_acudiente}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Parentesco</span>
                <span className="detail-value">{traducirParentesco(paciente.parentesco)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Teléfono</span>
                <span className="detail-value">{paciente.telefono}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Correo electrónico</span>
                <span className="detail-value">{paciente.correo}</span>
              </div>
            </div>
          </div>
        )}

        {/* Sección de Ecografías */}
        <div className="ecografias-section">
          <h2>Ecografías</h2>
          <div className="ecografias-list">
            {ecografias.length > 0 ? (
              ecografias.map(eco => (
                <div key={eco.id} className="ecografia-card">
                  <div className="ecografia-info">
                    <h3>Ecografía ID: {eco.id}</h3>
                    <p>Fecha: {new Date(eco.fecha_hora).toLocaleDateString('es-ES')}</p>
                    <p>Hora: {new Date(eco.fecha_hora).toLocaleTimeString('es-ES')}</p>
                    <p>Subido por: {eco.uploader_nombre} {eco.uploader_apellido}</p>
                    <p>Archivo: {eco.filepath}</p>
                    <p>Tamaño: {(eco.size_bytes / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <div className="ecografia-status completada">
                    Completada
                  </div>
                  <button
                    className="ecografia-action-btn"
                    onClick={() => handleViewEcografia(eco)}
                  >
                    Ver detalles
                  </button>
                </div>
              ))
            ) : (
              <p>No hay ecografías registradas para este paciente.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PacientePage;