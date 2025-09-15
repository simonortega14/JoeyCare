import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./features/auth/LoginPage";
import VtkViewer from "./features/viewer/VtkViewer"; 
import AppHeader from "./components/AppHeader";
import Sidebar from "./components/AppSidebar";
import MiPerfil from "./features/profile/ProfilePage";
import BuscarPacientes from "./features/buscar_paciente/BuscarPacientesPage";
import CargarEcografia from "./features/cargar_ecografia/CargarEcografiaPage";
import DashboardPage from "./features/dashboard/dashBoardPage";
import PacientePage from "./features/paciente/PacientePage";
import "./App.css";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogin(form) {
    form.username = form.username.trim().toLowerCase();
    setIsLoggedIn(true);
  }

  if (!isLoggedIn) {
    return <LoginPage onSubmit={handleLogin} />;
  }

  return (
    <Router>
      <div className="app-container">
        <AppHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <Sidebar isOpen={sidebarOpen} />
        <div className="main-content">
          <Routes>
            <Route path="/perfil" element={<MiPerfil />} />
            <Route path="/buscar-pacientes" element={<BuscarPacientes />} />
            <Route path="/paciente/:id" element={<PacientePage />} />
            <Route path="/visualizar-ecografias" element={<VtkViewer />} /> 
            <Route path="/cargar-ecografias" element={<CargarEcografia />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="*" element={<Navigate to="/visualizar-ecografias" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}