import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../../components/AppHeader.jsx';
import AppSidebar from '../../components/AppSidebar.jsx';
import PatientComparisonSelector from '../comparacion/PatientComparisonSelector.jsx';
import './buscarPacientes.css';

const BuscarPacientesPage = ({ onOpenSettings }) => {
  const [neonatos, setNeonatos] = useState([]);
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
  const [selectedNeonatos, setSelectedNeonatos] = useState([]);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const navigate = useNavigate();

  const fetchNeonatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      const response = await fetch(`http://localhost:4000/api/neonatos?${queryParams}`);
      if (!response.ok) throw new Error('Error al obtener neonatos');
      const data = await response.json();
      setNeonatos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchNeonatos();
  }, [fetchNeonatos]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSearch = () => {
    fetchNeonatos();
  };

  const handleViewDetails = (neonatoId) => {
    navigate(`/neonato/${neonatoId}`);
  };

  const handleNeonatoSelect = (neonato) => {
    setSelectedNeonatos(prev => {
      const isSelected = prev.some(p => p.id === neonato.id);
      if (isSelected) {
        return prev.filter(p => p.id !== neonato.id);
      } else if (prev.length < 2) {
        return [...prev, neonato];
      }
      return prev;
    });
  };

  const handleCompareSelected = () => {
    if (selectedNeonatos.length === 2) {
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
          <div className="dashboard-title">
            <h1>🔍 Buscar Neonatos</h1>
            <p>Sistema PACS - Fundación Canguro</p>
          </div>
        </div>

        <div className="filters-container">
          <div className="filter-group">
            <label>Nombre:</label>
            <input
              type="text"
              name="nombre"
              value={filters.nombre}
              onChange={handleFilterChange}
              onKeyPress={handleKeyPress}
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
          {selectedNeonatos.length === 2 && (
            <button onClick={handleCompareSelected} className="compare-btn">
              Comparar seleccionados ({selectedNeonatos.length}/2)
            </button>
          )}
        </div>

        {loading && <div className="loading">Cargando neonatos...</div>}
        {error && <div className="error">Error: {error}</div>}

        <div className="pacientes-grid">
          {neonatos.map((neonato, index) => (
            <div key={neonato.id || index} className="paciente-card">
              <div className="paciente-image-container">
                <input
                  type="checkbox"
                  checked={selectedNeonatos.some(p => p.id === neonato.id)}
                  onChange={() => handleNeonatoSelect(neonato)}
                  className="paciente-checkbox"
                />
                <div className="logo-placeholder paciente-logo">N</div>
              </div>
              <div className="paciente-info">
                <h3 className="paciente-name-id">{neonato.nombre} {neonato.apellido} - {neonato.documento}</h3>
                <div className="paciente-details">
                  <div className="detail-item">
                    <span className="detail-label">Peso nacimiento</span>
                    <span className="detail-value">{neonato.peso_nacimiento_g} g</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Peso actual</span>
                    <span className="detail-value">{neonato.peso_actual_g || 'N/A'} g</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Edad gestacional</span>
                    <span className="detail-value">{neonato.edad_gestacional_sem} semanas</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Edad corregida</span>
                    <span className="detail-value">{neonato.edad_corregida_sem} semanas</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Perímetro cefálico</span>
                    <span className="detail-value">{neonato.perimetro_cefalico || 'N/A'} cm</span>
                  </div>
                </div>
                <button
                  className="view-paciente-btn"
                  onClick={() => handleViewDetails(neonato.id)}
                >
                  Ver detalles
                </button>
              </div>
            </div>
          ))}
        </div>

        {neonatos.length === 0 && !loading && (
          <div className="no-results">
            <p>No se encontraron neonatos que coincidan con los filtros.</p>
          </div>
        )}

        {showComparisonModal && (
          <PatientComparisonSelector
            selectedPacientes={selectedNeonatos}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </div>
  );
};

export default BuscarPacientesPage;