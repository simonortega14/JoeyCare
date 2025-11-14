import React, { useState, useEffect, useCallback } from 'react';
import './profile.css';

const ReportHistoryPage = ({ user }) => {
  const [reportesHistory, setReportesHistory] = useState([]);
  const [selectedReporte, setSelectedReporte] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReportesHistory = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch(`http://localhost:4000/api/reportes/history/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setReportesHistory(data);
      }
    } catch (error) {
      console.error('Error fetching reports history:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchReportesHistory();
  }, [user, fetchReportesHistory]);

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

  return (
    <div className="profile-container">
      <div className="profile-content">
        <div className="reports-history-card">
          <h2>Historial Completo de Reportes</h2>

          {loading ? (
            <p>Cargando historial de reportes...</p>
          ) : reportesHistory.length > 0 ? (
            <div className="reports-list">
              {reportesHistory.map((reporte) => (
                <div key={reporte.id} className="report-item">
                  <div className="report-info">
                    <h4>{reporte.titulo || 'Sin título'}</h4>
                    <p><strong>Paciente:</strong> {reporte.paciente_nombre} {reporte.paciente_apellido}</p>
                    <p><strong>Última modificación:</strong> {formatDate(reporte.updated_at || reporte.fecha_reporte)}</p>
                  </div>
                  <div className="report-actions">
                    <button
                      className="view-report-btn"
                      onClick={() => fetchHistorialDetalle(reporte.id)}
                    >
                      Ver Historial
                    </button>
                    <button
                      className="view-report-btn"
                      style={{ backgroundColor: '#28a745' }}
                      onClick={() => window.location.href = `/reportes/${reporte.id}`}
                    >
                      Ver Reporte Actual
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No hay reportes en el historial</p>
          )}

          {selectedReporte && historial.length > 0 && (
            <div className="historial-detalle" style={{ marginTop: '30px' }}>
              <h3>Historial de Versiones</h3>
              <div className="historial-list">
                {historial.map((version) => (
                  <div key={version.id} className="historial-item">
                    <div className="version-header">
                      <h4>Versión {version.version}</h4>
                      <span className="version-date">{formatDate(version.fecha_cambio)}</span>
                    </div>
                    <div className="version-info">
                      <p><strong>Médico:</strong> {version.medico_nombre} {version.medico_apellido}</p>
                      <div className="version-data">
                        <pre>{JSON.stringify(typeof version.datos_json === 'string' ? JSON.parse(version.datos_json) : version.datos_json, null, 2)}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportHistoryPage;