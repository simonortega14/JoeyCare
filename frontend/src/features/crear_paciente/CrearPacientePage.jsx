import React, { useState } from 'react';
import './CrearPacientePage.css'; // Assuming you'll create a CSS file

const CrearPacientePage = () => {
  const initialFormData = {
    nombre: '',
    apellido: '',
    documento: '',
    sexo: '',
    fecha_nacimiento: '',
    edad_gestacional_sem: '',
    edad_corregida_sem: '',
    peso_nacimiento_g: '',
    peso_actual_g: '',
    perimetro_cefalico: '',
    nombre_acudiente: '',
    apellido_acudiente: '',
    sexo_acudiente: '',
    parentesco: '',
    telefono: '',
    correo: '',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const newErrors = {};

    // Text fields: not empty, only letters and spaces
    const textFields = ['nombre', 'apellido', 'nombre_acudiente', 'apellido_acudiente'];
    textFields.forEach(field => {
      if (!formData[field].trim()) {
        newErrors[field] = 'Este campo es obligatorio';
      } else if (!/^[a-zA-Z\s]+$/.test(formData[field])) {
        newErrors[field] = 'Solo letras y espacios';
      }
    });

    // Documento: not empty, numbers only
    if (!formData.documento.trim()) {
      newErrors.documento = 'Documento es obligatorio';
    } else if (!/^\d+$/.test(formData.documento)) {
      newErrors.documento = 'Solo números';
    }

    // Number fields
    const numberFields = ['edad_gestacional_sem', 'edad_corregida_sem', 'peso_nacimiento_g', 'peso_actual_g', 'perimetro_cefalico'];
    numberFields.forEach(field => {
      if (formData[field] && isNaN(Number(formData[field]))) {
        newErrors[field] = 'Debe ser un número';
      }
    });

    // Telefono: not empty, numbers
    if (!formData.telefono.trim()) {
      newErrors.telefono = 'Teléfono es obligatorio';
    } else if (!/^\d+$/.test(formData.telefono)) {
      newErrors.telefono = 'Solo números';
    }

    // Correo: not empty, has @ and .com
    if (!formData.correo.trim()) {
      newErrors.correo = 'Correo es obligatorio';
    } else if (!formData.correo.includes('@') || !formData.correo.includes('.com')) {
      newErrors.correo = 'Debe contener @ y .com';
    }

    // Fecha: not empty
    if (!formData.fecha_nacimiento) {
      newErrors.fecha_nacimiento = 'Fecha de nacimiento es obligatoria';
    }

    // Sexo: selected
    if (!formData.sexo) {
      newErrors.sexo = 'Seleccione sexo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Get current user from localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
      alert('Usuario no autenticado');
      return;
    }

    try {
      const response = await fetch('http://localhost:4000/api/neonatos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          medico_id: user.id
        }),
      });
      if (!response.ok) throw new Error('Error al crear paciente');
      alert('Paciente creado exitosamente');
      setFormData(initialFormData);
      setErrors({});
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="page-container">
      {/* Header del Crear Paciente */}
      <header className="crear-paciente-header">
        <div className="crear-paciente-title">
          <h1>➕ Crear Paciente</h1>
        </div>
      </header>

      <div className="crear-paciente-container">
        <form onSubmit={handleSubmit} className="crear-paciente-form">
        <div className="form-columns">
          <div className="patient-section">
            <h2>Datos del Paciente</h2>
            <div className="form-group">
              <label>Nombre:</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
              />
              {errors.nombre && <span className="error">{errors.nombre}</span>}
            </div>
            <div className="form-group">
              <label>Apellido:</label>
              <input
                type="text"
                name="apellido"
                value={formData.apellido}
                onChange={handleChange}
                required
              />
              {errors.apellido && <span className="error">{errors.apellido}</span>}
            </div>
            <div className="form-group">
              <label>Documento:</label>
              <input
                type="text"
                name="documento"
                value={formData.documento}
                onChange={handleChange}
                required
              />
              {errors.documento && <span className="error">{errors.documento}</span>}
            </div>
            <div className="form-group">
              <label>Fecha de Nacimiento:</label>
              <input
                type="date"
                name="fecha_nacimiento"
                value={formData.fecha_nacimiento}
                onChange={handleChange}
                required
              />
              {errors.fecha_nacimiento && <span className="error">{errors.fecha_nacimiento}</span>}
            </div>
            <div className="form-group">
              <label>Peso al Nacimiento (g):</label>
              <input
                type="number"
                name="peso_nacimiento_g"
                value={formData.peso_nacimiento_g}
                onChange={handleChange}
              />
              {errors.peso_nacimiento_g && <span className="error">{errors.peso_nacimiento_g}</span>}
            </div>
            <div className="form-group">
              <label>Edad Gestacional (sem):</label>
              <input
                type="number"
                name="edad_gestacional_sem"
                value={formData.edad_gestacional_sem}
                onChange={handleChange}
              />
              {errors.edad_gestacional_sem && <span className="error">{errors.edad_gestacional_sem}</span>}
            </div>
            <div className="form-group">
              <label>Perímetro Cefálico (cm):</label>
              <input
                type="number"
                name="perimetro_cefalico"
                value={formData.perimetro_cefalico}
                onChange={handleChange}
              />
              {errors.perimetro_cefalico && <span className="error">{errors.perimetro_cefalico}</span>}
            </div>
            <div className="form-group">
              <label>Sexo:</label>
              <select
                name="sexo"
                value={formData.sexo}
                onChange={handleChange}
              >
                <option value="">Seleccionar</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="X">Otro</option>
              </select>
              {errors.sexo && <span className="error">{errors.sexo}</span>}
            </div>
            <div className="form-group">
              <label>Edad Corregida (sem):</label>
              <input
                type="number"
                name="edad_corregida_sem"
                value={formData.edad_corregida_sem}
                onChange={handleChange}
              />
              {errors.edad_corregida_sem && <span className="error">{errors.edad_corregida_sem}</span>}
            </div>
            <div className="form-group">
              <label>Peso Actual (g):</label>
              <input
                type="number"
                name="peso_actual_g"
                value={formData.peso_actual_g}
                onChange={handleChange}
              />
              {errors.peso_actual_g && <span className="error">{errors.peso_actual_g}</span>}
            </div>
          </div>

          <div className="guardian-section">
            <h2>Datos del Acudiente</h2>
            <div className="form-group">
              <label>Nombre del Acudiente:</label>
              <input
                type="text"
                name="nombre_acudiente"
                value={formData.nombre_acudiente}
                onChange={handleChange}
                required
              />
              {errors.nombre_acudiente && <span className="error">{errors.nombre_acudiente}</span>}
            </div>
            <div className="form-group">
              <label>Apellido del Acudiente:</label>
              <input
                type="text"
                name="apellido_acudiente"
                value={formData.apellido_acudiente}
                onChange={handleChange}
                required
              />
              {errors.apellido_acudiente && <span className="error">{errors.apellido_acudiente}</span>}
            </div>
            <div className="form-group">
              <label>Sexo del Acudiente:</label>
              <select
                name="sexo_acudiente"
                value={formData.sexo_acudiente}
                onChange={handleChange}
              >
                <option value="">Seleccionar</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="X">Otro</option>
              </select>
            </div>
            <div className="form-group">
              <label>Parentesco:</label>
              <select
                name="parentesco"
                value={formData.parentesco}
                onChange={handleChange}
              >
                <option value="">Seleccionar</option>
                <option value="P">Padre</option>
                <option value="M">Madre</option>
                <option value="H">Hermano</option>
                <option value="O">Otro</option>
              </select>
            </div>
            <div className="form-group">
              <label>Teléfono:</label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                required
              />
              {errors.telefono && <span className="error">{errors.telefono}</span>}
            </div>
            <div className="form-group">
              <label>Correo:</label>
              <input
                type="email"
                name="correo"
                value={formData.correo}
                onChange={handleChange}
                required
              />
              {errors.correo && <span className="error">{errors.correo}</span>}
            </div>
          </div>
        </div>
        <button type="submit" className="submit-btn">Crear Paciente</button>
      </form>
      </div>
    </div>
  );
};

export default CrearPacientePage;