import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppHeader from '../../components/AppHeader.jsx';
import AppSidebar from '../../components/AppSidebar.jsx';
import './paciente.css';

const PacientePage = ({ onOpenSettings }) => {
  const { id } = useParams(); 
  const navigate = useNavigate(); 

  // Datos de ejemplo del paciente
  const pacientes = {
    "BG-123": { nombre: "Bebé García", peso: "2.4 kg", edadCorregida: "32 semanas", edad: "8 meses", genero: "Femenino" },
    "BR-456": { nombre: "Bebé Rodríguez", peso: "2.1 kg", edadCorregida: "28 semanas", edad: "7 meses", genero: "Masculino" },
    "BL-789": { nombre: "Bebé López", peso: "2.6 kg", edadCorregida: "30 semanas", edad: "7.5 meses", genero: "Femenino" },
  };

  const paciente = pacientes[id] || { 
    nombre: "Paciente no encontrado", 
    peso: "N/A", 
    edadCorregida: "N/A", 
    edad: "N/A", 
    genero: "N/A" 
  };

  // Datos de ejemplo de ecografías
  const ecografias = [
    { id: 1, fecha: "15/05/2023", tipo: "Ecografía semana 5", estado: "Completada" },
    { id: 2, fecha: "20/06/2023", tipo: "Ecografía semana 10", estado: "Completada" },
    { id: 3, fecha: "10/07/2023", tipo: "Ecografía semana 20", estado: "Pendiente" },
    { id: 4, fecha: "25/07/2023", tipo: "Ecografía semana 35", estado: "Programada" }
  ];

  // Función para manejar el clic en "Ver detalles" de ecografía
  const handleViewEcografia = (ecografiaId) => {
    navigate(`/visualizar-ecografias/${ecografiaId}`);
  };

  // Función para manejar el clic en "Cargar Ecografía" - ACTUALIZADA
  const handleCargarEcografia = () => {
    navigate('/cargar-ecografias', {
      state: {
        paciente: {
          nombre: paciente.nombre,
          id: id
        }
      }
    });
  };

  return (
    <div className="paciente-container">
      <AppHeader onOpenSettings={onOpenSettings} />
      <AppSidebar activeItem="Buscar Pacientes" />
      
      <div className="paciente-content">
        {/* Información del paciente */}
        <div className="paciente-info-card">
          <div className="paciente-header">
            <div className="paciente-image-container">
              <div className="paciente-logo">P</div>
            </div>
            <div className="paciente-details">
              <h1>{paciente.nombre} {id}</h1>
              <div className="paciente-stats">
                <div className="stat-item">
                  <span className="stat-label">Peso</span>
                  <span className="stat-value">{paciente.peso}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Edad corregida</span>
                  <span className="stat-value">{paciente.edadCorregida}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Edad</span>
                  <span className="stat-value">{paciente.edad}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Género</span>
                  <span className="stat-value">{paciente.genero}</span>
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

        {/* Sección de Ecografías */}
        <div className="ecografias-section">
          <h2>Ecografías</h2>
          <div className="ecografias-list">
            {ecografias.map(eco => (
              <div key={eco.id} className="ecografia-card">
                <div className="ecografia-info">
                  <h3>{eco.tipo}</h3>
                  <p>Fecha: {eco.fecha}</p>
                </div>
                <div className={`ecografia-status ${eco.estado.toLowerCase()}`}>
                  {eco.estado}
                </div>
                <button 
                  className="ecografia-action-btn"
                  onClick={() => handleViewEcografia(eco.id)}
                >
                  Ver detalles
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PacientePage;