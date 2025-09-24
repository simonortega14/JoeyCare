import React, { useState, useEffect } from "react";
import MarcaDeAgua from "../../assets/Marca De Agua.png";
import logoPerfil from "../../assets/logo perfil.png";
import logoPacientes from "../../assets/logo pacientes.png";
import AppHeader from "../../components/AppHeader.jsx";
import AppSidebar from "../../components/AppSidebar.jsx";
import "./profile.css";

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
            <img src={logoPerfil} alt="Perfil" className="profile-logo" />
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
      </div>
    </div>
  );
};

export default ProfilePage;
