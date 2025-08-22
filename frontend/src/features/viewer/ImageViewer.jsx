import React, { useState } from 'react';
import testImg from '../../assets/test.png';
import logoJoey from '../../assets/Logo Joey care.png';
import './viewer.css';

export default function ImageViewer() {
  // Estados de los controles
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);

  // Ejemplo estático de datos paciente y estudio
  const paciente = {
    id: 'P001',
    nombre: 'Bebé García',
    edadGestacional: '32 semanas',
    peso: '1.8 kg',
  };

  const estudio = {
    fecha: '12/08/2025',
    hora: '14:30',
    equipo: 'GE Voluson E8',
    operador: 'Dr. López',
  };

  const mediciones = [
    { label: 'Distancia', value: '2.3 cm', href: '#' },
    { label: 'Área', value: '4.2 cm²', href: '#' },
  ];

  const observaciones = 'Ecografía transfontanelar normal. Ventrículos laterales de tamaño normal.';

  // Dummy de navegación
  const [imagenIdx, setImagenIdx] = useState(1);
  const totalImgs = 3;

  return (
    <div className="pacs-root">
      {/* Encabezado */}
      <header className="pacs-header">
        <div className="pacs-logorow">
          <img src={logoJoey} alt="Logo Joey" className="pacs-logo" />
          <span className="pacs-title">Visor de Ecografías</span>
        </div>
        <button className="pacs-btn pacs-export">⭳ Exportar</button>
      </header>

      {/* Layout principal */}
      <main className="pacs-main">
        {/* Sidebar */}
        <aside className="pacs-sidebar">
          <div className="pacs-card">
            <h3>Paciente</h3>
            <div><b>ID</b>: {paciente.id}</div>
            <div><b>Nombre</b>: {paciente.nombre}</div>
            <div><b>Edad gestacional</b>: {paciente.edadGestacional}</div>
            <div><b>Peso</b>: {paciente.peso}</div>
          </div>
          <div className="pacs-card">
            <h3>Estudio</h3>
            <div><b>Fecha</b>: {estudio.fecha}</div>
            <div><b>Hora</b>: {estudio.hora}</div>
            <div><b>Equipo</b>: {estudio.equipo}</div>
            <div><b>Operador</b>: {estudio.operador}</div>
          </div>
          <div className="pacs-card">
            <h3>Mediciones</h3>
            {mediciones.map(({ label, value, href }) => (
              <div key={label}>
                {label}: <a href={href}>{value}</a>
              </div>
            ))}
          </div>
          <div className="pacs-card">
            <h3>Observaciones</h3>
            <div>{observaciones}</div>
          </div>
        </aside>

        {/* Visor central */}
        <section className="pacs-viewport">
          {/* Herramientas y controles */}
        <div className="pacs-tools">
            <span style={{ fontSize: '1.25em', opacity: 0.8 }}>🔍 🖊️ 🩺</span>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: '22px' }}>
                <label>
                Zoom{" "}
                <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={zoom}
                    onChange={e => setZoom(parseFloat(e.target.value))}
                />
                </label>
                <label>
                Brillo{" "}
                <input
                    type="range"
                    min="50"
                    max="200"
                    value={brightness}
                    onChange={e => setBrightness(parseInt(e.target.value))}
                />
                </label>
                <label>
                Contraste{" "}
                <input
                    type="range"
                    min="50"
                    max="200"
                    value={contrast}
                    onChange={e => setContrast(parseInt(e.target.value))}
                />
                </label>
            </span>
        </div>


          {/* Imagen */}
          <div className="pacs-imgbox">
            <img
              src={testImg}
              alt="Ecografía"
              className="pacs-img"
              style={{
                transform: `scale(${zoom})`,
                filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                transition: '0.18s',
              }}
            />
          </div>

          {/* Barra controles y navegación */}
          <div className="pacs-nav">
            <button
              className="pacs-btn"
              onClick={() => setImagenIdx(i => Math.max(1, i - 1))}
              disabled={imagenIdx <= 1}
            >
              Anterior
            </button>
            <span>
              {imagenIdx} de {totalImgs}
            </span>
            <button
              className="pacs-btn"
              onClick={() => setImagenIdx(i => Math.min(totalImgs, i + 1))}
              disabled={imagenIdx >= totalImgs}
            >
              Siguiente
            </button>
            <button className="pacs-btn pacs-save">💾 Guardar cambios</button>
          </div>
        </section>
      </main>
    </div>
  );
}
