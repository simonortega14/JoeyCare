// src/components/SelectionForm.jsx
import React from 'react';
// Asume que los estilos están en una ubicación accesible
import '../features/viewer/viewer.css'; 

/**
 * Componente de UI para la selección de Pacientes y Ecografías.
 * Es un componente de presentación; no contiene lógica de fetch ni estado.
 */
export function SelectionForm({ 
    pacientes, 
    selectedPaciente, 
    setSelectedPaciente, 
    ecografias, 
    setSelectedEcografia, 
    selectedEcografia, 
    onVisualize 
}) {
    
    // Handler para la selección de paciente
    const handlePatientChange = (e) => {
        const patientId = parseInt(e.target.value);
        const patient = pacientes.find(p => p.id === patientId);
        // Llama al setter del hook de datos
        setSelectedPaciente(patient || null);
        // La deselección de la ecografía la maneja usePatientData, pero la forzamos aquí por precaución.
        setSelectedEcografia(null);
    };

    // Handler para la selección de ecografía
    const handleEcografiaChange = (e) => {
        const ecografiaId = parseInt(e.target.value);
        const ecografia = ecografias.find(ec => ec.id === ecografiaId);
        // Llama al setter del hook de datos
        setSelectedEcografia(ecografia || null);
    };

    return (
        <div className="vtk-page-container">
            <div className="vtk-selection-wrapper">
                <h2 className="vtk-main-title">Visualizar Ecografías</h2>

                {/* Sección de Selección de Paciente */}
                <div className="vtk-form-section">
                    <label className="vtk-form-label">Seleccionar Paciente:</label>
                    <select
                        className="vtk-form-select"
                        value={selectedPaciente?.id || ""}
                        onChange={handlePatientChange}
                        disabled={pacientes.length === 0}
                    >
                        <option value="">-- Selecciona un paciente --</option>
                        {pacientes.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.nombre} {p.apellido} (ID: {p.id})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Sección de Selección de Ecografía (solo si hay paciente seleccionado) */}
                {selectedPaciente && (
                    <div className="vtk-form-section">
                        <label className="vtk-form-label">Seleccionar Ecografía:</label>
                        <select
                            className="vtk-form-select"
                            value={selectedEcografia?.id || ""}
                            onChange={handleEcografiaChange}
                            disabled={ecografias.length === 0}
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

                {/* Botón de Visualización (solo si hay ecografía seleccionada) */}
                {selectedEcografia && (
                    <div className="vtk-form-section">
                        <button className="vtk-visualize-button" onClick={onVisualize}>
                            Visualizar Ecografía
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}