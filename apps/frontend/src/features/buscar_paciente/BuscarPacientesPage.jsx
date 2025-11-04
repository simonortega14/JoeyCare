import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../../components/AppHeader.jsx";
import AppSidebar from "../../components/AppSidebar.jsx";
import "./buscarPacientes.css";

const API_BASE = import.meta.env.VITE_API_URL || ""; // ej. http://localhost

function getAuthHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Normaliza cualquier forma de neonato que devuelva ms-usuarios
function normalizeNeonato(raw) {
  return {
    id: raw.id || raw.id_neonato || raw.uuid || raw.ID || "",
    nombre: (raw.nombre || raw.nombres || "").toString(),
    apellido: (raw.apellido || raw.apellidos || "").toString(),
    documento:
      raw.documento ||
      raw.num_documento ||
      raw.numero_documento ||
      raw.identificacion ||
      "",
    sexo: raw.sexo || null,
    fecha_nacimiento: raw.fecha_nacimiento || null,
    edad_gestacional_sem:
      raw.edad_gestacional_sem ?? raw.edad_gestacional ?? null,
    edad_corregida_sem:
      raw.edad_corregida_sem ?? raw.edad_corregida ?? null,
    peso_nacimiento_g:
      raw.peso_nacimiento_g ?? raw.peso_nacimiento ?? raw.peso ?? null,
    peso_actual_g: raw.peso_actual_g ?? raw.peso_actual ?? null,
    perimetro_cefalico:
      raw.perimetro_cefalico ?? raw.pc ?? raw.perimetroCefalico ?? null,
    creado_en: raw.creado_en || null,
    actualizado_en: raw.actualizado_en || null,
  };
}

const BuscarPacientesPage = ({ onOpenSettings }) => {
  // lista completa desde el backend (copia de verdad)
  const [allNeonatos, setAllNeonatos] = useState([]);
  // selección para checkboxes
  const [selectedNeonatos, setSelectedNeonatos] = useState([]);

  // ui
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // filtros (front only)
  const [filters, setFilters] = useState({
    nombre: "",
    peso_min: "",
    peso_max: "",
    edad_gestacional_min: "",
    edad_gestacional_max: "",
    edad_corregida_min: "",
    edad_corregida_max: "",
  });

  // paginación (sobre la lista filtrada)
  const [page, setPage] = useState(1);
  const [size] = useState(12);

  const navigate = useNavigate();

  // ------------------- fetch base (sin filtros) -------------------
  const fetchAllNeonatos = async () => {
    setLoading(true);
    setError(null);
    try {
      // Traemos todo (o la página grande que tengas configurada por defecto)
      // IMPORTANTE: sin filtros en la query => filtramos en front
      const url = `${API_BASE}/api/usuarios/neonatos`;
      const resp = await fetch(url, {
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(
          `Error al obtener neonatos (${resp.status}) ${txt || ""}`.trim()
        );
      }
      const data = await resp.json();
      const lista = Array.isArray(data)
        ? data
        : Array.isArray(data.items)
        ? data.items
        : [];
      setAllNeonatos(lista.map(normalizeNeonato));
      setPage(1); // al refrescar, vuelve a la primera página
    } catch (err) {
      setError(err.message || "Error desconocido");
      setAllNeonatos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllNeonatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------- helpers de filtro -------------------
  const toNum = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const matchTexto = (val, query) => {
    if (!query) return true;
    if (!val) return false;
    return val.toString().toLowerCase().includes(query.toLowerCase());
  };

  // ------------------- aplicar filtros (memorizado) -------------------
  const filteredNeonatos = useMemo(() => {
    const f = filters;

    const pesoMin = toNum(f.peso_min);
    const pesoMax = toNum(f.peso_max);

    const egMin = toNum(f.edad_gestacional_min);
    const egMax = toNum(f.edad_gestacional_max);

    const ecMin = toNum(f.edad_corregida_min);
    const ecMax = toNum(f.edad_corregida_max);

    return allNeonatos.filter((n) => {
      // nombre/apellido
      const okNombre =
        matchTexto(n.nombre, f.nombre) || matchTexto(n.apellido, f.nombre);

      // peso nacimiento
      const p = toNum(n.peso_nacimiento_g);
      const okPesoMin = pesoMin === null || (p !== null && p >= pesoMin);
      const okPesoMax = pesoMax === null || (p !== null && p <= pesoMax);

      // edad gestacional
      const eg = toNum(n.edad_gestacional_sem);
      const okEgMin = egMin === null || (eg !== null && eg >= egMin);
      const okEgMax = egMax === null || (eg !== null && eg <= egMax);

      // edad corregida
      const ec = toNum(n.edad_corregida_sem);
      const okEcMin = ecMin === null || (ec !== null && ec >= ecMin);
      const okEcMax = ecMax === null || (ec !== null && ec <= ecMax);

      return okNombre && okPesoMin && okPesoMax && okEgMin && okEgMax && okEcMin && okEcMax;
    });
  }, [allNeonatos, filters]);

  // ------------------- paginación sobre la lista filtrada -------------------
  const total = filteredNeonatos.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const currentPage = Math.min(page, totalPages);
  const pageSliceStart = (currentPage - 1) * size;
  const pageSliceEnd = pageSliceStart + size;
  const neonatosPage = filteredNeonatos.slice(pageSliceStart, pageSliceEnd);

  // Si cambian filtros, vuelve a la página 1
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // ------------------- handlers UI -------------------
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // “Buscar” ahora refresca desde backend (por si hubo altas/bajas),
  // pero el filtrado sigue en front.
  const handleSearch = () => {
    fetchAllNeonatos();
  };

  const handleViewDetails = (neonatoId) => {
    navigate(`/neonato/${neonatoId}`);
  };

  const handleNeonatoSelect = (neonato) => {
    setSelectedNeonatos((prev) => {
      const isSelected = prev.some((p) => p.id === neonato.id);
      if (isSelected) return prev.filter((p) => p.id !== neonato.id);
      if (prev.length < 2) return [...prev, neonato];
      return prev;
    });
  };

  const handleCompareSelected = () => {
    if (selectedNeonatos.length === 2) {
      const [a, b] = selectedNeonatos;
      navigate("/seleccionar-ecografias", {
        state: {
          neonatoAId: String(a.id),
          neonatoBId: String(b.id),
        },
      });
    }
  };

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  // ------------------- render -------------------
  return (
    <div className="page-container">
      <AppHeader onOpenSettings={onOpenSettings} />
      <AppSidebar activeItem="Buscar Pacientes" />

      <div className="buscar-pacientes-content">
        <div className="buscar-pacientes-header">
          <h1>Buscar Neonatos</h1>
          <div className="filters-container">
            <div className="filter-group">
              <label>Nombre:</label>
              <input
                type="text"
                name="nombre"
                value={filters.nombre}
                onChange={handleFilterChange}
                placeholder="Buscar por nombre o apellido"
              />
            </div>

            <div className="filter-group">
              <label>Peso nacimiento (g):</label>
              <input
                type="number"
                name="peso_min"
                value={filters.peso_min}
                onChange={handleFilterChange}
                placeholder="Mínimo"
              />
              <input
                type="number"
                name="peso_max"
                value={filters.peso_max}
                onChange={handleFilterChange}
                placeholder="Máximo"
              />
            </div>

            <div className="filter-group">
              <label>Edad Gestacional (sem):</label>
              <input
                type="number"
                name="edad_gestacional_min"
                value={filters.edad_gestacional_min}
                onChange={handleFilterChange}
                placeholder="Mínimo"
              />
              <input
                type="number"
                name="edad_gestacional_max"
                value={filters.edad_gestacional_max}
                onChange={handleFilterChange}
                placeholder="Máximo"
              />
            </div>

            <div className="filter-group">
              <label>Edad Corregida (sem):</label>
              <input
                type="number"
                name="edad_corregida_min"
                value={filters.edad_corregida_min}
                onChange={handleFilterChange}
                placeholder="Mínimo"
              />
              <input
                type="number"
                name="edad_corregida_max"
                value={filters.edad_corregida_max}
                onChange={handleFilterChange}
                placeholder="Máximo"
              />
            </div>

            <button onClick={handleSearch} className="search-btn">
              Refrescar
            </button>

            {selectedNeonatos.length === 2 && (
              <button onClick={handleCompareSelected} className="compare-btn">
                Comparar seleccionados ({selectedNeonatos.length}/2)
              </button>
            )}
          </div>
        </div>

        {loading && <div className="loading">Cargando neonatos...</div>}
        {error && <div className="error">Error: {error}</div>}

        <div className="pacientes-grid">
          {neonatosPage.map((neonato, index) => (
            <div key={neonato.id || index} className="paciente-card">
              <div className="paciente-image-container">
                <input
                  type="checkbox"
                  checked={selectedNeonatos.some((p) => p.id === neonato.id)}
                  onChange={() => handleNeonatoSelect(neonato)}
                  className="paciente-checkbox"
                />
                <div className="logo-placeholder paciente-logo">N</div>
              </div>
              <div className="paciente-info">
                <h3 className="paciente-name-id">
                  {neonato.nombre} {neonato.apellido} - {neonato.documento}
                </h3>
                <div className="paciente-details">
                  <div className="detail-item">
                    <span className="detail-label">Peso nacimiento</span>
                    <span className="detail-value">
                      {neonato.peso_nacimiento_g ?? "N/A"} g
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Peso actual</span>
                    <span className="detail-value">
                      {neonato.peso_actual_g ?? "N/A"} g
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Edad gestacional</span>
                    <span className="detail-value">
                      {neonato.edad_gestacional_sem ?? "N/A"} semanas
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Edad corregida</span>
                    <span className="detail-value">
                      {neonato.edad_corregida_sem ?? "N/A"} semanas
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Perímetro cefálico</span>
                    <span className="detail-value">
                      {neonato.perimetro_cefalico ?? "N/A"} cm
                    </span>
                  </div>
                </div>
                <button
                  className="view-paciente-btn"
                  onClick={() => handleViewDetails(neonato.id)}
                >
                  Ver detalles
                </button>
              </div>
            </div>
          ))}
        </div>

        {!loading && neonatosPage.length === 0 && (
          <div className="no-results">
            <p>No se encontraron neonatos que coincidan con los filtros.</p>
          </div>
        )}

        {/* Paginación (sobre lista filtrada) */}
        <div className="paginacion">
          <button disabled={!canGoPrev} onClick={() => setPage((p) => p - 1)}>
            ← Anterior
          </button>
          <span>
            Página {currentPage} de {totalPages}
          </span>
          <button disabled={!canGoNext} onClick={() => setPage((p) => p + 1)}>
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuscarPacientesPage;
