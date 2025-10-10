import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./features/auth/LoginPage";
import VtkViewer from "./features/viewer/VtkViewer"; 
import DicomViewer from "./features/viewer/DicomViewer";
import AppHeader from "./components/AppHeader";
import Sidebar from "./components/AppSidebar";
import MiPerfil from "./features/profile/ProfilePage";
import BuscarPacientes from "./features/buscar_paciente/BuscarPacientesPage";
import CargarEcografia from "./features/cargar_ecografia/CargarEcografiaPage";
import DashboardPage from "./features/dashboard/dashBoardPage";
import RegisterPage from "./features/auth/RegisterPage";
import "./App.css";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // ✅ agregado

  async function handleLogin(form) {
    try {
      const response = await fetch("http://localhost:4000/api/doctores/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.username, password: form.password }),
      });

      if (!response.ok) {
        throw new Error("Credenciales inválidas");
      }

      const userData = await response.json();
      setUser(userData);
      setIsLoggedIn(true);
      localStorage.setItem("user", JSON.stringify(userData)); // guarda la sesión
    } catch (error) {
      alert(error.message || "Error en el inicio de sesión");
    }
  }

  if (!isLoggedIn) {
    return (
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage onSubmit={handleLogin} />} />
          <Route path="/register" element={<RegisterPage />} /> 
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <AppHeader user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="app-container">
        <Sidebar isOpen={sidebarOpen} />
        <div className="main-content">
          <Routes>
            <Route path="/perfil" element={<MiPerfil user={user} />} />
            <Route path="/buscar-pacientes" element={<BuscarPacientes />} />
            <Route path="/visualizar-ecografias" element={<VtkViewer />} /> 
            <Route path="/dicom-test" element={<DicomViewer />} />
            <Route path="/cargar-ecografias" element={<CargarEcografia />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="*" element={<Navigate to="/visualizar-ecografias" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
