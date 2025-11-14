import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './reports.css';

const ReportsPage = () => {
  const navigate = useNavigate();
  const [reportes, setReportes] = useState([]);
  const [selectedReporte, setSelectedReporte] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');

  const fetchReportes = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:4000/api/reportes/all');
      if (response.ok) {
        const data = await response.json();
        setReportes(data);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportes();
  }, [fetchReportes]);

  const fetchHistorialDetalle = async (reporteId) => {
    try {
      const response = await fetch(`http://localhost:4000/api/reportes/${reporteId}/historial`);
      if (response.ok) {
        const data = await response.json();
        setHistorial(data);
        setSelectedReporte(reporteId);
      }
    } catch (error) {
      console.error('Error fetching detailed history:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const filteredReportes = reportes.filter(reporte => {
    const matchesSearch = searchTerm === '' ||
      reporte.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reporte.paciente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reporte.paciente_apellido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reporte.medico_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reporte.medico_apellido?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEstado = filterEstado === 'todos' || reporte.estado === filterEstado;

    return matchesSearch && matchesEstado;
  });

  return (
    <div className="reports-container">
      <div className="reports-content">
        <div className="reports-header">
          <h1>Gestión de Reportes</h1>
          <div className="reports-filters">
            <input
              type="text"
              placeholder="Buscar por título, paciente o médico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="filter-select"
            >
              <option value="todos">Todos los estados</option>
              <option value="borrador">Borrador</option>
              <option value="firmado">Firmado</option>
              <option value="anulado">Anulado</option>
            </select>
          </div>
        </div>

        <div className="reports-grid">
          <div className="reports-list-section">
            <h2>Reportes ({filteredReportes.length})</h2>

            {loading ? (
              <p>Cargando reportes...</p>
            ) : filteredReportes.length > 0 ? (
              <div className="reports-list">
                {filteredReportes.map((reporte) => (
                  <div
                    key={reporte.id}
                    className={`report-card ${selectedReporte === reporte.id ? 'selected' : ''}`}
                    onClick={() => fetchHistorialDetalle(reporte.id)}
                  >
                    <div className="report-header">
                      <h3>{reporte.titulo || 'Sin título'}</h3>
                      <span className={`status-badge ${reporte.estado}`}>
                        {reporte.estado}
                      </span>
                    </div>

                    <div className="report-info">
                      <p><strong>Paciente:</strong> {reporte.paciente_nombre} {reporte.paciente_apellido}</p>
                      <p><strong>Médico:</strong> {reporte.medico_nombre} {reporte.medico_apellido}</p>
                      <p><strong>Fecha:</strong> {formatDate(reporte.fecha_reporte)}</p>
                      <p><strong>Última modificación:</strong> {formatDate(reporte.updated_at)}</p>
                    </div>

                    <div className="report-actions">
                      <button
                        className="action-btn view-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/reportes/${reporte.id}`);
                        }}
                      >
                        Ver Detalles
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No se encontraron reportes</p>
            )}
          </div>

          <div className="report-history-section">
            <h2>Historial de Versiones</h2>

            {selectedReporte ? (
              historial.length > 0 ? (
                <div className="history-timeline">
                  {historial.map((version, index) => (
                    <div key={version.id} className="history-item">
                      <div className="history-connector">
                        <div className="history-dot"></div>
                        {index < historial.length - 1 && <div className="history-line"></div>}
                      </div>

                      <div className="history-content">
                        <div className="history-header">
                          <h4>Versión {version.version}</h4>
                          <span className="history-date">{formatDate(version.fecha_cambio)}</span>
                        </div>

                        <div className="history-details">
                          <p><strong>Médico:</strong> {version.medico_nombre} {version.medico_apellido}</p>
                          <div className="history-changes">
                            <details>
                              <summary>Ver cambios detallados</summary>
                              <pre className="json-data">
                                  {JSON.stringify(typeof version.datos_json === 'string' ? JSON.parse(version.datos_json) : version.datos_json, null, 2)}
                                </pre>
                            </details>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Este reporte no tiene historial de versiones</p>
              )
            ) : (
              <p>Haz clic en un reporte de la lista para ver su historial de versiones aquí.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;