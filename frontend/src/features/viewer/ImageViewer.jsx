import React, { useState, useCallback } from 'react';
import PngVtkViewer from './PngVtkViewer';
import './viewer.css';

const ImageViewer = () => {
  const [imageSettings, setImageSettings] = useState({
    zoom: 1,
    brightness: 100,
    contrast: 100
  });
  const [activeTool, setActiveTool] = useState(null);
  const [measurement, setMeasurement] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const handleSettingsChange = useCallback((setting, value) => {
    setImageSettings(prev => ({ ...prev, [setting]: value }));
  }, []);

  const handleToolSelect = useCallback((tool) => {
    setActiveTool(prev => prev === tool ? null : tool);
  }, []);

  const handleMeasurementUpdate = useCallback((newM) => {
    setMeasurement(newM);
  }, []);

  const handleImageError = useCallback((err) => {
    console.error('Image loading error:', err);
  }, []);

  return (
    <div className="image-viewer-page">
      <div className="viewer-header">
        <h2 className="viewer-title">
          🏥 Ecografías Transfontanelares - Fundación Canguro
        </h2>
        <div className="viewer-controls">
          <div className="control-group">
            <label htmlFor="zoom">🔍 Zoom:</label>
            <input
              id="zoom"
              type="range"
              min="0.5" max="5" step="0.1"
              value={imageSettings.zoom}
              onChange={e => handleSettingsChange('zoom', parseFloat(e.target.value))}
            />
            <span className="control-value">{Math.round(imageSettings.zoom*100)}%</span>
          </div>
          <div className="control-group">
            <label htmlFor="brightness">☀️ Brillo:</label>
            <input
              id="brightness"
              type="range"
              min="50" max="200" step="5"
              value={imageSettings.brightness}
              onChange={e => handleSettingsChange('brightness', parseInt(e.target.value))}
            />
            <span className="control-value">{imageSettings.brightness}%</span>
          </div>
          <div className="control-group">
            <label htmlFor="contrast">🌗 Contraste:</label>
            <input
              id="contrast"
              type="range"
              min="50" max="200" step="5"
              value={imageSettings.contrast}
              onChange={e => handleSettingsChange('contrast', parseInt(e.target.value))}
            />
            <span className="control-value">{imageSettings.contrast}%</span>
          </div>
        </div>
      </div>

      <div className="medical-tools">
        <div className="tools-group">
          <span className="tools-title">🔧 Herramientas:</span>
          <button
            className={`tool-btn ${activeTool==='distance'? 'active':''}`}
            onClick={()=>handleToolSelect('distance')}
          >📏 Distancia</button>
          <button
            className={`tool-btn ${activeTool==='area'? 'active':''}`}
            onClick={()=>handleToolSelect('area')}
          >⬛ Área</button>
          <button
            className="tool-btn danger"
            onClick={()=>handleToolSelect('clear')}
          >🗑️ Limpiar</button>
          <button
            className="tool-btn settings"
            onClick={()=>setShowSettings(!showSettings)}
          >⚙️ Config</button>
        </div>
      </div>

      <div className="viewer-container">
        <PngVtkViewer
          zoom={imageSettings.zoom}
          brightness={imageSettings.brightness}
          contrast={imageSettings.contrast}
          activeTool={activeTool}
          setMeasurement={handleMeasurementUpdate}
          onError={handleImageError}
        />
      </div>

      {measurement && (
        <div className="measurement-panel">
          <div className="measurement-card">
            <h4>📊 Medición Activa</h4>
            <div className="measurement-info">
              <span className="measurement-type">
                {measurement.type==='distance'?'📏 Distancia':'⬛ Área'}
              </span>
              <span className="measurement-value">
                {measurement.value} {measurement.unit}
              </span>
              {measurement.width && measurement.height && (
                <small className="measurement-dims">
                  {measurement.width}mm × {measurement.height}mm
                </small>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="viewer-status">
        <div className="status-info">
          <span className="status-label">🎯 Herramienta:</span>
          <span className="status-value">
            {activeTool ? (activeTool==='distance'?'📏 Medición':'⬛ Área') : '👆 Navegación'}
          </span>
        </div>
        <div className="status-info">
          <span className="status-label">📁 Imagen:</span>
          <span className="status-value">🖼️ test.png</span>
        </div>
      </div>

      {/* Modal configuración omitted for brevity */}
    </div>
  );
};

export default ImageViewer;
// Note: The image source is hardcoded to 'test.png' for demonstration purposes.