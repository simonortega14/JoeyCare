import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, Outlet } from "react-router-dom";

import LoginPage from "./features/auth/LoginPage";
import RegisterPage from "./features/auth/RegisterPage";

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

/** ---------------- Helpers de sesión ---------------- **/

// Normaliza la forma del usuario que devuelve el backend
function normalizeUser(raw) {
  if (!raw) return null;

  const u = { ...raw, ...(raw.medico || {}), ...(raw.user || {}) };

  const rol =
    u.rol ?? u.role ?? u.tipo ?? u.perfil ?? "MEDICO";
  const especialidad =
    u.especialidad ?? u.especialidad_medica ?? u.specialty ?? u.especialidadMedica ?? null;
  const sede =
    u.sede ?? u.sucursal ?? u.clinica ?? u.location ?? null;

  const nombre =
    u.nombre ??
    u.nombres ??
    ([u.primer_nombre, u.segundo_nombre, u.apellidos, u.apellido]
      .filter(Boolean)
      .join(" ")
      .trim()) ??
    u.email ??
    "Usuario";

  return {
    id: u.id ?? u.id_usuario ?? u.id_medico ?? u.uuid ?? null,
    nombre,
    email: u.email ?? u.correo ?? null,
    rol,
    especialidad,
    sede,
    _raw: raw,
  };
}


// Regla mínima para considerar la sesión válida
function isValidUser(u) {
  return !!(u && u.rol && u.especialidad && u.sede);
}

// Guardia de rutas privadas
function RequireAuth() {
  const stored = localStorage.getItem("user");
  if (!stored) return <Navigate to="/login" replace />;
  try {
    const parsed = JSON.parse(stored);
    const normalized = normalizeUser(parsed);
    // Defaults por si el backend aún no envía estos campos
    if (!normalized.especialidad) normalized.especialidad = "General";
    if (!normalized.sede) normalized.sede = "Principal";
    if (!isValidUser(normalized)) return <Navigate to="/login" replace />;
  } catch {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

// Layout de áreas privadas
function PrivateLayout({ user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <>
      <AppHeader
        user={user}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onLogout={onLogout}
      />
      <div className="app-container">
        <Sidebar isOpen={sidebarOpen} />
        <div className="main-content">
          <Outlet />
        </div>
      </div>
    </>
  );
}

/** ---------------- Componente principal ---------------- **/

export default function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Hidrata sesión al montar
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      const normalized = normalizeUser(parsed);
      if (!normalized.especialidad) normalized.especialidad = "General";
      if (!normalized.sede) normalized.sede = "Principal";
      if (isValidUser(normalized)) {
        setUser(normalized);
      } else {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    } catch {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }
  }, []);

  // LOGIN → usa el proxy de Nginx (ruta relativa)
  async function handleLogin(form) {
    const payload = { email: form.username, password: form.password };

    const resp = await fetch("/api/usuarios/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      let msg = "Credenciales inválidas";
      try {
        const err = await resp.json();
        if (err?.message) msg = err.message;
      } catch {
        const txt = await resp.text().catch(() => "");
        if (txt) msg = txt;
      }
      throw new Error(msg);
    }

    const data = await resp.json(); // { token, user } o similar
    const normalized = normalizeUser(data.user ?? data);

    // Defaults (puedes quitarlos cuando el backend ya envíe estos campos)
    if (!normalized.especialidad) normalized.especialidad = "General";
    if (!normalized.sede) normalized.sede = "Principal";

    if (!isValidUser(normalized)) {
      console.log("Login response raw:", data);
      console.log("Normalized user:", normalized);
      throw new Error("Perfil de usuario incompleto");
    }

    localStorage.setItem("token", data.token ?? data.accessToken ?? "");
    localStorage.setItem("user", JSON.stringify(normalized));
    setUser(normalized);
    navigate("/visualizar-ecografias", { replace: true });
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login", { replace: true });
  }

  return (
    <Routes>
      {/* Públicas */}
      <Route path="/login" element={<LoginPage onSubmit={handleLogin} />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Privadas */}
      <Route element={<RequireAuth />}>
        <Route element={<PrivateLayout user={user} onLogout={handleLogout} />}>
          <Route path="/" element={<Navigate to="/visualizar-ecografias" replace />} />
          <Route path="/perfil" element={<MiPerfil user={user} />} />
          <Route path="/buscar-pacientes" element={<BuscarPacientes />} />
          <Route path="/neonato/:id" element={<PacientePage />} />
          <Route path="/visualizar-ecografias" element={<VtkViewer />} />
          <Route path="/dicom-test" element={<DicomViewer />} />
          <Route path="/cargar-ecografias" element={<CargarEcografia />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/comparar-ecografias" element={<VisorEcografiaDoble />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
