import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logoJoey from "../../assets/Logo Joey care.png";
import marcaAgua from "../../assets/Marca De Agua.png";
import "./auth.css";

export default function RegisterPage() {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    sede_id: "",
    especialidad_id: "",
    email: "",
    password: "",
  });
  const [sedes, setSedes] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sedesRes = await axios.get("http://localhost:4000/api/sedes");
        setSedes(sedesRes.data);
        const especialidadesRes = await axios.get("http://localhost:4000/api/especialidades");
        setEspecialidades(especialidadesRes.data);
      } catch (err) {
        console.error("Error cargando sedes o especialidades", err);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await axios.post("http://localhost:4000/api/medicos", {
        rol_id: 2, // siempre médico
        nombre: form.nombre,
        apellido: form.apellido,
        email: form.email,
        hash_password: form.password,
        sede_id: parseInt(form.sede_id),
        especialidad_id: parseInt(form.especialidad_id),
      });
      alert("Usuario creado. Espera aprobación del administrador.");
      navigate("/"); 
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "No se pudo registrar el usuario");
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
            <label>Nombre</label>
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
            <label>Apellido</label>
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
            <label>Sede</label>
            <select
              name="sede_id"
              value={form.sede_id}
              onChange={handleChange}
              required
            >
              <option value="">Selecciona una sede</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} - {s.ciudad}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Especialidad</label>
            <select
              name="especialidad_id"
              value={form.especialidad_id}
              onChange={handleChange}
              required
            >
              <option value="">Selecciona una especialidad</option>
              {especialidades.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Correo</label>
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
            <label>Contraseña</label>
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
