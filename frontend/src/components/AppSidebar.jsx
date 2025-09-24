import React from 'react';
import { NavLink } from 'react-router-dom';
import './sidebar.css';

const AppSidebar = () => {
  const menuItems = [
    { id: 0, name: "Dashboards", icon: "📊", path: "/dashboard"},
    { id: 1, name: "Mi perfil", icon: "👤", path: "/perfil" },
    { id: 2, name: "Visualizar Ecografías", icon: "🖼️", path: "/visualizar-ecografias" },
    { id: 3, name: "Cargar Ecografías", icon: "📁", path: "/cargar-ecografias"},
    { id: 4, name: "Buscar Pacientes", icon: "🔍", path: "/buscar-pacientes" },
    { id: 5, name: "Dicom Test", icon: "🧪", path: "/dicom-test" } // <-- Nuevo botón
  ];

  return (
    <aside className="app-sidebar">
      <div className="sidebar-content">
        <nav className="sidebar-nav">
          <ul>
            {menuItems.map(item => (
              <li key={item.id}>
                <NavLink 
                  to={item.path || "#"} 
                  className={({ isActive }) => 
                    `nav-item ${isActive ? 'active' : ''}`
                  }
                  end={item.path === "/perfil"} 
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-text">{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
