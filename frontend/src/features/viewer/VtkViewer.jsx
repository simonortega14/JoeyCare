// src/features/viewer/VtkViewer.jsx
import React, { useState, useRef } from "react";

// 1. HOOKS (Lógica)
import { usePatientData } from "../../hooks/usePatientData";
import { useCornerstoneViewer } from "../../hooks/useCornerstoneViewer";
import { useVtkEngine } from "../../hooks/useVtkEngine";

// 2. COMPONENTES DE UI (Presentación)
import { ViewerUI } from "../../components/ViewerUI";
import { SelectionForm } from "../../components/SelectionForm";

/**
 * Componente principal (Orquestador) del visor de imágenes médicas.
 * - Conecta el hook de datos del paciente, el lector de imagen (CornerstoneReader)
 *   y el motor de renderizado VTK (useVtkEngine).
 */
function VtkViewer() {
  // 1️⃣ Datos de paciente y ecografía seleccionada
  const dataProps = usePatientData();
  const { selectedEcografia } = dataProps;

  // 2️⃣ Estado local para controlar si el visor está visible
  const [showViewer, setShowViewer] = useState(false);

  // 3️⃣ Hook del lector de imagen (usa fetch y decodifica DICOM / PNG / JPG)
  const { vtkImageData, loading, error } = useCornerstoneViewer(selectedEcografia);

  // 4️⃣ Referencia al contenedor donde se montará VTK
  const containerRef = useRef(null);

  // 5️⃣ Inicializa motor VTK (solo si hay imagen lista)
  useVtkEngine(vtkImageData, containerRef);

  // 6️⃣ Render lógico
  if (showViewer && selectedEcografia) {
    return (
      <ViewerUI
        ecografia={selectedEcografia}
        onBack={() => setShowViewer(false)}
        vtkProps={{
          loading,
          error,
          containerRef, // para que ViewerUI pueda acceder si es necesario
        }}
      >
        {/* Contenedor donde se renderiza VTK */}
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "black",
          }}
        />
      </ViewerUI>
    );
  }

  // Si aún no se está visualizando, muestra el formulario de selección
  return (
    <SelectionForm
      {...dataProps}
      onVisualize={() => setShowViewer(true)}
    />
  );
}

export default VtkViewer;