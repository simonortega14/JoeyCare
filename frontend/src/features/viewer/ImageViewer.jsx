import React, { useState, useCallback } from 'react';
import VtkDicomViewer from './VtkDicomViewer';
import logoJoey from '../../assets/Logo Joey care.png';
import './viewer.css';

export default function ImageViewer() {
  // Estados principales
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [imagenIdx, setImagenIdx] = useState(1);
  const [activeTool, setActiveTool] = useState('none');
  const [dicomMetadata, setDicomMetadata] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  
// Lista de archivos DICOM descargados
const dicomFiles = [
  { path: "/dicom/0001.dcm", name: "Imagen DICOM 001", type: "Estudio Médico" },
  { path: "/dicom/0002.dcm", name: "Imagen DICOM 002", type: "Estudio Médico" },
  { path: "/dicom/0003.dcm", name: "Imagen DICOM 003", type: "Estudio Médico" }
];



  const totalImgs = dicomFiles.length;
  const currentFile = dicomFiles[imagenIdx - 1];

  // Callback para recibir metadatos DICOM
  const handleDicomMetadata = useCallback((metadata) => {
    console.log("📊 Metadatos DICOM recibidos:", metadata);
    setDicomMetadata(metadata);
  }, []);

  // Callback para recibir mediciones
  const handleMeasurement = useCallback((measurement) => {
    console.log("📏 Nueva medición:", measurement);
    setMeasurements(prev => [...prev, { 
      ...measurement, 
      imageIndex: imagenIdx,
      imageName: currentFile.name,
      id: Date.now()
    }]);
  }, [imagenIdx, currentFile]);

  // Navegación entre imágenes
  const goToPrevious = () => {
    setImagenIdx(i => Math.max(1, i - 1));
    setMeasurements([]); // Limpiar mediciones al cambiar imagen
  };

  const goToNext = () => {
    setImagenIdx(i => Math.min(totalImgs, i + 1));
    setMeasurements([]); // Limpiar mediciones al cambiar imagen
  };

  // Toggle comparación longitudinal
  const toggleComparison = () => {
    setShowComparison(!showComparison);
    console.log("🔄 Modo comparación:", !showComparison ? 'ACTIVADO' : 'DESACTIVADO');
  };

  return (
    <div className="pacs-root-fullscreen">
      {/* Header PACS médico */}
      <header className="pacs-header-compact">
        <div className="pacs-logorow">
          <img src={logoJoey} alt="Logo Joey" className="pacs-logo" />
          <span className="pacs-title">
            🏥 PACS DICOM - Fundación Canguro
          </span>
        </div>
        <div className="pacs-header-info">
          <span className="pacs-study-info">
            {dicomMetadata?.studyDescription || 'Ecografías Transfontanelares'}
          </span>
          <button className="pacs-btn pacs-comparison-btn" onClick={toggleComparison}>
            📊 {showComparison ? 'Vista Simple' : 'Comparación Longitudinal'}
          </button>
          <button className="pacs-btn pacs-export">⭳ Exportar DICOM</button>
        </div>
      </header>

      {/* Main layout */}
      <main className="pacs-main-fullscreen">
        <section className="pacs-viewport-fullscreen">
          {/* Barra de información del estudio actual */}
          <div className="pacs-study-bar">
            <div className="pacs-study-left">
              <span className="pacs-study-title">
                📁 {currentFile.name} ({currentFile.type})
              </span>
              <span className="pacs-study-meta">
                {dicomMetadata?.modality || 'DICOM'} • 
                {dicomMetadata?.studyDate || new Date().toLocaleDateString()} • 
                Imagen {imagenIdx}/{totalImgs}
              </span>
            </div>
            <div className="pacs-study-right">
              <span className="pacs-measurements-count">
                📏 {measurements.length} mediciones
              </span>
            </div>
          </div>

          {/* Controles médicos y herramientas */}
          <div className="pacs-tools-enhanced">
            <div className="pacs-tools-left">
              <span className="pacs-tools-title">
                🔬 VTK.js Medical • {dicomMetadata?.manufacturerModelName || 'Equipo Médico'}
              </span>
            </div>
            
            {/* Herramientas de medición médica */}
            <div className="pacs-tools-center">
              <div className="pacs-drawing-tools">
                <button 
                  className={`pacs-tool-btn ${activeTool === 'line' ? 'active' : ''}`}
                  onClick={() => setActiveTool(activeTool === 'line' ? 'none' : 'line')}
                  title="Medir Distancia (mm)"
                >
                  📏 Distancia
                </button>
                <button 
                  className={`pacs-tool-btn ${activeTool === 'rectangle' ? 'active' : ''}`}
                  onClick={() => setActiveTool(activeTool === 'rectangle' ? 'none' : 'rectangle')}
                  title="Medir Área (mm²)"
                >
                  ▭ Área
                </button>
                <button 
                  className="pacs-tool-btn pacs-clear-btn"
                  onClick={() => setActiveTool('clear')}
                  title="Limpiar Todas las Mediciones"
                >
                  🗑️ Limpiar
                </button>
              </div>
            </div>

            {/* Controles médicos DICOM */}
            <div className="pacs-tools-right">
              <label className="pacs-control">
                <span>Zoom:</span>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={zoom}
                  onChange={e => setZoom(parseFloat(e.target.value))}
                />
                <span className="pacs-value">{zoom.toFixed(1)}x</span>
              </label>
              
              <label className="pacs-control">
                <span>Window:</span>
                <input
                  type="range"
                  min="50"
                  max="400"
                  value={brightness}
                  onChange={e => setBrightness(parseInt(e.target.value))}
                />
                <span className="pacs-value">{brightness}</span>
              </label>
              
              <label className="pacs-control">
                <span>Level:</span>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={contrast}
                  onChange={e => setContrast(parseInt(e.target.value))}
                />
                <span className="pacs-value">{contrast}</span>
              </label>
            </div>
          </div>

          {/* Viewport DICOM */}
          <div className={`pacs-viewport-container ${showComparison ? 'comparison-mode' : ''}`}>
            <div className="pacs-vtk-container-main">
              <VtkDicomViewer 
                key={`dicom-${imagenIdx}`} // Force re-render on image change
                dicomSource={currentFile.path}
                controls={{ zoom, brightness, contrast }}
                activeTool={activeTool}
                onToolChange={setActiveTool}
                onDicomMetadata={handleDicomMetadata}
                onMeasurement={handleMeasurement}
              />
            </div>
            
            {/* Vista comparativa (para futura implementación) */}
            {showComparison && (
              <div className="pacs-comparison-panel">
                <div className="pacs-comparison-placeholder">
                  <h3>🔄 Comparación Longitudinal</h3>
                  <p>📊 Vista comparativa de estudios previos</p>
                  <p>🚧 En desarrollo para próxima versión</p>
                </div>
              </div>
            )}
          </div>

          {/* Navegación y controles principales */}
          <div className="pacs-nav-enhanced">
            <div className="pacs-nav-controls">
              <button
                className="pacs-btn pacs-nav-btn"
                onClick={goToPrevious}
                disabled={imagenIdx <= 1}
              >
                ⬅ DICOM Anterior
              </button>
              
              <div className="pacs-nav-info">
                <span className="pacs-nav-current">
                  DICOM {imagenIdx} de {totalImgs}
                </span>
                <span className="pacs-nav-details">
                  {dicomMetadata?.studyDate && `📅 ${dicomMetadata.studyDate}`}
                  {dicomMetadata?.seriesDescription && ` • ${dicomMetadata.seriesDescription}`}
                </span>
              </div>
              
              <button
                className="pacs-btn pacs-nav-btn"
                onClick={goToNext}
                disabled={imagenIdx >= totalImgs}
              >
                Siguiente DICOM ➡
              </button>
            </div>
            
            <div className="pacs-nav-actions">
              <button className="pacs-btn pacs-save-btn">
                💾 Guardar Mediciones
              </button>
              <button className="pacs-btn pacs-print-btn">
                🖨️ Imprimir Informe
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Panel inferior - Metadatos DICOM y mediciones */}
      <footer className="pacs-info-panel-enhanced">
        <div className="pacs-info-content">
          {/* Información del paciente DICOM */}
          <div className="pacs-info-card">
            <h4>👤 Paciente DICOM</h4>
            <div><strong>Nombre:</strong> {dicomMetadata?.patientName || 'Anónimo'}</div>
            <div><strong>Estudio:</strong> {dicomMetadata?.studyDescription || 'N/A'}</div>
            <div><strong>Fecha:</strong> {dicomMetadata?.studyDate || 'N/A'}</div>
            <div><strong>Modalidad:</strong> {dicomMetadata?.modality || 'DICOM'}</div>
          </div>
          
          {/* Equipo e institución */}
          <div className="pacs-info-card">
            <h4>🏥 Equipo Médico</h4>
            <div><strong>Fabricante:</strong> {dicomMetadata?.manufacturerModelName || 'N/A'}</div>
            <div><strong>Institución:</strong> {dicomMetadata?.institutionName || 'Fundación Canguro'}</div>
            <div><strong>Serie:</strong> {dicomMetadata?.seriesDescription || 'Principal'}</div>
            <div><strong>Comentarios:</strong> {dicomMetadata?.imageComments || 'Estudio médico'}</div>
          </div>
          
          {/* Mediciones realizadas */}
          <div className="pacs-info-card">
            <h4>📏 Mediciones Actuales</h4>
            {measurements.length === 0 ? (
              <div className="pacs-no-measurements">
                Sin mediciones • Use las herramientas de arriba
              </div>
            ) : (
              measurements.map((measurement) => (
                <div key={measurement.id} className="pacs-measurement-item">
                  <strong>{measurement.type === 'distance' ? '📏' : '▭'} {measurement.type.charAt(0).toUpperCase() + measurement.type.slice(1)}:</strong> {' '}
                  {measurement.value.toFixed(2)} {measurement.unit}
                  {measurement.width && ` (${measurement.width.toFixed(1)}×${measurement.height.toFixed(1)})`}
                </div>
              ))
            )}
          </div>
          
          {/* Información técnica */}
          <div className="pacs-info-card">
            <h4>⚙️ Información Técnica</h4>
            <div><strong>Archivo:</strong> {currentFile.name}</div>
            <div><strong>Formato:</strong> DICOM (.dcm)</div>
            <div><strong>Tipo:</strong> {currentFile.type}</div>
            <div><strong>Rendering:</strong> VTK.js WebGL</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
