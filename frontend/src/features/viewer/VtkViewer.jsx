import { useRef, useEffect, useState } from "react";
import "@kitware/vtk.js/Rendering/Profiles/All";
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkHttpDataSetReader from '@kitware/vtk.js/IO/Core/HttpDataSetReader';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import "./viewer.css";


function VtkViewer() {
  const vtkContainerRef = useRef(null);
  const context = useRef(null);

  const [pacientes, setPacientes] = useState([]);
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [ecografias, setEcografias] = useState([]);
  const [selectedEcografia, setSelectedEcografia] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [windowLevel, setWindowLevel] = useState({ width: 256, center: 128 });

  useEffect(() => {
    fetch("http://localhost:4000/api/pacientes")
      .then(res => res.json())
      .then(setPacientes)
      .catch(() => setPacientes([{ id: 1, nombre: "Prueba", apellido: "Paciente" }]));
  }, []);

  useEffect(() => {
    if (!selectedPaciente) return setEcografias([]);
    fetch(`http://localhost:4000/api/pacientes/${selectedPaciente.id}/ecografias`)
      .then(res => res.json())
      .then(setEcografias)
      .catch(() => setEcografias([]));
  }, [selectedPaciente]);

  const applyWindowLevel = (pixelData, width, height, windowWidth, windowCenter) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const imageData = ctx.createImageData(width, height);
    
    const minValue = windowCenter - windowWidth / 2;
    const maxValue = windowCenter + windowWidth / 2;
    const range = maxValue - minValue;
    
    for (let i = 0; i < pixelData.length; i++) {
      let value = pixelData[i];
      
      // Aplicar window/level
      if (value <= minValue) {
        value = 0;
      } else if (value >= maxValue) {
        value = 255;
      } else {
        value = ((value - minValue) / range) * 255;
      }
      
      const idx = i * 4;
      imageData.data[idx] = value;     // R
      imageData.data[idx + 1] = value; // G
      imageData.data[idx + 2] = value; // B
      imageData.data[idx + 3] = 255;   // A
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  };

  useEffect(() => {
    if (!showViewer || !selectedEcografia || !vtkContainerRef.current) return;

    if (context.current) {
      context.current.fullScreenRenderer.delete();
      context.current = null;
    }

    setLoading(true);
    setError(null);

    const fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
      rootContainer: vtkContainerRef.current,
      containerStyle: { width: "100%", height: "100%", position: "relative" },
      background: [0, 0, 0],
    });

    const renderWindow = fullScreenRenderWindow.getRenderWindow();
    const renderer = fullScreenRenderWindow.getRenderer();
    renderer.setBackground(0.1, 0.1, 0.15);

    const imageActorI = vtkImageSlice.newInstance();

    renderer.addActor(imageActorI);

    function updateColorLevel(e) {
      const colorLevel = Number(
        (e ? e.target : document.querySelector('.colorLevel')).value
      );
      imageActorI.getProperty().setColorLevel(colorLevel);
      renderWindow.render();
    }

    function updateColorWindow(e) {
      const colorLevel = Number(
        (e ? e.target : document.querySelector('.colorWindow')).value
      );
      imageActorI.getProperty().setColorWindow(colorLevel);
      renderWindow.render();
    }

    const reader = vtkHttpDataSetReader.newInstance({
      fetchGzip: true,
    });

    reader
      .setUrl(`http://localhost:4000/api/uploads/${selectedEcografia.filename}`, { loadData: true })
      .then(() => {
        const data = reader.getOutputData();
        const dataRange = data.getPointData().getScalars().getRange();
        const extent = data.getExtent();

        const imageMapperI = vtkImageMapper.newInstance();
        imageMapperI.setInputData(data);
        imageMapperI.setISlice(30);
        imageActorI.setMapper(imageMapperI);
        
        renderer.resetCamera();
        renderer.resetCameraClippingRange();
        renderWindow.render();
       
          ".sliceI".forEach((selector, idx) => {
        const el = document.querySelector(selector);
        el.setAttribute('min', extent[idx * 2 + 0]);
        el.setAttribute('max', extent[idx * 2 + 1]);
        el.setAttribute('value', 30);
      });

      ['.colorLevel', '.colorWindow'].forEach((selector) => {
        document.querySelector(selector).setAttribute('max', dataRange[1]);
        document.querySelector(selector).setAttribute('value', dataRange[1]);
        });
        document
          .querySelector('.colorLevel')
          .setAttribute('value', (dataRange[0] + dataRange[1]) / 2);
        updateColorLevel();
        updateColorWindow();
      });

      document
        .querySelector('.colorLevel')
        .addEventListener('input', updateColorLevel);
      document
        .querySelector('.colorWindow')
        .addEventListener('input', updateColorWindow);

    return () => {
      if (context.current) {
        context.current.fullScreenRenderer.delete();
        context.current = null;
      }
    };
  }, [showViewer, selectedEcografia]);

  useEffect(() => {
    if (context.current) {
      const { camera, renderWindow } = context.current;
      camera.setParallelScale(1 / zoom);
      renderWindow.render();
    }
  }, [zoom]);

  useEffect(() => {
    if (context.current && context.current.pixelData) {
      const { pixelData, width, height, texture, renderWindow } = context.current;
      const canvas = applyWindowLevel(pixelData, width, height, windowLevel.width, windowLevel.center);
      texture.setCanvas(canvas);
      renderWindow.render();
    }
  }, [windowLevel]);

  const handleResetView = () => {
    if (context.current) {
      context.current.renderer.resetCamera();
      context.current.renderWindow.render();
      setZoom(1);
    }
  };

  const handleZoomOriginal = () => {
    if (context.current) {
      context.current.camera.setParallelScale(0.5);
      context.current.renderer.resetCameraClippingRange();
      context.current.renderWindow.render();
      setZoom(1);
    }
  };

  const handleAutoWindowLevel = () => {
    if (context.current && context.current.pixelData) {
      const pixelData = context.current.pixelData;
      let min = Infinity;
      let max = -Infinity;
      
      for (let i = 0; i < pixelData.length; i++) {
        if (pixelData[i] < min) min = pixelData[i];
        if (pixelData[i] > max) max = pixelData[i];
      }
      
      const newWidth = max - min;
      const newCenter = min + newWidth / 2;
      setWindowLevel({ width: newWidth, center: newCenter });
    }
  };

  if (showViewer) {
    const ext = selectedEcografia?.filename.split('.').pop().toLowerCase();
    const isDicom = ext === "dcm";

    return (
      <div className="vtk-fullscreen">
        <div className="vtk-toolbar">
          <button onClick={() => setShowViewer(false)}>← Volver</button>
          <button onClick={handleResetView}>🔄 Reset View</button>
          <button onClick={handleZoomOriginal}>🔍 1:1</button>
          
          {isDicom && (
            <>
              <button onClick={handleAutoWindowLevel} style={{ marginLeft: "10px" }}>
                🎨 Auto W/L
              </button>
              <div style={{ display: "inline-flex", alignItems: "center", marginLeft: "10px" }}>
                <label style={{ color: "#fff", marginRight: "5px" }}>W:</label>
                <input
                  type="number"
                  value={Math.round(windowLevel.width)}
                  onChange={e => setWindowLevel(prev => ({ ...prev, width: parseFloat(e.target.value) }))}
                  style={{ width: "80px", marginRight: "10px" }}
                />
                <label style={{ color: "#fff", marginRight: "5px" }}>L:</label>
                <input
                  type="number"
                  value={Math.round(windowLevel.center)}
                  onChange={e => setWindowLevel(prev => ({ ...prev, center: parseFloat(e.target.value) }))}
                  style={{ width: "80px" }}
                />
              </div>
            </>
          )}
          
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.05"
            value={zoom}
            onChange={e => setZoom(parseFloat(e.target.value))}
            style={{ width: "150px", marginLeft: "10px" }}
          />
          <span style={{ marginLeft: "5px", color: "#fff" }}>{zoom.toFixed(2)}x</span>
        </div>
        {loading && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "white", fontSize: "20px" }}>
            Cargando ecografía...
          </div>
        )}
        {error && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "red", fontSize: "16px", textAlign: "center", padding: "20px", backgroundColor: "rgba(0,0,0,0.8)", borderRadius: "8px" }}>
            {error}
          </div>
        )}
        <div ref={vtkContainerRef} className="vtk-viewer-canvas" />
      </div>
    );
  }

  return (
    <div className="vtk-page-container">
      <div className="vtk-selection-wrapper">
        <h2 className="vtk-main-title">Visualizar Ecografías</h2>
        <div className="vtk-form-section">
          <label className="vtk-form-label">Seleccionar Paciente:</label>
          <select
            className="vtk-form-select"
            value={selectedPaciente?.id || ""}
            onChange={e => {
              const p = pacientes.find(p => p.id === parseInt(e.target.value));
              setSelectedPaciente(p || null);
              setSelectedEcografia(null);
            }}
          >
            <option value="">-- Selecciona un paciente --</option>
            {pacientes.map(p => (
              <option key={p.id} value={p.id}>
                {p.nombre} {p.apellido} (ID: {p.id})
              </option>
            ))}
          </select>
        </div>
        {selectedPaciente && (
          <div className="vtk-form-section">
            <label className="vtk-form-label">Seleccionar Ecografía:</label>
            <select
              className="vtk-form-select"
              value={selectedEcografia?.id || ""}
              onChange={e => {
                const ec = ecografias.find(ec => ec.id === parseInt(e.target.value));
                setSelectedEcografia(ec || null);
              }}
            >
              <option value="">-- Selecciona una ecografía --</option>
              {ecografias.map(ec => (
                <option key={ec.id} value={ec.id}>
                  {ec.filename} - {new Date(ec.uploaded_at).toLocaleDateString()}
                </option>
              ))}
            </select>
            {ecografias.length === 0 && (
              <p className="vtk-empty-text">No hay ecografías disponibles para este paciente</p>
            )}
          </div>
        )}
        {selectedEcografia && (
          <div className="vtk-form-section">
            <button className="vtk-visualize-button" onClick={() => setShowViewer(true)}>
              Visualizar Ecografía
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default VtkViewer;