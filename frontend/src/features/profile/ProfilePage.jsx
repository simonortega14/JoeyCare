import React from 'react';
import { useNavigate } from 'react-router-dom';
import logoPerfil from '../../assets/logo perfil.png';
import logoPacientes from '../../assets/logo pacientes.png';
import AppHeader from '../../components/AppHeader.jsx';
import AppSidebar from '../../components/AppSidebar.jsx';
import './profile.css';

const ProfilePage = ({ onOpenSettings }) => {
  const navigate = useNavigate();

  // Datos de ejemplo para pacientes revisados
  const pacientesRevisados = [
    { nombre: "Bebé García", id: "BG-123", peso: "2.4 kg", edad: "32 semanas" },
    { nombre: "Bebé Rodríguez", id: "BR-456", peso: "2.1 kg", edad: "28 semanas" },
    { nombre: "Bebé López", id: "BL-789", peso: "2.6 kg", edad: "30 semanas" },
    { nombre: "Bebé Martínez", id: "BM-012", peso: "2.3 kg", edad: "31 semanas" },
    { nombre: "Bebé González", id: "BG-345", peso: "2.5 kg", edad: "33 semanas" }
  ];

  // Función para manejar el clic en "Ver detalles"
  const handleViewDetails = (pacienteId) => {
    navigate(`/paciente/${pacienteId}`);
  };

  return (
    <div className="profile-container">
      <AppHeader onOpenSettings={onOpenSettings} />
      <AppSidebar activeItem="Mi perfil" />
      
      <div className="profile-content">
        {/* Contenedor de información del perfil */}
        <div className="profile-info-card">
          <div className="profile-info-content">
            <div className="profile-image-container">
              <img src={logoPerfil} alt="Perfil" className="profile-logo" />
            </div>
            <div className="profile-info-text">
              <h1>Nombre Apellido</h1>
              <p><strong>Sede en la que labora</strong></p>
            </div>
          </div>
        </div>

        {/* Contenedor de pacientes asignados */}
        <div className="patients-assigned-card">
          <h3>Pacientes asignados</h3>
          <div className="patients-number">22</div>
          <div className="patients-trend">+12% desde el mes pasado</div>
        </div>

        {/* Contenedor de pacientes revisados recientemente */}
        <div className="recent-patients-card">
          <h2>Pacientes revisados recientemente</h2>
          <div className="patients-grid">
            {pacientesRevisados.map((paciente, index) => (
              <div key={index} className="patient-item-card">
                <div className="patient-image-container">
                  <img src={logoPacientes} alt="Paciente" className="patient-logo" />
                </div>
                <div className="patient-info">
                  <div className="patient-name-id">{paciente.nombre} {paciente.id}</div>
                  <div className="patient-details">{paciente.peso} {paciente.edad}</div>
                  <button 
                    className="view-paciente-btn"
                    onClick={() => handleViewDetails(paciente.id)}
                  >
                    Ver detalles
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;