import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import LoginPage from "./features/auth/LoginPage";
import VtkViewer from "./features/viewer/VtkViewer";
import AppHeader from "./components/AppHeader";
import Sidebar from "./components/AppSidebar";
import MiPerfil from "./features/profile/ProfilePage";
import BuscarPacientes from "./features/paciente/PacientePage";
import CargarEcografia from "./features/cargar_ecografia/CargarEcografiaPage";
import DashboardPage from "./features/dashboard/dashBoardPage";
import RegisterPage from "./features/auth/RegisterPage";
import CompareImages from "./features/compare/CompareImages";

import "./App.css";

export default function App() {
  // Estado de sesión
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  // Al montar, intentar recuperar sesión desde localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("user");
      if (saved) {
        setUser(JSON.parse(saved));
        setIsLoggedIn(true);
      }
    } catch (e) {
      console.warn("No se pudo leer la sesión del localStorage", e);
    }
  }, []);

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
      localStorage.setItem("user", JSON.stringify(userData));
    } catch (error) {
      alert(error.message || "Error en el inicio de sesión");
    }
  }

  // Componente que protege rutas privadas
  function RequireAuth({ children }) {
    if (!isLoggedIn) {
      return <Navigate to="/" replace />;
    }
    return children;
  }

  // Layout para la parte autenticada (header + sidebar + outlet)
  function AuthLayout() {
    return (
      <>
        <AppHeader user={user} />
        <div className="app-container">
          <Sidebar />
          <div className="main-content">
            <Outlet />
          </div>
        </div>
      </>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<LoginPage onSubmit={handleLogin} />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Rutas privadas: montadas bajo AuthLayout y protegidas */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <AuthLayout />
            </RequireAuth>
          }
        >
          <Route path="perfil" element={<MiPerfil user={user} />} />
          <Route path="buscar-pacientes" element={<BuscarPacientes />} />
          <Route path="visualizar-ecografias" element={<VtkViewer />} />
          <Route
            path="visualizar-ecografias/comparar"
            element={<CompareImages />}
          />
          <Route path="cargar-ecografias" element={<CargarEcografia />} />
          <Route path="dashboard" element={<DashboardPage />} />
        </Route>

        {/* Fallback */}
        <Route
          path="*"
          element={
            isLoggedIn ? (
              <Navigate to="/visualizar-ecografias" replace />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}
