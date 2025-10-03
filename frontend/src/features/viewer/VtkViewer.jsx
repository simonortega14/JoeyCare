import { useRef, useEffect, useState } from "react";
import "@kitware/vtk.js/Rendering/Profiles/All";
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkPlaneSource from "@kitware/vtk.js/Filters/Sources/PlaneSource";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkTexture from "@kitware/vtk.js/Rendering/Core/Texture";
import vtkInteractorStyleImage from "@kitware/vtk.js/Interaction/Style/InteractorStyleImage";
import dicomParser from "dicom-parser";
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

    const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
      rootContainer: vtkContainerRef.current,
      containerStyle: { width: "100%", height: "100%", position: "relative" },
    });
    const renderer = fullScreenRenderer.getRenderer();
    const renderWindow = fullScreenRenderer.getRenderWindow();
    renderer.setBackground(0.1, 0.1, 0.15);

    const ext = selectedEcografia.filename.split('.').pop().toLowerCase();

    if (ext === "dcm") {
      fetch(`http://localhost:4000/api/uploads/${selectedEcografia.filename}`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.arrayBuffer();
        })
        .then(buffer => {
          try {
            const byteArray = new Uint8Array(buffer);
            const dataSet = dicomParser.parseDicom(byteArray);
            
            // Obtener dimensiones
            const width = dataSet.uint16('x00280011');
            const height = dataSet.uint16('x00280010');
            const bitsAllocated = dataSet.uint16('x00280100') || 16;
            const pixelRepresentation = dataSet.uint16('x00280103') || 0;
            
            // Obtener Window/Level del DICOM si existe
            let windowWidth = dataSet.uint16('x00281051');
            let windowCenter = dataSet.uint16('x00281050');
            
            // Si no tiene window/level, calcular automáticamente
            if (!windowWidth || !windowCenter) {
              windowWidth = Math.pow(2, bitsAllocated);
              windowCenter = windowWidth / 2;
            }
            
            setWindowLevel({ width: windowWidth, center: windowCenter });
            
            // Obtener pixel data
            const pixelDataElement = dataSet.elements.x7fe00010;
            let pixelData;
            
            if (bitsAllocated === 16) {
              if (pixelRepresentation === 1) {
                pixelData = new Int16Array(
                  byteArray.buffer,
                  pixelDataElement.dataOffset,
                  pixelDataElement.length / 2
                );
              } else {
                pixelData = new Uint16Array(
                  byteArray.buffer,
                  pixelDataElement.dataOffset,
                  pixelDataElement.length / 2
                );
              }
            } else {
              pixelData = new Uint8Array(
                byteArray.buffer,
                pixelDataElement.dataOffset,
                pixelDataElement.length
              );
            }
            
            // Aplicar window/level y crear canvas
            const canvas = applyWindowLevel(pixelData, width, height, windowWidth, windowCenter);
            
            // Crear textura VTK
            const actor = vtkActor.newInstance();
            const planeSource = vtkPlaneSource.newInstance({ XResolution: 1, YResolution: 1 });
            const mapper = vtkMapper.newInstance();
            mapper.setInputConnection(planeSource.getOutputPort());
            actor.setMapper(mapper);

            const texture = vtkTexture.newInstance();
            texture.setCanvas(canvas);
            texture.setInterpolate(true);
            actor.addTexture(texture);

            const aspect = width / height;
            if (aspect > 1) {
              planeSource.setOrigin(-aspect / 2, -0.5, 0);
              planeSource.setPoint1(aspect / 2, -0.5, 0);
              planeSource.setPoint2(-aspect / 2, 0.5, 0);
            } else {
              const invAspect = 1 / aspect;
              planeSource.setOrigin(-0.5, -invAspect / 2, 0);
              planeSource.setPoint1(0.5, -invAspect / 2, 0);
              planeSource.setPoint2(-0.5, invAspect / 2, 0);
            }

            renderer.addActor(actor);
            const camera = renderer.getActiveCamera();
            camera.setParallelProjection(true);
            camera.setPosition(0, 0, 1);
            camera.setFocalPoint(0, 0, 0);
            camera.setViewUp(0, 1, 0);
            renderer.resetCamera();

            const interactor = renderWindow.getInteractor();
            interactor.setInteractorStyle(vtkInteractorStyleImage.newInstance());
            
            context.current = { 
              fullScreenRenderer, 
              renderer, 
              renderWindow, 
              camera,
              pixelData,
              width,
              height,
              actor,
              texture
            };
            
            renderWindow.render();
            setLoading(false);
          } catch (err) {
            console.error("Error procesando DICOM:", err);
            setError(`Error al procesar DICOM: ${err.message}`);
            setLoading(false);
          }
        })
        .catch(err => {
          console.error("Error cargando DICOM:", err);
          setError(`Error al cargar archivo: ${err.message}`);
          setLoading(false);
        });
    } else {
      // Cargar imágenes PNG/JPG
      const actor = vtkActor.newInstance();
      const planeSource = vtkPlaneSource.newInstance({ XResolution: 1, YResolution: 1 });
      const mapper = vtkMapper.newInstance();
      mapper.setInputConnection(planeSource.getOutputPort());
      actor.setMapper(mapper);

      const texture = vtkTexture.newInstance();
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = `http://localhost:4000/api/uploads/${selectedEcografia.filename}`;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        texture.setCanvas(canvas);
        texture.setInterpolate(true);
        actor.addTexture(texture);

        const aspect = img.width / img.height;
        if (aspect > 1) {
          planeSource.setOrigin(-aspect / 2, -0.5, 0);
          planeSource.setPoint1(aspect / 2, -0.5, 0);
          planeSource.setPoint2(-aspect / 2, 0.5, 0);
        } else {
          const invAspect = 1 / aspect;
          planeSource.setOrigin(-0.5, -invAspect / 2, 0);
          planeSource.setPoint1(0.5, -invAspect / 2, 0);
          planeSource.setPoint2(-0.5, invAspect / 2, 0);
        }

        renderer.addActor(actor);
        const camera = renderer.getActiveCamera();
        camera.setParallelProjection(true);
        camera.setPosition(0, 0, 1);
        camera.setFocalPoint(0, 0, 0);
        camera.setViewUp(0, 1, 0);
        renderer.resetCamera();

        const interactor = renderWindow.getInteractor();
        interactor.setInteractorStyle(vtkInteractorStyleImage.newInstance());
        context.current = { fullScreenRenderer, renderer, renderWindow, camera };
        renderWindow.render();
        setLoading(false);
      };
      img.onerror = () => {
        setError(`No se pudo cargar la ecografía: ${selectedEcografia.filename}`);
        setLoading(false);
      };
    }

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