import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../../components/AppHeader.jsx';
import AppSidebar from '../../components/AppSidebar.jsx';
import './buscarPacientes.css';

const BuscarPacientesPage = ({ onOpenSettings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('name');
  const navigate = useNavigate(); // Hook para navegación

  // Datos de ejemplo de pacientes
  const pacientes = [
    { id: "BG-123", nombre: "Bebé García", peso: "2400 g", edadGestacional: "30 semanas", edadCorregida: "32 semanas" },
    { id: "BR-456", nombre: "Bebé Rodríguez", peso: "2100 g", edadGestacional: "28 semanas", edadCorregida: "28 semanas" },
    { id: "BL-789", nombre: "Bebé López", peso: "2600 g", edadGestacional: "28 semanas", edadCorregida: "30 semanas" },
    { id: "BM-012", nombre: "Bebé Martínez", peso: "2300 g", edadGestacional: "29 semanas", edadCorregida: "31 semanas" },
    { id: "BG-345", nombre: "Bebé González", peso: "2500 g", edadGestacional: "31 semanas", edadCorregida: "33 semanas" },
    { id: "BP-678", nombre: "Bebé Pérez", peso: "2200 g", edadGestacional: "27 semanas", edadCorregida: "29 semanas" },
    { id: "BS-901", nombre: "Bebé Sánchez", peso: "2700 g", edadGestacional: "32 semanas", edadCorregida: "34 semanas" }
  ];

  // Filtrar pacientes basado en el tipo de búsqueda
  let filteredPacientes = pacientes;
  if (searchType === 'name') {
    filteredPacientes = pacientes.filter(paciente =>
      paciente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paciente.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  } else if (searchType === 'weight') {
    if (searchTerm.includes('-')) {
      const [min, max] = searchTerm.split('-').map(s => parseFloat(s.trim()) * 1000);
      filteredPacientes = pacientes.filter(paciente => {
        const peso = parseFloat(paciente.peso.replace(' g', ''));
        return peso >= min && peso <= max;
      });
    } else if (searchTerm) {
      const peso = parseFloat(searchTerm) * 1000;
      filteredPacientes = pacientes.filter(paciente => parseFloat(paciente.peso.replace(' g', '')) === peso);
    }
  } else if (searchType === 'gestational') {
    if (searchTerm.includes('-')) {
      const [min, max] = searchTerm.split('-').map(s => parseInt(s.trim()));
      filteredPacientes = pacientes.filter(paciente => {
        const edad = parseInt(paciente.edadGestacional);
        return edad >= min && edad <= max;
      });
    } else if (searchTerm) {
      const edad = parseInt(searchTerm);
      filteredPacientes = pacientes.filter(paciente => parseInt(paciente.edadGestacional) === edad);
    }
  } else if (searchType === 'corrected') {
    if (searchTerm.includes('-')) {
      const [min, max] = searchTerm.split('-').map(s => parseInt(s.trim()));
      filteredPacientes = pacientes.filter(paciente => {
        const edad = parseInt(paciente.edadCorregida);
        return edad >= min && edad <= max;
      });
    } else if (searchTerm) {
      const edad = parseInt(searchTerm);
      filteredPacientes = pacientes.filter(paciente => parseInt(paciente.edadCorregida) === edad);
    }
  }

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
              placeholder={
                searchType === 'name' ? "Buscar por nombre o ID..." :
                searchType === 'weight' ? "Buscar por peso (ej: 2400 o 2000-3000)..." :
                searchType === 'gestational' ? "Buscar por edad gestacional (ej: 30 o 28-32)..." :
                "Buscar por edad corregida (ej: 30 o 28-32)..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
          <div className="search-buttons">
            <button
              className={`search-btn ${searchType === 'name' ? 'active' : ''}`}
              onClick={() => setSearchType('name')}
            >
              Nombre/ID
            </button>
            <button
              className={`search-btn ${searchType === 'weight' ? 'active' : ''}`}
              onClick={() => setSearchType('weight')}
            >
              Peso
            </button>
            <button
              className={`search-btn ${searchType === 'gestational' ? 'active' : ''}`}
              onClick={() => setSearchType('gestational')}
            >
              Edad Gestacional
            </button>
            <button
              className={`search-btn ${searchType === 'corrected' ? 'active' : ''}`}
              onClick={() => setSearchType('corrected')}
            >
              Edad Corregida
            </button>
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
                    <span className="detail-label">Edad gestacional</span>
                    <span className="detail-value">{paciente.edadGestacional}</span>
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