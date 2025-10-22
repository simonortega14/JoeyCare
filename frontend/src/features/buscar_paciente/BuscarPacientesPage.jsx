import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../../components/AppHeader.jsx';
import AppSidebar from '../../components/AppSidebar.jsx';
import PatientComparisonSelector from '../comparacion/PatientComparisonSelector.jsx';
import './buscarPacientes.css';

const BuscarPacientesPage = ({ onOpenSettings }) => {
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    nombre: '',
    peso_min: '',
    peso_max: '',
    edad_gestacional_min: '',
    edad_gestacional_max: '',
    edad_corregida_min: '',
    edad_corregida_max: ''
  });
  const [selectedPacientes, setSelectedPacientes] = useState([]);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const navigate = useNavigate();

  const fetchPacientes = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      const response = await fetch(`http://localhost:4000/api/pacientes?${queryParams}`);
      if (!response.ok) throw new Error('Error al obtener pacientes');
      const data = await response.json();
      setPacientes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPacientes();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => {
    fetchPacientes();
  };

  const handleViewDetails = (pacienteId) => {
    navigate(`/paciente/${pacienteId}`);
  };

  const handlePacienteSelect = (paciente) => {
    setSelectedPacientes(prev => {
      const isSelected = prev.some(p => p.id === paciente.id);
      if (isSelected) {
        return prev.filter(p => p.id !== paciente.id);
      } else if (prev.length < 2) {
        return [...prev, paciente];
      }
      return prev;
    });
  };

  const handleCompareSelected = () => {
    if (selectedPacientes.length === 2) {
      setShowComparisonModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowComparisonModal(false);
  };

  return (
    <div className="page-container">
      <AppHeader onOpenSettings={onOpenSettings} />
      <AppSidebar activeItem="Buscar Pacientes" />

      <div className="buscar-pacientes-content">
        <div className="buscar-pacientes-header">
          <h1>Buscar Pacientes</h1>
          <div className="filters-container">
            <div className="filter-group">
              <label>Nombre:</label>
              <input
                type="text"
                name="nombre"
                value={filters.nombre}
                onChange={handleFilterChange}
                placeholder="Buscar por nombre"
              />
            </div>
            <div className="filter-group">
              <label>Peso (g):</label>
              <input
                type="number"
                name="peso_min"
                value={filters.peso_min}
                onChange={handleFilterChange}
                placeholder="Mínimo"
              />
              <input
                type="number"
                name="peso_max"
                value={filters.peso_max}
                onChange={handleFilterChange}
                placeholder="Máximo"
              />
            </div>
            <div className="filter-group">
              <label>Edad Gestacional (sem):</label>
              <input
                type="number"
                name="edad_gestacional_min"
                value={filters.edad_gestacional_min}
                onChange={handleFilterChange}
                placeholder="Mínimo"
              />
              <input
                type="number"
                name="edad_gestacional_max"
                value={filters.edad_gestacional_max}
                onChange={handleFilterChange}
                placeholder="Máximo"
              />
            </div>
            <div className="filter-group">
              <label>Edad Corregida (sem):</label>
              <input
                type="number"
                name="edad_corregida_min"
                value={filters.edad_corregida_min}
                onChange={handleFilterChange}
                placeholder="Mínimo"
              />
              <input
                type="number"
                name="edad_corregida_max"
                value={filters.edad_corregida_max}
                onChange={handleFilterChange}
                placeholder="Máximo"
              />
            </div>
            <button onClick={handleSearch} className="search-btn">Buscar</button>
            {selectedPacientes.length === 2 && (
              <button onClick={handleCompareSelected} className="compare-btn">
                Comparar seleccionados ({selectedPacientes.length}/2)
              </button>
            )}
          </div>
        </div>

        {loading && <div className="loading">Cargando pacientes...</div>}
        {error && <div className="error">Error: {error}</div>}

        <div className="pacientes-grid">
          {pacientes.map((paciente, index) => (
            <div key={paciente.id || index} className="paciente-card">
              <div className="paciente-image-container">
                <input
                  type="checkbox"
                  checked={selectedPacientes.some(p => p.id === paciente.id)}
                  onChange={() => handlePacienteSelect(paciente)}
                  className="paciente-checkbox"
                />
                <div className="logo-placeholder paciente-logo">P</div>
              </div>
              <div className="paciente-info">
                <h3 className="paciente-name-id">{paciente.nombre} {paciente.apellido} - {paciente.documento}</h3>
                <div className="paciente-details">
                  <div className="detail-item">
                    <span className="detail-label">Peso</span>
                    <span className="detail-value">{paciente.peso_nacimiento_g} g</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Edad gestacional</span>
                    <span className="detail-value">{paciente.edad_gestacional_sem} semanas</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Edad corregida</span>
                    <span className="detail-value">{paciente.edad_corregida_sem} semanas</span>
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

        {pacientes.length === 0 && !loading && (
          <div className="no-results">
            <p>No se encontraron pacientes que coincidan con los filtros.</p>
          </div>
        )}

        {showComparisonModal && (
          <PatientComparisonSelector
            selectedPacientes={selectedPacientes}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </div>
  );
};

export default BuscarPacientesPage;