import React, { useState } from 'react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import MarcaDeAgua from '../../assets/Marca De Agua.png';
import logoPerfil from '../../assets/logo perfil.png';
import logoPacientes from '../../assets/logo pacientes.png';
import AppHeader from '../../components/AppHeader.jsx';
import AppSidebar from '../../components/AppSidebar.jsx';
import './profile.css';

const ProfilePage = ({ onOpenSettings }) => {
  const [doctor, setDoctor] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setDoctor(JSON.parse(storedUser));
    }
  }, []);

  if (!doctor) {
    return <div>Cargando perfil...</div>;
  }

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
              <h1>
                {doctor.nombre} {doctor.apellido}
              </h1>
              <p>{doctor.sede}</p>
              <p>{doctor.email}</p>
            </div>
          </div>
        </div>

        {/* Aquí dejamos el resto igual, pacientes asignados, etc */}
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
                  <div className="patient-name-id">{paciente.nombre}</div>
                  <div className="patient-name-id">{paciente.id}</div>
                  <div className="patient-details">{paciente.peso}</div>
                  <div className="patient-details">{paciente.edad}</div>
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
