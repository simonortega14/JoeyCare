import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./features/auth/LoginPage";
import ImageViewer from "./features/viewer/ImageViewer";
import AppHeader from "./components/AppHeader";
import Sidebar from "./components/AppSidebar"; 
import MiPerfil from "./features/profile/ProfilePage"; 
import BuscarPacientes from "./features/paciente/PacientePage"; 
import CargarEcografia from "./features/cargar_ecografia/CargarEcografiaPage";
import DashboardPage from "./features/dashboard/dashBoardPage";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  async function handleLogin(form) {
    form.username = form.username.trim().toLowerCase();
    setIsLoggedIn(true);
  }

  if (!isLoggedIn) {
    return <LoginPage onSubmit={handleLogin} />;
  }

  return (
    <Router>
      <AppHeader />
      <div style={{ display: "flex" }}>
        <Sidebar />
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="/perfil" element={<MiPerfil />} />
            <Route path="/buscar-pacientes" element={<BuscarPacientes />} />
            <Route path="/visualizar-ecografias" element={<ImageViewer />} />
            <Route path="/cargar-ecografias" element={<CargarEcografia />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="*" element={<Navigate to="/visualizar-ecografias" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
