import React from 'react';
import logoPerfil from '../../assets/logo perfil.png';
import AppHeader from '../../components/AppHeader.jsx';
import AppSidebar from '../../components/AppSidebar.jsx';
import './profile.css';

const ProfilePage = ({ onOpenSettings, user }) => {


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
                <img src={logoPerfil} alt="Perfil" className="profile-logo" />
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
          <div className="metric-card">
            <h3>Tasa de Éxito</h3>
            <div className="metric-number">{user ? `${user.tasaExito || 0}%` : '0%'}</div>
            <div className="metric-trend positive">Promedio general</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
