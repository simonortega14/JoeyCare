import React from 'react';
import { NavLink } from 'react-router-dom';
import './sidebar.css';

const AppSidebar = ({ isOpen }) => {
  const menuItems = [
    { id: 0, name: "Dashboards", icon: "📊", path: "/dashboard"},
    { id: 1, name: "Mi perfil", icon: "👤", path: "/perfil" },
    { id: 2, name: "Visualizar Ecografías", icon: "🖼️", path: "/visualizar-ecografias" },
    { id: 3, name: "Buscar Pacientes", icon: "🔍", path: "/buscar-pacientes" }
  ];

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-content">
        <nav className="sidebar-nav">
          <ul>
            {menuItems.map(item => (
              <li key={item.id}>
                <NavLink 
                  to={item.path}
                  className={({ isActive }) => 
                    `nav-item ${isActive ? 'active' : ''}`
                  }
                  end={item.path === "/dashboard"}
                  onClick={() => {
                    // Cerrar sidebar en mobile al hacer clic
                    if (window.innerWidth < 768 && isOpen) {
                      document.querySelector('.menu-toggle')?.click();
                    }
                  }}
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