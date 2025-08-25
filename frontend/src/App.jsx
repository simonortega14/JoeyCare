// src/App.jsx
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./features/auth/LoginPage";
import ImageViewer from "./features/viewer/ImageViewer";
import Sidebar from "./components/AppSidebar"; 
import MiPerfil from "./features/profile/ProfilePage"; 
import BuscarPacientes from "./features/paciente/PacientePage"; 

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
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-4">
          <Routes>
            <Route path="/perfil" element={<MiPerfil />} />
            <Route path="/buscar-pacientes" element={<BuscarPacientes />} />
            <Route path="/visualizar-ecografias" element={<ImageViewer />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
