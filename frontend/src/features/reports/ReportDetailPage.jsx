import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './reports.css';

const ReportDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reporte, setReporte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReporteDetalle = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:54112/api/reportes/${id}`);
      if (!response.ok) {
        throw new Error('Error al cargar el reporte');
      }
      const data = await response.json();
      setReporte(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReporteDetalle();
  }, [fetchReporteDetalle]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'firmado': return '#28a745';
      case 'borrador': return '#ffc107';
      case 'antiguo': return '#6c757d';
      case 'anulado': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getEstadoText = (estado) => {
    switch (estado) {
      case 'firmado': return 'Firmado';
      case 'borrador': return 'Borrador';
      case 'antiguo': return 'Antiguo';
      case 'anulado': return 'Anulado';
      default: return estado;
    }
  };

  if (loading) {
    return (
      <div className="report-detail-container">
        <div className="loading">Cargando reporte...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-detail-container">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/reportes')} className="back-btn">
            ← Volver a Reportes
          </button>
        </div>
      </div>
    );
  }

  if (!reporte) {
    return (
      <div className="report-detail-container">
        <div className="error-message">
          <h2>Reporte no encontrado</h2>
          <button onClick={() => navigate('/reportes')} className="back-btn">
            ← Volver a Reportes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="report-detail-container">
      <div className="report-detail-header">
        <button onClick={() => navigate('/reportes')} className="back-btn">
          ← Volver a Reportes
        </button>
        <div className="report-title-section">
          <h1>{reporte.titulo || 'Sin título'}</h1>
          <span
            className="estado-badge"
            style={{ backgroundColor: getEstadoColor(reporte.estado) }}
          >
            {getEstadoText(reporte.estado)}
          </span>
        </div>
      </div>

      <div className="report-detail-content">
        {/* Información del Paciente */}
        <div className="info-section">
          <h2>Información del Paciente</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Nombre:</label>
              <span>{reporte.paciente_nombre} {reporte.paciente_apellido}</span>
            </div>
            <div className="info-item">
              <label>Documento:</label>
              <span>{reporte.paciente_documento}</span>
            </div>
          </div>
        </div>

        {/* Información del Médico */}
        <div className="info-section">
          <h2>Información del Médico</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Médico Responsable:</label>
              <span>{reporte.medico_nombre} {reporte.medico_apellido}</span>
            </div>
            <div className="info-item">
              <label>Fecha del Reporte:</label>
              <span>{formatDate(reporte.fecha_reporte)}</span>
            </div>
            <div className="info-item">
              <label>Última Modificación:</label>
              <span>{formatDate(reporte.updated_at)}</span>
            </div>
          </div>
        </div>

        {/* Contenido del Reporte */}
        <div className="report-content-section">
          <h2>Contenido del Reporte</h2>

          <div className="report-field">
            <h3>Título</h3>
            <div className="field-content">
              {reporte.titulo || 'No especificado'}
            </div>
          </div>

          <div className="report-field">
            <h3>Contenido</h3>
            <div className="field-content">
              {reporte.contenido ? reporte.contenido.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              )) : 'No especificado'}
            </div>
          </div>

          <div className="report-field">
            <h3>Hallazgos</h3>
            <div className="field-content">
              {reporte.hallazgos ? reporte.hallazgos.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              )) : 'No especificado'}
            </div>
          </div>

          <div className="report-field">
            <h3>Conclusión</h3>
            <div className="field-content">
              {reporte.conclusion ? reporte.conclusion.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              )) : 'No especificado'}
            </div>
          </div>

          <div className="report-field">
            <h3>Recomendaciones</h3>
            <div className="field-content">
              {reporte.recomendaciones ? reporte.recomendaciones.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              )) : 'No especificado'}
            </div>
          </div>

          <div className="report-field">
            <h3>Firma del Médico</h3>
            <div className="field-content signature">
              {reporte.firma_medico || 'No especificado'}
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="report-actions">
          <button
            onClick={() => navigate(`/visualizar-ecografias?reporte=${reporte.ecografia_id}`)}
            className="action-btn primary"
          >
            🖼️ Ver Imágenes del Estudio
          </button>
          <button
            onClick={() => navigate('/reportes')}
            className="action-btn secondary"
          >
            📄 Volver a Reportes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportDetailPage;