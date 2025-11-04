import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import LoginPage from "./features/auth/LoginPage";
import RegisterPage from "./features/auth/RegisterPage";
import AdminPage from "./features/auth/AdminPage";
import VtkViewer from "./features/viewer/VtkViewer";
import DicomViewer from "./features/viewer/DicomViewer";
import VisorEcografiaDoble from "./features/comparacion/VisorEcografiaDoble";
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
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        if (userData.rol_id) {
          setUser(userData);
          setIsLoggedIn(true);
        } else {
          localStorage.removeItem("user");
        }
      } catch (error) {
        localStorage.removeItem("user");
      }
    }
  }, []);

  async function handleLogin(form) {
    try {
      const response = await fetch("http://localhost:4000/api/medicos/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.username, password: form.password }),
      });

      if (!response.ok) throw new Error("Credenciales inválidas");

      const userData = await response.json();
      setUser(userData);
      setIsLoggedIn(true);
      localStorage.setItem("user", JSON.stringify(userData));
    } catch (error) {
      alert(error.message || "Error en el inicio de sesión");
    }
  }

  function handleLogout() {
    setUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem("user");
    navigate("/");
  }

  // Si no está logueado
  if (!isLoggedIn) {
    return (
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<LoginPage onSubmit={handleLogin} />} />
      </Routes>
    );
  }

  // Si el usuario es admin (rol_id === 1)
  if (user?.rol_id === 1) {
    return <AdminPage onLogout={handleLogout} />;
  }

  // Usuarios normales (médicos)
  return (
    <>
      <AppHeader user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} onLogout={handleLogout} />
      <div className="app-container">
        <Sidebar isOpen={sidebarOpen} />
        <div className="main-content">
          <Routes>
            <Route path="/perfil" element={<MiPerfil user={user} />} />
            <Route path="/buscar-pacientes" element={<BuscarPacientes />} />
            <Route path="/neonato/:id" element={<PacientePage />} />
            <Route path="/visualizar-ecografias" element={<VtkViewer />} />
            <Route path="/dicom-test" element={<DicomViewer />} />
            <Route path="/cargar-ecografias" element={<CargarEcografia />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/comparar-ecografias" element={<VisorEcografiaDoble />} />
            <Route path="/" element={<Navigate to="/visualizar-ecografias" replace />} />
          </Routes>
        </div>
      </div>
    </>
  );
}
