// src/hooks/usePatientData.js
import { useState, useEffect } from "react";

// Definición centralizada de la URL base de tu API
const API_BASE_URL = "http://localhost:4000/api"; 

/**
 * Hook personalizado para la gestión de estado de pacientes y ecografías,
 * y para manejar las interacciones con la API del backend.
 * Esta capa es agnóstica a la UI y al motor de visualización (VTK).
 */
export function usePatientData() {
    // Estado de la lista principal de pacientes
    const [pacientes, setPacientes] = useState([]);
    const [selectedPaciente, setSelectedPaciente] = useState(null);

    // Estado de la lista de ecografías (dependiente del paciente)
    const [ecografias, setEcografias] = useState([]);
    const [selectedEcografia, setSelectedEcografia] = useState(null);

    // 1. Efecto: Cargar todos los Pacientes al inicio
    useEffect(() => {
        const fetchPacientes = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/pacientes`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setPacientes(data);
            } catch (error) {
                console.error("Error fetching pacientes:", error);
                // Fallback para desarrollo si la API falla
                setPacientes([{ id: 1, nombre: "Prueba", apellido: "Paciente", uploaded_at: new Date().toISOString() }]);
            }
        };

        fetchPacientes();
    }, []); // Se ejecuta solo una vez al montar el componente

    // 2. Efecto: Cargar Ecografías del Paciente Seleccionado
    useEffect(() => {
        if (!selectedPaciente) {
            setEcografias([]);
            setSelectedEcografia(null);
            return;
        }

        const fetchEcografias = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/pacientes/${selectedPaciente.id}/ecografias`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setEcografias(data);
                
                // CRÍTICO: Asegurar que la ecografía anterior ya no esté seleccionada
                if (!data.find(ec => ec.id === selectedEcografia?.id)) {
                    setSelectedEcografia(null);
                }
            } catch (error) {
                console.error("Error fetching ecografías:", error);
                setEcografias([]);
                setSelectedEcografia(null);
            }
        };

        fetchEcografias();
    }, [selectedPaciente, selectedEcografia?.id]);

    return {
        pacientes,
        selectedPaciente,
        setSelectedPaciente,
        ecografias,
        selectedEcografia,
        setSelectedEcografia,
    };
}