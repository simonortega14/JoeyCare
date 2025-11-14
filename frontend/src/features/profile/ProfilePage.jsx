import React, { useState, useEffect, useCallback } from 'react';
import logoPerfil from '../../assets/logo perfil.png';
import AppHeader from '../../components/AppHeader.jsx';
import AppSidebar from '../../components/AppSidebar.jsx';
import './profile.css';

const ProfilePage = ({ onOpenSettings, user }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [kpis, setKpis] = useState({
    pacientesCreados: 0,
    ecografiasSubidas: 0,
    reportesFirmados: 0
  });
  const [reportesHistory, setReportesHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

  const fetchKpis = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch(`http://localhost:4000/api/medicos/${user.id}/kpis`);
      if (response.ok) {
        const data = await response.json();
        setKpis(data);
      }
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    }
  }, [user]);

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
    }
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchKpis(), fetchReportesHistory()]);
      setLoading(false);
    };
    loadData();
  }, [user, fetchKpis, fetchReportesHistory]);

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('foto', selectedFile);

    try {
      const response = await fetch(`http://localhost:4000/api/medicos/${user.id}/foto`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) throw new Error('Error al subir foto');

      const data = await response.json();
      alert('Foto actualizada');
      // Update user data
      user.foto_perfil = data.foto_perfil;
      localStorage.setItem('user', JSON.stringify(user));
      setSelectedFile(null);
      setPreview(null);
    } catch (error) {
      alert(error.message);
    }
  };


  return (
    <div className="page-container">
      {/* Header del Perfil */}
      <header className="profile-header">
        <div className="profile-title">
          <h1>👤 Mi perfil</h1>
        </div>
      </header>

      <div className="profile-content">
        {/* Contenedor de información del perfil */}
        <div className="profile-info-card">
          <div className="profile-info-content">
            <div className="doctor-info">
              <div className="profile-image-container">
                <img src={preview || (user && user.foto_perfil ? `http://localhost:4000/uploads/${user.foto_perfil}` : logoPerfil)} alt="Perfil" className="profile-logo" />
                <input type="file" id="foto-input" accept="image/*" onChange={handleFileChange} className="file-input-hidden" />
                <button onClick={() => document.getElementById('foto-input').click()} className="change-photo-btn">Cambiar Foto</button>
                {selectedFile && <button onClick={handleUpload} className="upload-btn">Subir Foto</button>}
              </div>
              <div className="profile-info-text">
                <h1>{user ? `${user.nombre} ${user.apellido}` : 'Nombre Apellido'}</h1>
                <p><strong>Email:</strong> {user ? user.email : 'email@ejemplo.com'}</p>
                <p><strong>Rol:</strong> {user ? user.rol : 'Médico'}</p>
                <p><strong>Especialidad:</strong> {user ? user.especialidad : 'Neonatología'}</p>
                <p><em>{user && user.especialidad_descripcion ? user.especialidad_descripcion : 'Descripción no disponible'}</em></p>
                <p><strong>Estado:</strong> {user ? (user.activo ? '🟢 Activo' : '🔴 Inactivo') : '🟢 Activo'}</p>
              </div>
            </div>
            <div className="sede-info">
              <h2>Información de la Sede</h2>
              <p><strong>Sede:</strong> {user ? user.sede : 'Sede en la que labora'}</p>
              <p><strong>Institución:</strong> {user && user.sede_institucion ? user.sede_institucion : 'No disponible'}</p>
              <p><strong>Ciudad:</strong> {user && user.sede_ciudad ? user.sede_ciudad : 'No disponible'}</p>
              <p><strong>Dirección:</strong> {user && user.sede_direccion ? user.sede_direccion : 'No disponible'}</p>
            </div>
          </div>
        </div>

        {/* KPIs del Médico */}
        <div className="metrics-container">
           <div className="metric-card">
             <h3>Pacientes Creados</h3>
             <div className="metric-number">{loading ? '...' : kpis.pacientesCreados}</div>
             <div className="metric-trend positive">Total acumulado</div>
           </div>
           <div className="metric-card">
             <h3>Ecografías Subidas</h3>
             <div className="metric-number">{loading ? '...' : kpis.ecografiasSubidas}</div>
             <div className="metric-trend positive">Total acumulado</div>
           </div>
           <div className="metric-card">
             <h3>Reportes Gestionados</h3>
             <div className="metric-number">{loading ? '...' : kpis.reportesFirmados}</div>
             <div className="metric-trend positive">Total acumulado</div>
           </div>
         </div>

         {/* Historial de Reportes */}
         <div className="reports-history-card">
           <div className="reports-header-row">
             <h2>Historial de Reportes Recientes</h2>
             <button
               className="view-report-btn info"
               onClick={() => window.location.href = '/historial-reportes'}
             >
               Ver Historial Completo
             </button>
           </div>
           {loading ? (
             <p>Cargando...</p>
           ) : reportesHistory.length > 0 ? (
             <div className="reports-list">
               {reportesHistory.map((reporte) => (
                 <div key={reporte.id} className="report-item">
                   <div className="report-info">
                     <h4>{reporte.titulo || 'Sin título'}</h4>
                     <p><strong>Paciente:</strong> {reporte.paciente_nombre} {reporte.paciente_apellido}</p>
                     <p><strong>Última modificación:</strong> {new Date(reporte.updated_at || reporte.fecha_reporte).toLocaleDateString()}</p>
                   </div>
                   <div className="report-actions">
                     <button
                       className="view-report-btn"
                       onClick={() => window.location.href = `/reportes/${reporte.id}`}
                     >
                       Ver Reporte
                     </button>
                   </div>
                 </div>
               ))}
             </div>
           ) : (
             <p>No hay reportes recientes</p>
           )}
         </div>
      </div>
    </div>
  );
};

export default ProfilePage;
