
import React, { useState, useEffect } from 'react';
import './dashBoardPage.css';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalStudies: 0,
    neonatalPatients: 0,
    todayScans: 0,
    averageTime: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState([]);
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
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Fallback a datos simulados si hay error
        setStats({
          totalStudies: 1247,
          neonatalPatients: 342,
          todayScans: 23,
          averageTime: 15
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
            <h3>Estudios Totales</h3>
            <p className="stat-number">{stats.totalStudies?.toLocaleString() || '0'}</p>
            <span className="stat-change positive">+12% este mes</span>
          </div>
        </div>
        
        <div className="stat-card stat-success">
          <div className="stat-icon">👶</div>
          <div className="stat-content">
            <h3>Pacientes Neonatos</h3>
            <p className="stat-number">{stats.neonatalPatients}</p>
            <span className="stat-change positive">+8 esta semana</span>
          </div>
        </div>
        
        <div className="stat-card stat-warning">
          <div className="stat-icon">🔬</div>
          <div className="stat-content">
            <h3>Ecografías Hoy</h3>
            <p className="stat-number">{stats.todayScans}</p>
            <span className="stat-change neutral">Objetivo: 25</span>
          </div>
        </div>
        
        <div className="stat-card stat-info">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <h3>Tiempo Promedio</h3>
            <p className="stat-number">{stats.averageTime} min</p>
            <span className="stat-change positive">-2 min vs ayer</span>
          </div>
        </div>
      </section>

      {/* Contenido Principal del Dashboard */}
      <div className="dashboard-main">
        {/* Actividad Reciente */}
        <div className="dashboard-section">
          <h2>📋 Actividad Reciente</h2>
          <div className="activity-list">
            {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
              <div key={index} className={`activity-item status-${activity.status.toLowerCase().replace(' ', '-')}`}>
                <div className="activity-time">{activity.time}</div>
                <div className="activity-details">
                  <strong>{activity.patient}</strong>
                  <span>{activity.study}</span>
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
          <button className="action-btn action-primary" onClick={() => window.open('/dashboard/stats', '_blank')}>
            <span>📊</span>
            <div>
              <strong>Estadísticas Detalladas</strong>
              <small>Ver reportes completos</small>
            </div>
          </button>

          <button className="action-btn action-success" onClick={() => window.open('/dashboard/reports', '_blank')}>
            <span>📝</span>
            <div>
              <strong>Generar Reporte</strong>
              <small>Exportar datos médicos</small>
            </div>
          </button>

          <button className="action-btn action-warning" onClick={() => window.open('/settings', '_blank')}>
            <span>⚙️</span>
            <div>
              <strong>Configuración</strong>
              <small>Ajustes del sistema</small>
            </div>
          </button>

          <button className="action-btn action-info" onClick={() => window.location.href = '/buscar-paciente'}>
            <span>🔍</span>
            <div>
              <strong>Buscar Estudios</strong>
              <small>Localizar pacientes</small>
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
