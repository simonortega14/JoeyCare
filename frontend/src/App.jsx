import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import LoginPage from "./features/auth/LoginPage";
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
import CrearPacientePage from "./features/crear_paciente/CrearPacientePage";
import RegisterPage from "./features/auth/RegisterPage";
import "./App.css";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // ✅ agregado
  const navigate = useNavigate();

  useEffect(() => {
    // Log para verificar localStorage al inicializar la app
    const storedUser = localStorage.getItem("user");
    console.log("App initialization - localStorage user:", storedUser);
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        console.log("Parsed user data:", userData);

        // Validar que el usuario tenga la estructura correcta de 'medicos'
        // (rol, especialidad, sede son campos nuevos de la tabla medicos)
        if (userData.rol && userData.especialidad && userData.sede) {
          setUser(userData);
          setIsLoggedIn(true);
        } else {
          console.log("User data is outdated (old schema), clearing localStorage");
          localStorage.removeItem("user"); // Limpiar datos antiguos
        }
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        localStorage.removeItem("user"); // Limpiar datos corruptos
      }
    } else {
      console.log("No user data found in localStorage");
    }
  }, []);

  async function handleLogin(form) {
    try {
      const response = await fetch("http://localhost:4000/api/medicos/login", {
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

  function handleLogout() {
    setUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem("user");
    navigate("/");
  }

  if (!isLoggedIn) {
    return (
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<LoginPage onSubmit={handleLogin} />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/comparar-ecografias" element={
        <VisorEcografiaDoble />
      } />
      <Route path="*" element={
        <>
          <AppHeader user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} onLogout={handleLogout} />
          <div className="app-container">
            <Sidebar isOpen={sidebarOpen} />
            <div className="main-content">
              <Routes>
                <Route path="/perfil" element={<MiPerfil user={user} />} />
                <Route path="/buscar-pacientes" element={<BuscarPacientes />} />
                <Route path="/crear-paciente" element={<CrearPacientePage />} />
                <Route path="/neonato/:id" element={<PacientePage />} />
                <Route path="/visualizar-ecografias" element={<VtkViewer />} />
                <Route path="/dicom-test" element={<DicomViewer />} />
                <Route path="/cargar-ecografias" element={<CargarEcografia />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/" element={<Navigate to="/visualizar-ecografias" replace />} />
              </Routes>
            </div>
          </div>
        </>
      } />
    </Routes>
  );
}
