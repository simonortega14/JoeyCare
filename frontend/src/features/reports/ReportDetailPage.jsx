import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import './reports.css';

const ReportDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reporte, setReporte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedReport, setEditedReport] = useState({});
  const [exporting, setExporting] = useState(false);

  const fetchReporteDetalle = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:4000/api/reportes/${id}`);
      if (!response.ok) {
        throw new Error('Error al cargar el reporte');
      }
      const data = await response.json();
      console.log('Datos del reporte desde API:', data);
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

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/reportes');
    }
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

  const handleExport = async () => {
    if (!reporte) {
      alert('No hay reporte disponible para exportar');
      return;
    }
    // Validaciones
    if (!reporte.paciente_nombre || !reporte.titulo) {
      alert('Faltan datos requeridos en el reporte (paciente o título)');
      return;
    }
    // Alerta para DICOM
    if (reporte.mime_type === 'application/dicom' || (reporte.filepath && reporte.filepath.toLowerCase().includes('.dcm'))) {
      alert('La imagen es formato DICOM. Para ver detalles completos, use el visualizador de imágenes. Se incluirá un mensaje en el PDF.');
    }
    setExporting(true);
    try {
      console.log('Generando PDF con reporte:', reporte);
      console.log('Campos del paciente:', {
        nombre: reporte.paciente_nombre,
        apellido: reporte.paciente_apellido,
        documento: reporte.paciente_documento,
        sexo: reporte.sexo,
        fecha_nacimiento: reporte.fecha_nacimiento
      });
      const doc = new jsPDF();
      doc.setProperties({
        title: `Reporte - ${reporte.titulo || 'Sin título'}`,
        subject: 'Reporte Médico',
        author: reporte.medico_nombre || 'Médico',
        creator: 'Sistema JoeyCare'
      });

      // Página 1: Información del Paciente
      doc.setFontSize(16);
      doc.text('Información del Paciente', 10, 20);
      doc.setFontSize(12);
      doc.text(`Nombre: ${reporte.paciente_nombre} ${reporte.paciente_apellido}`, 10, 40);
      doc.text(`Documento: ${reporte.paciente_documento}`, 10, 50);
      doc.text(`Sexo: ${reporte.sexo || 'No especificado'}`, 10, 60);
      doc.text(`Fecha de Nacimiento: ${reporte.fecha_nacimiento ? new Date(reporte.fecha_nacimiento).toLocaleDateString('es-ES') : 'No especificado'}`, 10, 70);
      doc.text(`Edad Gestacional: ${reporte.edad_gestacional_sem ? `${reporte.edad_gestacional_sem} semanas` : 'No especificado'}`, 10, 80);
      doc.text(`Edad Corregida: ${reporte.edad_corregida_sem ? `${reporte.edad_corregida_sem} semanas` : 'No especificado'}`, 10, 90);
      doc.text(`Peso al Nacimiento: ${reporte.peso_nacimiento_g ? `${reporte.peso_nacimiento_g}g` : 'No especificado'}`, 10, 100);
      doc.text(`Peso Actual: ${reporte.peso_actual_g ? `${reporte.peso_actual_g}g` : 'No especificado'}`, 10, 110);
      doc.text(`Perímetro Cefálico: ${reporte.perimetro_cefalico ? `${reporte.perimetro_cefalico}cm` : 'No especificado'}`, 10, 120);

      // Información del Acudiente
      let yPos = 140;
      if (reporte.nombre_acudiente) {
        doc.setFontSize(14);
        doc.text('Información del Acudiente', 10, yPos);
        doc.setFontSize(12);
        yPos += 20;
        doc.text(`Nombre: ${reporte.nombre_acudiente} ${reporte.apellido_acudiente || ''}`, 10, yPos);
        yPos += 10;
        doc.text(`Parentesco: ${reporte.parentesco ? (reporte.parentesco === 'P' ? 'Padre' : reporte.parentesco === 'M' ? 'Madre' : reporte.parentesco === 'H' ? 'Hermano/a' : reporte.parentesco === 'O' ? 'Otro' : reporte.parentesco) : 'No especificado'}`, 10, yPos);
        yPos += 10;
        doc.text(`Teléfono: ${reporte.telefono || 'No especificado'}`, 10, yPos);
        yPos += 10;
        doc.text(`Correo: ${reporte.correo || 'No especificado'}`, 10, yPos);
      }

      // Página 2: Información del Reporte
      doc.addPage();
      doc.setFontSize(16);
      doc.text('Información del Reporte', 10, 20);
      doc.setFontSize(12);
      doc.text(`Título: ${reporte.titulo || 'No especificado'}`, 10, 40);
      doc.text(`Contenido: ${reporte.contenido || 'No especificado'}`, 10, 50, { maxWidth: 180 });
      doc.text(`Hallazgos: ${reporte.hallazgos || 'No especificado'}`, 10, 70, { maxWidth: 180 });
      doc.text(`Conclusión: ${reporte.conclusion || 'No especificado'}`, 10, 90, { maxWidth: 180 });
      doc.text(`Recomendaciones: ${reporte.recomendaciones || 'No especificado'}`, 10, 110, { maxWidth: 180 });
      doc.text(`Firma del Médico: ${reporte.firma_medico || 'No especificado'}`, 10, 130, { maxWidth: 180 });

      // Página 3: Imagen (solo para PNG/JPG)
      if (reporte.mime_type === 'image/png' || reporte.mime_type === 'image/jpeg') {
        doc.addPage();
        doc.setFontSize(16);
        doc.text('Imagen del Reporte', 10, 20);
        try {
          const imageUrl = `http://localhost:4000/api/uploads/${reporte.filepath}`;
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
          const format = reporte.mime_type === 'image/png' ? 'PNG' : 'JPEG';
          doc.addImage(base64, format, 10, 30, 180, 120);
        } catch (imgError) {
          console.error('Error cargando imagen:', imgError);
          doc.text('Error al cargar la imagen', 10, 40);
        }
      }
      doc.save('reporte.pdf');
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF');
    } finally {
      setExporting(false);
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
        <button onClick={handleBack} className="back-btn">
          ← Volver
        </button>
        <div className="report-title-section">
          <h1>{reporte.titulo || 'Sin título'}</h1>
          <span className={`estado-badge ${reporte.estado}`}>
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
                  className="edit-input"
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
                  className="edit-textarea"
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
                  className="edit-textarea"
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
                  className="edit-textarea"
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
                  className="edit-textarea"
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
              <button onClick={handleAnular} className="action-btn secondary anular">
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
            onClick={() => navigate(`/visualizar-ecografias?patient=${reporte.paciente_id}&file=${encodeURIComponent(reporte.filepath)}`)}
            className="action-btn primary"
          >
            🖼️ Ver Imágenes del Estudio
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="action-btn primary"
          >
            {exporting ? 'Generando PDF...' : '📄 Exportar PDF'}
          </button>
          <button
            onClick={handleBack}
            className="action-btn secondary"
          >
            📄 Volver
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportDetailPage;