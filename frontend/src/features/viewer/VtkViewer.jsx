// src/features/viewer/VtkViewer.jsx
import React, { useState } from "react";

// 1. HOOKS (Lógica)
import { usePatientData } from '../../hooks/usePatientData'; 
import { useVtkEngine } from '../../hooks/useVtkEngine'; 

// 2. COMPONENTES DE UI (Presentación)
import { ViewerUI } from '../../components/ViewerUI';
import { SelectionForm } from '../../components/SelectionForm';

/**
 * Componente principal (Orquestador) de la característica del Visor.
 * - Conecta los hooks de datos y de motor VTK.
 * - Decide qué componente de UI renderizar (Selección o Visor).
 */
function VtkViewer() {
    // 1. CAPA DE DATOS
    const dataProps = usePatientData(); 
    const { selectedEcografia } = dataProps;
    
    // ESTADO LOCAL
    const [showViewer, setShowViewer] = useState(false);

    // 2. CAPA DE VISOR: Inicializa el motor VTK.
    // El objeto vtkProps contiene loading, error, zoom, etc.
    const vtkProps = useVtkEngine(selectedEcografia); 

    // ********* LÓGICA DEL ORQUESTADOR *********
    
    // Si hay una ecografía seleccionada y el visor está abierto.
    if (showViewer && selectedEcografia) { 
        // Renderiza la interfaz del visor (ViewerUI), pasándole el objeto completo vtkProps.
        // ViewerUI es donde se utiliza realmente vtkProps.loading y vtkProps.error.
        return (
            <ViewerUI 
                ecografia={selectedEcografia} 
                onBack={() => setShowViewer(false)} 
                vtkProps={vtkProps} 
            />
        );
    }

    // RENDERIZADO DEL FORMULARIO DE SELECCIÓN
    return (
        <SelectionForm 
            {...dataProps} 
            onVisualize={() => setShowViewer(true)} 
        />
    );
}

export default VtkViewer;