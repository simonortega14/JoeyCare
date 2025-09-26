import { useRef, useEffect, useState } from "react";
import "@kitware/vtk.js/Rendering/Profiles/All";
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkPlaneSource from "@kitware/vtk.js/Filters/Sources/PlaneSource";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkTexture from "@kitware/vtk.js/Rendering/Core/Texture";
import "./viewer.css";

function VtkViewer() {
  const vtkContainerRef = useRef(null);
  const context = useRef(null);

  const [pacientes, setPacientes] = useState([]);
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [ecografias, setEcografias] = useState([]);
  const [selectedEcografia, setSelectedEcografia] = useState(null);
  const [showViewer, setShowViewer] = useState(false);

  // Cargar pacientes
  useEffect(() => {
    fetch("http://localhost:4000/api/pacientes")
      .then(res => res.json())
      .then(setPacientes)
      .catch(() => setPacientes([{ id: 1, nombre: "Prueba", apellido: "Paciente" }]));
  }, []);

  // Cargar ecografías del paciente
  useEffect(() => {
    if (!selectedPaciente) return setEcografias([]);

    fetch(`http://localhost:4000/api/pacientes/${selectedPaciente.id}/ecografias`)
      .then(res => res.json())
      .then(setEcografias)
      .catch(() => setEcografias([]));
  }, [selectedPaciente]);

  // Renderizar ecografía con VTK
  useEffect(() => {
    if (!showViewer || !selectedEcografia || !vtkContainerRef.current) return;

    // Limpiar contexto previo
    if (context.current) {
      context.current.fullScreenRenderer.delete();
      context.current = null;
    }

    const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
      rootContainer: vtkContainerRef.current,
      containerStyle: { width: "100%", height: "100%", position: "relative" },
    });

    const renderer = fullScreenRenderer.getRenderer();
    const renderWindow = fullScreenRenderer.getRenderWindow();
    
    // Fondo más elegante
    renderer.setBackground(0.1, 0.1, 0.15);

    const planeSource = vtkPlaneSource.newInstance({ XResolution: 1, YResolution: 1 });
    const mapper = vtkMapper.newInstance();
    mapper.setInputConnection(planeSource.getOutputPort());

    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);

    const texture = vtkTexture.newInstance();
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `http://localhost:4000/uploads/${selectedEcografia.filename}`;

    img.onload = () => {
      try {
        // Crear canvas para mejor procesamiento
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Usar canvas en lugar de imagen directa
        texture.setCanvas(canvas);
        texture.setInterpolate(true);
        
        actor.addTexture(texture);

        // Configurar material
        const property = actor.getProperty();
        property.setDiffuse(1.0);
        property.setAmbient(0.1);
        property.setSpecular(0.0);

        // Ajuste de plano según proporción de la imagen
        const aspect = img.width / img.height;
        if (aspect > 1) {
          planeSource.setOrigin(-aspect/2, -0.5, 0);
          planeSource.setPoint1(aspect/2, -0.5, 0);
          planeSource.setPoint2(-aspect/2, 0.5, 0);
        } else {
          const invAspect = 1/aspect;
          planeSource.setOrigin(-0.5, -invAspect/2, 0);
          planeSource.setPoint1(0.5, -invAspect/2, 0);
          planeSource.setPoint2(-0.5, invAspect/2, 0);
        }

        renderer.addActor(actor);
        
        // Configurar cámara
        const camera = renderer.getActiveCamera();
        camera.setPosition(0, 0, 1);
        camera.setFocalPoint(0, 0, 0);
        camera.setViewUp(0, 1, 0);
        
        renderer.resetCamera();
        renderWindow.render();
        
        console.log("Ecografía renderizada exitosamente");
      } catch (error) {
        console.error("Error procesando la imagen:", error);
        alert("Error al procesar la imagen para visualización");
      }
    };

    img.onerror = (err) => {
      console.error("Error cargando ecografía:", err);
      alert(`No se pudo cargar la ecografía: ${selectedEcografia.filename}`);
    };

    context.current = { fullScreenRenderer, renderer, renderWindow };

    return () => {
      if (context.current) {
        context.current.fullScreenRenderer.delete();
        context.current = null;
      }
    };
  }, [showViewer, selectedEcografia]);

  // Modo visualización completa
  if (showViewer) {
    return (
      <div className="vtk-fullscreen">
        <button
          className="vtk-back-button"
          onClick={() => setShowViewer(false)}
        >
          ← Volver
        </button>
        <div ref={vtkContainerRef} className="vtk-viewer-canvas" />
      </div>
    );
  }

  // Interfaz de selección
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
              <p style={{ 
                color: '#6c757d', 
                fontStyle: 'italic', 
                marginTop: '0.5rem',
                fontSize: '0.9rem'
              }}>
                No hay ecografías disponibles para este paciente
              </p>
            )}
          </div>
        )}

        {selectedEcografia && (
          <div className="vtk-form-section">
            <button 
              className="vtk-visualize-button"
              onClick={() => setShowViewer(true)}
            >
              Visualizar Ecografía
            </button>
          </div>
        )}

        {/* Información seleccionada */}
        {selectedPaciente && (
          <div style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: 'rgba(248, 249, 250, 0.8)',
            borderRadius: '15px',
            border: '1px solid rgba(222, 226, 230, 0.5)'
          }}>
            <h4 style={{ 
              margin: '0 0 1rem 0', 
              color: '#495057',
              fontSize: '1.1rem'
            }}>
              Información Seleccionada:
            </h4>
            <div style={{ color: '#6c757d' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Paciente:</strong> {selectedPaciente.nombre} {selectedPaciente.apellido}
              </div>
              {selectedEcografia && (
                <>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Archivo:</strong> {selectedEcografia.filename}
                  </div>
                  <div>
                    <strong>Fecha:</strong> {new Date(selectedEcografia.uploaded_at).toLocaleDateString()}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VtkViewer;