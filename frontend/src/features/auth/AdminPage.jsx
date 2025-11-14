import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logoJoey from "../../assets/Logo Joey care.png";
import marcaAgua from "../../assets/Marca De Agua.png";
import "./auth.css";

export default function AdminPage() {
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState(""); // "success" o "error"
  const navigate = useNavigate();

  const cargarPendientes = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:4000/api/medicos/pendientes");
      const data = await res.json();
      setPendientes(data);
    } catch (err) {
      console.error(err);
      mostrarMensaje("Error al cargar médicos pendientes.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPendientes();
  }, []);

  const mostrarMensaje = (texto, tipo) => {
    setMensaje(texto);
    setTipoMensaje(tipo);
    setTimeout(() => {
      setMensaje("");
      setTipoMensaje("");
    }, 4000);
  };

  const aprobarMedico = async (id) => {
    try {
      const res = await fetch(`http://localhost:4000/api/medicos/${id}/aprobar`, {
        method: "PUT"
      });
      if (res.ok) {
        mostrarMensaje("Médico aprobado correctamente.", "success");
        cargarPendientes();
      }
    } catch (err) {
      console.error(err);
      mostrarMensaje("Error al aprobar médico.", "error");
    }
  };

  const rechazarMedico = async (id) => {
    if (!window.confirm("¿Estás seguro de rechazar esta solicitud?")) return;
    
    try {
      const res = await fetch(`http://localhost:4000/api/medicos/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        mostrarMensaje("Solicitud rechazada correctamente.", "success");
        cargarPendientes();
      }
    } catch (err) {
      console.error(err);
      mostrarMensaje("Error al rechazar solicitud.", "error");
    }
  };

  const handleCerrarSesion = () => {
    localStorage.removeItem("user");
    navigate("/");
    window.location.reload();
  };

  return (
    <div className="login-page">
      <div
        className="login-bg dynamic"
        style={{
          backgroundImage: `url(${marcaAgua})`,
        }}
      />
      <div className="login-card admin-card">
        <div className="login-avatar">
          <img src={logoJoey} alt="Logo Joey Care" />
        </div>

        <div className="admin-header">
          <h2>Panel de Administración</h2>
          <button className="admin-logout-btn" onClick={handleCerrarSesion}>
            Cerrar Sesión
          </button>
        </div>

        {mensaje && (
          <div className={tipoMensaje === "success" ? "success-message" : "error"}>
            {mensaje}
          </div>
        )}

        {loading ? (
          <p className="admin-empty-message">Cargando médicos pendientes...</p>
        ) : pendientes.length === 0 ? (
          <p className="admin-empty-message">No hay médicos pendientes de aprobación.</p>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Sede</th>
                  <th>Especialidad</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map((m) => (
                  <tr key={m.id}>
                    <td>{m.nombre} {m.apellido}</td>
                    <td>{m.email}</td>
                    <td>{m.sede}</td>
                    <td>{m.especialidad}</td>
                    <td>
                      <div className="admin-table-actions">
                        <button
                          className="jc-btn jc-btn--success"
                          onClick={() => aprobarMedico(m.id)}
                        >
                          Aprobar
                        </button>
                        <button
                          className="jc-btn jc-btn--danger"
                          onClick={() => rechazarMedico(m.id)}
                        >
                          Rechazar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}