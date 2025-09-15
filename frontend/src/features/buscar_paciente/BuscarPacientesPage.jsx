import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../../components/AppHeader.jsx';
import AppSidebar from '../../components/AppSidebar.jsx';
import './buscarPacientes.css';

const BuscarPacientesPage = ({ onOpenSettings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate(); // Hook para navegación

  // Datos de ejemplo de pacientes
  const pacientes = [
    { id: "BG-123", nombre: "Bebé García", peso: "2.4 kg", edadCorregida: "32 semanas" },
    { id: "BR-456", nombre: "Bebé Rodríguez", peso: "2.1 kg", edadCorregida: "28 semanas" },
    { id: "BL-789", nombre: "Bebé López", peso: "2.6 kg", edadCorregida: "30 semanas" },
    { id: "BM-012", nombre: "Bebé Martínez", peso: "2.3 kg", edadCorregida: "31 semanas" },
    { id: "BG-345", nombre: "Bebé González", peso: "2.5 kg", edadCorregida: "33 semanas" },
    { id: "BP-678", nombre: "Bebé Pérez", peso: "2.2 kg", edadCorregida: "29 semanas" },
    { id: "BS-901", nombre: "Bebé Sánchez", peso: "2.7 kg", edadCorregida: "34 semanas" }
  ];

  // Filtrar pacientes basado en la búsqueda
  const filteredPacientes = pacientes.filter(paciente =>
    paciente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    paciente.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Función para manejar el clic en "Ver detalles"
  const handleViewDetails = (pacienteId) => {
    navigate(`/paciente/${pacienteId}`);
  };

  return (
    <div className="page-container">
      <AppHeader onOpenSettings={onOpenSettings} />
      <AppSidebar activeItem="Buscar Pacientes" />
      
      <div className="buscar-pacientes-content">
        <div className="buscar-pacientes-header">
          <h1>Buscar Pacientes</h1>
          <div className="search-container">
            <input
              type="text"
              placeholder="Buscar por nombre o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
        </div>

        <div className="pacientes-grid">
          {filteredPacientes.map((paciente, index) => (
            <div key={index} className="paciente-card">
              <div className="paciente-image-container">
                <div className="logo-placeholder paciente-logo">P</div>
              </div>
              <div className="paciente-info">
                <h3 className="paciente-name-id">{paciente.nombre} {paciente.id}</h3>
                <div className="paciente-details">
                  <div className="detail-item">
                    <span className="detail-label">Peso</span>
                    <span className="detail-value">{paciente.peso}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Edad corregida</span>
                    <span className="detail-value">{paciente.edadCorregida}</span>
                  </div>
                </div>
                <button 
                  className="view-paciente-btn"
                  onClick={() => handleViewDetails(paciente.id)}
                >
                  Ver detalles
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredPacientes.length === 0 && (
          <div className="no-results">
            <p>No se encontraron pacientes que coincidan con la búsqueda.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuscarPacientesPage;