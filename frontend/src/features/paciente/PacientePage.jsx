import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppHeader from '../../components/AppHeader.jsx';
import AppSidebar from '../../components/AppSidebar.jsx';
import './paciente.css';

const PacientePage = ({ onOpenSettings }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState(null);
  const [ecografias, setEcografias] = useState([]);
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para edición del paciente
  const [isEditingPaciente, setIsEditingPaciente] = useState(false);
  const [editedPesoActual, setEditedPesoActual] = useState('');
  const [editedPerimetroCefalico, setEditedPerimetroCefalico] = useState('');

  // Estados para edición del acudiente
  const [isEditingAcudiente, setIsEditingAcudiente] = useState(false);
  const [editedTelefono, setEditedTelefono] = useState('');
  const [editedCorreo, setEditedCorreo] = useState('');

  useEffect(() => {
    const fetchPaciente = async () => {
      try {
        const response = await fetch(`http://localhost:4000/api/neonatos/${id}`);
        if (!response.ok) {
          throw new Error('Error al obtener los datos del paciente');
        }
        const data = await response.json();
        setPaciente(data);
        return data;
      } catch (err) {
        setError(err.message);
        console.error('Error fetching paciente:', err);
        throw err;
      }
    };

    const fetchEcografias = async () => {
      try {
        const response = await fetch(`http://localhost:4000/api/neonatos/${id}/ecografias`);
        if (!response.ok) {
          throw new Error('Error al obtener las ecografías del paciente');
        }
        const data = await response.json();
        setEcografias(data);
      } catch (err) {
        console.error('Error fetching ecografias:', err);
      }
    };

    const fetchReportes = async (pacienteData) => {
      try {
        const response = await fetch(`http://localhost:4000/api/reportes/all`);
        if (!response.ok) {
          throw new Error('Error al obtener los reportes');
        }
        const data = await response.json();
        // Filter reports for this patient
        const patientReports = data.filter(reporte => reporte.paciente_documento === pacienteData.documento);
        setReportes(patientReports);
      } catch (err) {
        console.error('Error fetching reportes:', err);
      }
    };

    const loadData = async () => {
      const pacienteData = await fetchPaciente();
      await Promise.all([fetchEcografias(), fetchReportes(pacienteData)]);
    };

    loadData().finally(() => {
      setLoading(false);
    });
  }, [id]);


  // Función para traducir el parentesco
  const traducirParentesco = (parentesco) => {
    switch (parentesco) {
      case 'P': return 'Padre';
      case 'M': return 'Madre';
      case 'H': return 'Hermano/a';
      case 'O': return 'Otro';
      default: return 'N/A';
    }
  };

  // Función para manejar el clic en "Ver detalles" de ecografía
  const handleViewEcografia = (ecografia) => {
    window.location.href = `/visualizar-ecografias?patient=${id}&file=${ecografia.filepath}`;
  };

  // Función para manejar el clic en "Cargar Ecografía" - ACTUALIZADA
  const handleCargarEcografia = () => {
    window.location.href = `/cargar-ecografias?patient=${id}`;
  };

  // Funciones para edición del paciente
  const handleEditPaciente = () => {
    setEditedPesoActual(paciente.peso_actual_g || '');
    setEditedPerimetroCefalico(paciente.perimetro_cefalico || '');
    setIsEditingPaciente(true);
  };

  const handleSavePaciente = async () => {
    try {
      const pesoActualNum = parseFloat(editedPesoActual);
      const perimetroNum = parseFloat(editedPerimetroCefalico);

      if (isNaN(pesoActualNum) || pesoActualNum < 0 || pesoActualNum > 10000) {
        alert('Peso actual debe ser un número válido entre 0 y 10000g');
        return;
      }
      if (isNaN(perimetroNum) || perimetroNum < 0 || perimetroNum > 100) {
        alert('Perímetro cefálico debe ser un número válido entre 0 y 100cm');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/neonatos/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          peso_actual_g: pesoActualNum,
          perimetro_cefalico: perimetroNum,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar paciente');
      }

      // Actualizar el estado local
      setPaciente(prev => ({
        ...prev,
        peso_actual_g: pesoActualNum,
        perimetro_cefalico: perimetroNum,
      }));

      setIsEditingPaciente(false);
      alert('Paciente actualizado correctamente');
    } catch (error) {
      console.error('Error updating paciente:', error);
      alert('Error al actualizar paciente');
    }
  };

  const handleCancelPaciente = () => {
    setIsEditingPaciente(false);
    setEditedPesoActual('');
    setEditedPerimetroCefalico('');
  };

  // Funciones para edición del acudiente
  const handleEditAcudiente = () => {
    setEditedTelefono(paciente.telefono || '');
    setEditedCorreo(paciente.correo || '');
    setIsEditingAcudiente(true);
  };

  const handleSaveAcudiente = async () => {
    try {
      if (!/^\+?[0-9\s\-\(\)]+$/.test(editedTelefono)) {
        alert('Teléfono debe tener un formato válido');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editedCorreo)) {
        alert('Correo electrónico debe tener un formato válido');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/acudientes/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telefono: editedTelefono,
          correo: editedCorreo,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar acudiente');
      }

      // Actualizar el estado local
      setPaciente(prev => ({
        ...prev,
        telefono: editedTelefono,
        correo: editedCorreo,
      }));

      setIsEditingAcudiente(false);
      alert('Acudiente actualizado correctamente');
    } catch (error) {
      console.error('Error updating acudiente:', error);
      alert('Error al actualizar acudiente');
    }
  };

  const handleCancelAcudiente = () => {
    setIsEditingAcudiente(false);
    setEditedTelefono('');
    setEditedCorreo('');
  };

  if (loading) {
    return (
      <div className="paciente-container">
        <AppHeader onOpenSettings={onOpenSettings} />
        <AppSidebar activeItem="Buscar Pacientes" />
        <div className="paciente-content">
          <p>Cargando información del paciente...</p>
        </div>
      </div>
    );
  }

  if (error || !paciente) {
    return (
      <div className="paciente-container">
        <AppHeader onOpenSettings={onOpenSettings} />
        <AppSidebar activeItem="Buscar Pacientes" />
        <div className="paciente-content">
          <p>Error: {error || 'Paciente no encontrado'}</p>
          <button onClick={() => navigate('/buscar-pacientes')} className="back-btn">
            ← Volver a buscar pacientes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="paciente-container">
      <AppHeader onOpenSettings={onOpenSettings} />
      <AppSidebar activeItem="Buscar Pacientes" />

      <div className="paciente-content">
        {/* Botón de volver */}
        <div className="back-button-container">
          <button onClick={() => navigate('/buscar-pacientes')} className="back-btn">
            ← Volver a buscar pacientes
          </button>
        </div>

        {/* Información del paciente */}
        <div className="paciente-info-card">
          <div className="paciente-header">
            <div className="paciente-image-container">
              <div className="paciente-logo">N{paciente.id}</div>
            </div>
            <div className="paciente-details">
              <h1>{paciente.nombre} {paciente.apellido}</h1>
              <div className="paciente-stats">
                <div className="stat-item">
                  <span className="stat-label">Documento</span>
                  <span className="stat-value">{paciente.documento}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Sexo</span>
                  <span className="stat-value">
                    {paciente.sexo === 'F' ? 'Femenino' :
                     paciente.sexo === 'M' ? 'Masculino' :
                     paciente.sexo === 'X' ? 'Otro' : 'N/A'}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Fecha de nacimiento</span>
                  <span className="stat-value">
                    {paciente.fecha_nacimiento ?
                      new Date(paciente.fecha_nacimiento).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      }) : 'N/A'}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Edad gestacional</span>
                  <span className="stat-value">{paciente.edad_gestacional_sem ? `${paciente.edad_gestacional_sem} semanas` : 'N/A'}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Edad corregida</span>
                  <span className="stat-value">{paciente.edad_corregida_sem ? `${paciente.edad_corregida_sem} semanas` : 'N/A'}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Peso nacimiento</span>
                  <span className="stat-value">{paciente.peso_nacimiento_g ? `${paciente.peso_nacimiento_g} g` : 'N/A'}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Peso actual</span>
                  {isEditingPaciente ? (
                    <input
                      type="number"
                      value={editedPesoActual}
                      onChange={(e) => setEditedPesoActual(e.target.value)}
                      placeholder="g"
                      min="0"
                      max="10000"
                      step="1"
                    />
                  ) : (
                    <span className="stat-value">{paciente.peso_actual_g ? `${paciente.peso_actual_g} g` : 'N/A'}</span>
                  )}
                </div>
                <div className="stat-item">
                  <span className="stat-label">Perímetro cefálico</span>
                  {isEditingPaciente ? (
                    <input
                      type="number"
                      value={editedPerimetroCefalico}
                      onChange={(e) => setEditedPerimetroCefalico(e.target.value)}
                      placeholder="cm"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  ) : (
                    <span className="stat-value">{paciente.perimetro_cefalico ? `${paciente.perimetro_cefalico} cm` : 'N/A'}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="paciente-actions">
              <button className="cargar-ecografia-btn" onClick={handleCargarEcografia}>
                📁 Cargar Ecografía
              </button>
              {!isEditingPaciente ? (
                <button className="actualizar-btn" onClick={handleEditPaciente}>
                  ✏️ Actualizar
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="guardar-btn" onClick={handleSavePaciente}>
                    💾 Guardar
                  </button>
                  <button className="cancelar-btn" onClick={handleCancelPaciente}>
                    ❌ Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Información del acudiente */}
        {paciente.nombre_acudiente && (
          <div className="acudiente-info-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Información del Acudiente</h2>
              {!isEditingAcudiente ? (
                <button className="actualizar-btn" onClick={handleEditAcudiente}>
                  ✏️ Actualizar
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="guardar-btn" onClick={handleSaveAcudiente}>
                    💾 Guardar
                  </button>
                  <button className="cancelar-btn" onClick={handleCancelAcudiente}>
                    ❌ Cancelar
                  </button>
                </div>
              )}
            </div>
            <div className="acudiente-details">
              <div className="detail-item">
                <span className="detail-label">Nombre completo</span>
                <span className="detail-value">{paciente.nombre_acudiente} {paciente.apellido_acudiente}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Parentesco</span>
                <span className="detail-value">{traducirParentesco(paciente.parentesco)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Teléfono</span>
                {isEditingAcudiente ? (
                  <input
                    type="tel"
                    value={editedTelefono}
                    onChange={(e) => setEditedTelefono(e.target.value)}
                    placeholder="Teléfono"
                  />
                ) : (
                  <span className="detail-value">{paciente.telefono}</span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Correo electrónico</span>
                {isEditingAcudiente ? (
                  <input
                    type="email"
                    value={editedCorreo}
                    onChange={(e) => setEditedCorreo(e.target.value)}
                    placeholder="Correo electrónico"
                  />
                ) : (
                  <span className="detail-value">{paciente.correo}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sección de Ecografías */}
        <div className="ecografias-section">
          <h2>Ecografías</h2>
          <div className="ecografias-list">
            {ecografias.length > 0 ? (
              ecografias.map(eco => (
                <div key={eco.id} className="ecografia-card">
                  <div className="ecografia-info">
                    <h3>Ecografía ID: {eco.id}</h3>
                    <p>Fecha: {new Date(eco.fecha_hora).toLocaleDateString('es-ES')}</p>
                    <p>Hora: {new Date(eco.fecha_hora).toLocaleTimeString('es-ES')}</p>
                    <p>Subido por: {eco.uploader_nombre} {eco.uploader_apellido}</p>
                    <p>Archivo: {eco.filepath}</p>
                    <p>Tamaño: {(eco.size_bytes / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <div className="ecografia-status completada">
                    Completada
                  </div>
                  <button
                    className="ecografia-action-btn"
                    onClick={() => handleViewEcografia(eco)}
                  >
                    Ver detalles
                  </button>
                </div>
              ))
            ) : (
              <p>No hay ecografías registradas para este paciente.</p>
            )}
          </div>

          {/* Subsección de Reportes */}
          <div className="reportes-subsection">
            <h3>Reportes</h3>
            <div className="reportes-list">
              {reportes.length > 0 ? (
                reportes.map(reporte => (
                  <div key={reporte.id} className="reporte-card">
                    <div className="reporte-info">
                      <h4>{reporte.titulo || 'Sin título'}</h4>
                      <p>Estado: <span className={`status-badge ${reporte.estado}`}>{reporte.estado}</span></p>
                      <p>Fecha: {new Date(reporte.fecha_reporte).toLocaleDateString('es-ES')}</p>
                      <p>Médico: {reporte.medico_nombre} {reporte.medico_apellido}</p>
                    </div>
                    <button
                      className="reporte-action-btn"
                      onClick={() => navigate(`/reportes/${reporte.ecografia_id}`)}
                    >
                      Ver Reporte
                    </button>
                  </div>
                ))
              ) : (
                <p>No hay reportes registrados para este paciente.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PacientePage;