import React from 'react';
import './sidebar.css';

const AppSidebar = ({ activeItem }) => {
  const menuItems = [
    { id: 0, name: "Dashboards", icon: "📊" },
    { id: 1, name: "Mi perfil", icon: "👤" },
    { id: 2, name: "Visualizar Ecografías", icon: "🖼️" },
    { id: 3, name: "Cargar Ecografías", icon: "📁" },
    { id: 4, name: "Buscar Pacientes", icon: "🔍" }
  ];

  return (
    <aside className="app-sidebar">
      <div className="sidebar-content">
        <nav className="sidebar-nav">
          <ul>
            {menuItems.map(item => (
              <li key={item.id}>
                <button 
                  className={`nav-item ${activeItem === item.name ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-text">{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;