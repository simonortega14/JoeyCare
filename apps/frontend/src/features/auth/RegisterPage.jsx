import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logoJoey from "../../assets/Logo Joey care.png";
import marcaAgua from "../../assets/Marca De Agua.png";
import "./auth.css";

export default function RegisterPage() {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    sede: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await axios.post("http://localhost:4000/api/doctores", form);
      navigate("/"); // 👈 vuelve al login al terminar
    } catch (err) {
      setError("No se pudo registrar el usuario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div
        className="login-bg"
        style={{
          backgroundImage: `url(${marcaAgua})`,
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: 0.08,
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      />
      <div className="login-card">
        <div className="login-avatar">
          <img src={logoJoey} alt="Logo Joey Care" />
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <input
              name="nombre"
              type="text"
              placeholder="Nombre"
              value={form.nombre}
              onChange={handleChange}
              required
            />
          </div>
          <div className="field">
            <input
              name="apellido"
              type="text"
              placeholder="Apellido"
              value={form.apellido}
              onChange={handleChange}
              required
            />
          </div>
          <div className="field">
            <input
              name="sede"
              type="text"
              placeholder="Sede"
              value={form.sede}
              onChange={handleChange}
            />
          </div>
          <div className="field">
            <input
              name="email"
              type="email"
              placeholder="Correo"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="field">
            <input
              name="password"
              type="password"
              placeholder="Contraseña"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          <button className="jc-btn" type="submit" disabled={loading}>
            {loading ? "Creando..." : "Registrarse"}
          </button>

          {error && <div className="error">{error}</div>}
        </form>
      </div>
    </div>
  );
}
