import React from 'react';
import AppHeader from '../../components/AppHeader.jsx';
import AppSidebar from '../../components/AppSidebar.jsx';
import './paciente.css';

const PacientePage = ({ onOpenSettings }) => {
  // Datos de ejemplo del paciente
  const paciente = {
    nombre: "Bebé García",
    id: "- 123",
    peso: "2.4 kg",
    edadCorregida: "32 semanas",
    edad: "8 meses",
    genero: "Femenino"
  };

  // Datos de ejemplo de ecografías
  const ecografias = [
    { id: 1, fecha: "15/05/2023", tipo: "Ecografía semana 10", estado: "Completada" },
    { id: 2, fecha: "20/06/2023", tipo: "Ecografía semana 20", estado: "Completada" },
    { id: 3, fecha: "10/07/2023", tipo: "Ecografía semana 30", estado: "Pendiente" },
    { id: 4, fecha: "25/07/2023", tipo: "Ecografía semana 35", estado: "Programada" }
  ];

  return (
    <div className="paciente-container">
      <AppHeader onOpenSettings={onOpenSettings} />
      <AppSidebar activeItem="Buscar Pacientes" />
      
      <div className="paciente-content">
        {/* Información del paciente */}
        <div className="paciente-info-card">
          <div className="paciente-header">
            <div className="paciente-image-container">
              <div className="logo-placeholder paciente-logo">P</div>
            </div>
            <div className="paciente-details">
              <h1>{paciente.nombre} {paciente.id}</h1>
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
                <button className="ecografia-action-btn">
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