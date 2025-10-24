import React from 'react';
import logoJoey from '../assets/Logo-Joey-care.png';
import './header.css';

const AppHeader = ({ onOpenSettings, onToggleSidebar, onLogout }) => {
  return (
    <header className="jc-header">
      <div className="jc-header__left">
        <button className="menu-toggle" onClick={onToggleSidebar}>
          ☰
        </button>
        <img src={logoJoey} alt="Logo Joey" className="jc-logo" />
        <span className="jc-brand">Joey Care</span>
      </div>
      <div className="jc-header__right">
        <button className="jc-btn jc-btn--config" onClick={onOpenSettings}>
          ⚙️ Configuración
        </button>
        <button className="jc-btn jc-btn--logout" onClick={onLogout}>
          🚪 Cerrar Sesión
        </button>
      </div>
    </header>
  );
};

export default AppHeader;