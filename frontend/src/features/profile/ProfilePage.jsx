import React, { useState } from 'react';
import logoPerfil from '../../assets/logo perfil.png';
import AppHeader from '../../components/AppHeader.jsx';
import AppSidebar from '../../components/AppSidebar.jsx';
import './profile.css';

const ProfilePage = ({ onOpenSettings, user }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

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
    <div className="profile-container">
      <AppHeader onOpenSettings={onOpenSettings} />
      <AppSidebar activeItem="Mi perfil" />
      
      <div className="profile-content">
        {/* Contenedor de información del perfil */}
        <div className="profile-info-card">
          <div className="profile-info-content">
            <div className="doctor-info">
              <div className="profile-image-container">
                <img src={preview || (user && user.foto_perfil ? `http://localhost:4000/uploads/${user.foto_perfil}` : logoPerfil)} alt="Perfil" className="profile-logo" />
                <input type="file" id="foto-input" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                <button onClick={() => document.getElementById('foto-input').click()} className="change-photo-btn">Cambiar Foto</button>
                {selectedFile && <button onClick={handleUpload} className="upload-btn">Subir Foto</button>}
              </div>
              <div className="profile-info-text">
                <h1>{user ? `${user.nombre} ${user.apellido}` : 'Nombre Apellido'}</h1>
                <p><strong>Email:</strong> {user ? user.email : 'email@ejemplo.com'}</p>
                <p><strong>Rol:</strong> {user ? user.rol : 'Médico'}</p>
                <p><strong>Especialidad:</strong> {user ? user.especialidad : 'Neonatología'}</p>
                <p><em>{user && user.especialidad_descripcion ? user.especialidad_descripcion : 'Descripción no disponible'}</em></p>
                <p><strong>Estado:</strong> {user ? (user.activo ? 'Activo' : 'Inactivo') : 'Activo'}</p>
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
            <h3>Pacientes Atendidos</h3>
            <div className="metric-number">{user ? user.pacientesAtendidos || 0 : 0}</div>
            <div className="metric-trend positive">Total acumulado</div>
          </div>
          <div className="metric-card">
            <h3>Ecografías Realizadas</h3>
            <div className="metric-number">{user ? user.ecografiasRealizadas || 0 : 0}</div>
            <div className="metric-trend positive">Este mes: {user ? user.ecografiasMes || 0 : 0}</div>
          </div>
          <div className="metric-card">
            <h3>Reportes Firmados</h3>
            <div className="metric-number">{user ? user.reportesFirmados || 0 : 0}</div>
            <div className="metric-trend positive">Este mes: {user ? user.reportesMes || 0 : 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
