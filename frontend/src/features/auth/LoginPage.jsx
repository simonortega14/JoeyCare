import { useState } from 'react';
import logoJoey from '../../assets/Logo Joey care.png';
import marcaAgua from '../../assets/Marca De Agua.png';
import './auth.css';

export default function LoginPage({ onSubmit }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit =
    form.username.trim().length > 0 && form.password.length >= 6 && !loading;

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      await onSubmit?.(form);
    } catch (err) {
      setError(err?.message || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ position: 'relative' }}>
      <div
        className="login-bg"
        style={{
          backgroundImage: `url(${marcaAgua})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.08,
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div className="login-card" style={{ position: 'relative', zIndex: 10 }}>
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
            <button
              type="button"
              className="link"
              onClick={() => alert('Recuperar contraseña')}
            >
              ¿Olvidaste tu contraseña?
            </button>
            <button className="jc-btn" type="submit" disabled={!canSubmit}>
              {loading ? 'Ingresando…' : 'Continuar'}
            </button>
          </div>

          {error && <div className="error">{error}</div>}
        </form>
      </div>
    </div>
  );
}
