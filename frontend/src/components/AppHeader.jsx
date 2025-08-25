import React, { useState } from 'react';
import logoJoey from '../assets/Logo Joey care.png';
import './header.css';

const AppHeader = ({ onOpenSettings }) => {
  return (
    <header className="jc-header">
      <div className="jc-header__left">
        <img src={logoJoey} alt="Logo Joey" className="jc-logo" />
        <span className="jc-brand">Joey Care</span>
      </div>
      <button className="jc-btn jc-btn--config" onClick={onOpenSettings}>
        ⚙️ Configuración
      </button>
    </header>
  );
};

export default AppHeader;