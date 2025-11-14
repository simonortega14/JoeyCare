
import React, { useState, useEffect } from 'react';
import './dashBoardPage.css';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalStudies: 0,
    neonatalPatients: 0,
    todayScans: 0,
    lowBirthWeight: 0,
    prematurePatients: 0,
    pendingReports: 0,
    signedReportsToday: 0,
    patientsNeedingFollowup: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState([]);
  const [patientsWithoutUltrasound, setPatientsWithoutUltrasound] = useState([]);
  const [ultrasoundsWithoutReports, setUltrasoundsWithoutReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar datos reales del backend
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const statsResponse = await fetch('http://localhost:4000/api/dashboard/stats');

        if (statsResponse.ok) {
          const data = await statsResponse.json();
          setStats(data.stats);
          setRecentActivity(data.recentActivity);
          setWeeklyStats(data.weeklyStats);
          setPatientsWithoutUltrasound(data.patientsWithoutUltrasound || []);
          setUltrasoundsWithoutReports(data.ultrasoundsWithoutReports || []);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Fallback a datos simulados si hay error
        setStats({
          totalStudies: 1247,
          neonatalPatients: 342,
          todayScans: 23,
          lowBirthWeight: 89,
          prematurePatients: 156,
          pendingReports: 12,
          signedReportsToday: 8,
          patientsNeedingFollowup: 45
        });
        setRecentActivity([
          { time: '09:15', patient: 'Bebé García', study: 'Ecografía Transfontanelar', status: 'Completado' },
          { time: '10:30', patient: 'Neonato López', study: 'Control Semanal', status: 'En Proceso' },
          { time: '11:45', patient: 'Bebé Martínez', study: 'Primera Evaluación', status: 'Programado' },
          { time: '13:20', patient: 'Prematuro Silva', study: 'Seguimiento', status: 'Completado' }
        ]);
        setWeeklyStats([
          { day: 'Lun', scans: 18 },
          { day: 'Mar', scans: 24 },
          { day: 'Mié', scans: 31 },
          { day: 'Jue', scans: 27 },
          { day: 'Vie', scans: 23 },
          { day: 'Sáb', scans: 15 },
          { day: 'Dom', scans: 8 }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);


  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header del Dashboard */}
      <header className="dashboard-header">
        <div className="dashboard-title">
          <h1>🏥 Dashboard - Fundación Canguro</h1>
          <p>Sistema PACS - Ecografías Transfontanelares</p>
        </div>
        <div className="dashboard-date">
          <span>📅 {new Date().toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
      </header>

      {/* Cards de Estadísticas Principales */}
      <section className="stats-grid">
      <div className="stat-card stat-primary">
        <div className="stat-icon">📊</div>
        <div className="stat-content">
          <h3>Estudios Realizados</h3>
          <p className="stat-number">{stats.totalStudies?.toLocaleString() || '0'}</p>
          <span className="stat-change positive">Total acumulado</span>
        </div>
      </div>

      <div className="stat-card stat-success">
        <div className="stat-icon">👶</div>
        <div className="stat-content">
          <h3>Pacientes Atendidos</h3>
          <p className="stat-number">{stats.neonatalPatients}</p>
          <span className="stat-change positive">Pacientes únicos</span>
        </div>
      </div>

      <div className="stat-card stat-warning">
        <div className="stat-icon">🔬</div>
        <div className="stat-content">
          <h3>Ecografías Hoy</h3>
          <p className="stat-number">{stats.todayScans}</p>
          <span className="stat-change neutral">Realizadas hoy</span>
        </div>
      </div>

      <div className="stat-card stat-info">
        <div className="stat-icon">⚕️</div>
        <div className="stat-content">
          <h3>Bajo Peso Nacimiento</h3>
          <p className="stat-number">{stats.lowBirthWeight}</p>
          <span className="stat-change warning">{'<'} 2500g</span>
        </div>
      </div>

      <div className="stat-card stat-danger">
        <div className="stat-icon">🚨</div>
        <div className="stat-content">
          <h3>Pacientes Prematuros</h3>
          <p className="stat-number">{stats.prematurePatients}</p>
          <span className="stat-change warning">{'<'} 37 semanas</span>
        </div>
      </div>

      <div className="stat-card stat-warning">
        <div className="stat-icon">👁️</div>
        <div className="stat-content">
          <h3>Requieren Seguimiento</h3>
          <p className="stat-number">{stats.patientsNeedingFollowup}</p>
          <span className="stat-change warning">{'>'} 7 días sin eco</span>
        </div>
      </div>
    </section>


      {/* Pacientes sin Ecografías */}
      {patientsWithoutUltrasound.length > 0 && (
        <section className="patients-without-ultrasound">
          <h2>⚠️ Pacientes Sin Ecografías</h2>
          <div className="patients-alert-grid">
            {patientsWithoutUltrasound.map((patient, index) => (
              <div key={index} className="patient-alert-card">
                <div className="patient-alert-header">
                  <strong>{patient.nombre} {patient.apellido}</strong>
                  <span className="patient-document">Doc: {patient.documento}</span>
                </div>
                <div className="patient-alert-details">
                  <span>Nacido: {new Date(patient.fecha_nacimiento).toLocaleDateString('es-ES')}</span>
                  <span>Días de vida: {patient.dias_vida}</span>
                  {patient.edad_gestacional_sem && (
                    <span>Edad gestacional: {patient.edad_gestacional_sem} sem</span>
                  )}
                  {patient.peso_nacimiento_g && (
                    <span>Peso nacimiento: {patient.peso_nacimiento_g}g</span>
                  )}
                </div>
                <button
                  className="upload-btn"
                  onClick={() => window.location.href = `/cargar-ecografias?patient=${patient.id}`}
                >
                  📤 Subir Ecografía
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ecografías sin reportes */}
      {ultrasoundsWithoutReports.length > 0 && (
        <section className="ultrasounds-without-reports">
          <h2>⚠️ Pacientes Con Ecografías Sin Revisión</h2>
          <div className="patients-alert-grid">
            {ultrasoundsWithoutReports.map((ultrasound, index) => (
              <div key={index} className="patient-alert-card">
                <div className="patient-alert-header">
                  <strong>{ultrasound.nombre} {ultrasound.apellido}</strong>
                  <span className="patient-document">Doc: {ultrasound.documento}</span>
                </div>
                <div className="patient-alert-details">
                  <span>Fecha ecografía: {new Date(ultrasound.fecha_hora).toLocaleDateString('es-ES')}</span>
                  <span>Días de vida: {ultrasound.dias_vida}</span>
                  <span>Archivo: {ultrasound.filepath}</span>
                </div>
                <button
                  className="upload-btn"
                  onClick={() => window.location.href = `/visualizar-ecografias?patient=${ultrasound.neonato_id}&file=${ultrasound.filepath}`}
                >
                  👁️ Ver Ecografía
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Contenido Principal del Dashboard */}
      <div className="dashboard-main">
        {/* Actividad Reciente */}
        <div className="dashboard-section">
          <h2>📋 Actividad Reciente</h2>
          <div className="activity-list">
            {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
              <div
                key={index}
                className={`activity-item status-${activity.status.toLowerCase().replace(' ', '-')} clickable`}
                onClick={() => window.location.href = `/visualizar-ecografias?patient=${activity.patient_id}&file=${activity.filename}`}
                style={{ cursor: 'pointer' }}
              >
                <div className="activity-time">{activity.time}</div>
                <div className="activity-details">
                  <strong>{activity.patient}</strong>
                  <span>{activity.study}</span>
                  <small style={{ color: '#666', fontSize: '0.8rem' }}>
                    {activity.gestational_age ? `${activity.gestational_age} sem gestacional` : ''}
                    {activity.birth_weight ? ` • ${activity.birth_weight}g nacimiento` : ''}
                  </small>
                </div>
                <div className={`activity-status status-${activity.status.toLowerCase().replace(' ', '-')}`}>
                  {activity.status}
                </div>
              </div>
            )) : (
              <p>No hay actividad reciente</p>
            )}
          </div>
        </div>

        {/* Estadísticas Semanales */}
        <div className="dashboard-section">
          <h2>📈 Ecografías por Día</h2>
          <div className="weekly-chart">
            {weeklyStats.length > 0 ? weeklyStats.map((stat, index) => (
              <div key={index} className="chart-bar">
                <div
                  className="bar-fill"
                  style={{ height: `${(stat.scans / Math.max(...weeklyStats.map(s => s.scans), 35)) * 100}%` }}
                ></div>
                <span className="bar-value">{stat.scans}</span>
                <span className="bar-label">{stat.day}</span>
              </div>
            )) : (
              <p>No hay datos semanales disponibles</p>
            )}
          </div>
        </div>
      </div>

      {/* Accesos Rápidos */}
      <section className="quick-actions">
      <h2>🚀 Acciones Rápidas</h2>
      <div className="actions-grid">
        <button className="action-btn action-primary" onClick={() => window.location.href = '/buscar-pacientes'}>
          <span>🔍</span>
          <div>
            <strong>Buscar Pacientes</strong>
            <small>Localizar y gestionar</small>
          </div>
        </button>

        <button className="action-btn action-success" onClick={() => window.location.href = '/cargar-ecografias'}>
          <span>📤</span>
          <div>
            <strong>Cargar Ecografía</strong>
            <small>Subir nueva imagen</small>
          </div>
        </button>

        <button className="action-btn action-warning" onClick={() => window.location.href = '/visualizar-ecografias'}>
          <span>👁️</span>
          <div>
            <strong>Visualizar Estudios</strong>
            <small>Ver ecografías existentes</small>
          </div>
        </button>
      </div>
    </section>


      {/* Footer con información adicional */}
      <footer className="dashboard-footer">
        <div className="footer-info">
          <p>🏥 <strong>Fundación Canguro</strong> • Sistema PACS v2.1 • Última actualización: {new Date().toLocaleTimeString()}</p>
        </div>
      </footer>
    </div>
  );
}
