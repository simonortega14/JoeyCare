// src/App.jsx
import React, { useState } from 'react';
import LoginPage from './features/auth/LoginPage';
import ImageViewer from './features/viewer/ImageViewer'; // asumiendo que creaste este componente con el código del visor
import ProfilePage from './features/profile/ProfilePage';
import './features/auth/auth.css';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Esta función se pasa a LoginPage y controla el cambio de pantalla
  async function handleLogin(form) {
    form.username = form.username.trim().toLowerCase();
  setIsLoggedIn(true);
}


  return isLoggedIn ? <ProfilePage /> : <LoginPage onSubmit={handleLogin} />;
}
