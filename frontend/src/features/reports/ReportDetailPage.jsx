import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './reports.css';

const ReportDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reporte, setReporte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedReport, setEditedReport] = useState({});

  const fetchReporteDetalle = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:4000/api/reportes/${id}`);
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

  const handleEdit = () => {
    setEditedReport({ ...reporte });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/reportes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ecografia_id: reporte.ecografia_id,
          titulo: editedReport.titulo,
          contenido: editedReport.contenido,
          hallazgos: editedReport.hallazgos,
          conclusion: editedReport.conclusion,
          recomendaciones: editedReport.recomendaciones,
          firma_medico: editedReport.firma_medico,
          medico_id: 1 // TODO: get from auth
        })
      });
      if (response.ok) {
        setReporte(editedReport);
        setIsEditing(false);
        alert('Reporte actualizado correctamente');
      } else {
        alert('Error al actualizar reporte');
      }
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Error al guardar cambios');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleAnular = async () => {
    if (!confirm('¿Está seguro de anular este reporte?')) return;
    try {
      const response = await fetch(`http://localhost:4000/api/reportes/${reporte.id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'anulado', medico_id: 1 })
      });
      if (response.ok) {
        setReporte({ ...reporte, estado: 'anulado' });
        alert('Reporte anulado correctamente');
      } else {
        alert('Error al anular reporte');
      }
    } catch (error) {
      console.error('Error anulando report:', error);
      alert('Error al anular reporte');
    }
  };

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
      case 'anulado': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getEstadoText = (estado) => {
    switch (estado) {
      case 'firmado': return 'Firmado';
      case 'borrador': return 'Borrador';
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
              {isEditing ? (
                <input
                  type="text"
                  value={editedReport.titulo || ''}
                  onChange={(e) => setEditedReport({ ...editedReport, titulo: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              ) : (
                reporte.titulo || 'No especificado'
              )}
            </div>
          </div>

          <div className="report-field">
            <h3>Contenido</h3>
            <div className="field-content">
              {isEditing ? (
                <textarea
                  value={editedReport.contenido || ''}
                  onChange={(e) => setEditedReport({ ...editedReport, contenido: e.target.value })}
                  rows={4}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              ) : (
                reporte.contenido ? reporte.contenido.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                )) : 'No especificado'
              )}
            </div>
          </div>

          <div className="report-field">
            <h3>Hallazgos</h3>
            <div className="field-content">
              {isEditing ? (
                <textarea
                  value={editedReport.hallazgos || ''}
                  onChange={(e) => setEditedReport({ ...editedReport, hallazgos: e.target.value })}
                  rows={4}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              ) : (
                reporte.hallazgos ? reporte.hallazgos.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                )) : 'No especificado'
              )}
            </div>
          </div>

          <div className="report-field">
            <h3>Conclusión</h3>
            <div className="field-content">
              {isEditing ? (
                <textarea
                  value={editedReport.conclusion || ''}
                  onChange={(e) => setEditedReport({ ...editedReport, conclusion: e.target.value })}
                  rows={4}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              ) : (
                reporte.conclusion ? reporte.conclusion.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                )) : 'No especificado'
              )}
            </div>
          </div>

          <div className="report-field">
            <h3>Recomendaciones</h3>
            <div className="field-content">
              {isEditing ? (
                <textarea
                  value={editedReport.recomendaciones || ''}
                  onChange={(e) => setEditedReport({ ...editedReport, recomendaciones: e.target.value })}
                  rows={4}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              ) : (
                reporte.recomendaciones ? reporte.recomendaciones.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                )) : 'No especificado'
              )}
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
          {reporte.estado === 'firmado' && (
            <>
              <button onClick={handleEdit} className="action-btn primary">
                ✏️ Editar Reporte
              </button>
              <button onClick={handleAnular} className="action-btn secondary" style={{ backgroundColor: '#dc3545' }}>
                ❌ Anular Reporte
              </button>
            </>
          )}
          {isEditing && (
            <>
              <button onClick={handleSave} className="action-btn primary">
                💾 Guardar Cambios
              </button>
              <button onClick={handleCancel} className="action-btn secondary">
                ❌ Cancelar
              </button>
            </>
          )}
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