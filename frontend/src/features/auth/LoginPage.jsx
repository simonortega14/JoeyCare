import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logoJoey from "../../assets/Logo Joey care.png";
import marcaAgua from "../../assets/Marca De Agua.png";
import "./auth.css";

export default function LoginPage({ onSubmit }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const canSubmit =
    form.username.trim().length > 0 && form.password.length >= 6 && !loading;

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      await onSubmit?.(form);
    } catch (err) {
      setError(err?.message || "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div
        className="login-bg dynamic"
        style={{
          backgroundImage: `url(${marcaAgua})`,
        }}
      />
      <div className="login-card">
        <div className="login-avatar">
          <img src={logoJoey} alt="Logo Joey Care" />
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <span className="field-icon" aria-hidden="true">
              👤
            </span>
            <input
              name="username"
              type="text"
              placeholder="Ingrese su correo o usuario"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              required
            />
          </div>

          <div className="field">
            <span className="field-icon" aria-hidden="true">
              🔐
            </span>
            <input
              name="password"
              type="password"
              placeholder="**********"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              minLength={6}
              required
            />
          </div>

          <div className="actions">
            <button className="jc-btn" type="submit" disabled={!canSubmit}>
              {loading ? "Ingresando…" : "Ingresar"}
            </button>
          </div>

          {/* Texto para ir a registro */}
          <div className="register-link">
            ¿No tienes una cuenta?{" "}
            <button
              type="button"
              className="link"
              onClick={() => navigate("/register")}
            >
              Regístrate
            </button>
          </div>

          {error && <div className="error">{error}</div>}
        </form>
      </div>
    </div>
  );
}