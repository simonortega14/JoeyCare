import React, { useState } from 'react';
import './CrearPacientePage.css'; // Assuming you'll create a CSS file

const CrearPacientePage = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    documento: '',
    fecha_nacimiento: '',
    peso_nacimiento_g: '',
    edad_gestacional_sem: '',
    perimetro_cefalico: '',
    // Add more fields as needed
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:4000/api/neonatos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Error al crear paciente');
      alert('Paciente creado exitosamente');
      // Reset form or navigate
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="crear-paciente-container">
      <h1>Crear Paciente</h1>
      <form onSubmit={handleSubmit} className="crear-paciente-form">
        <div className="form-group">
          <label>Nombre:</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
          />
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
        </div>
        <div className="form-group">
          <label>Peso al Nacimiento (g):</label>
          <input
            type="number"
            name="peso_nacimiento_g"
            value={formData.peso_nacimiento_g}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Edad Gestacional (sem):</label>
          <input
            type="number"
            name="edad_gestacional_sem"
            value={formData.edad_gestacional_sem}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Perímetro Cefálico (cm):</label>
          <input
            type="number"
            name="perimetro_cefalico"
            value={formData.perimetro_cefalico}
            onChange={handleChange}
          />
        </div>
        <button type="submit" className="submit-btn">Crear Paciente</button>
      </form>
    </div>
  );
};

export default CrearPacientePage;