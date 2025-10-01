
import React, { useState, useEffect } from 'react';
import './DashboardPage.css';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalStudies: 0,
    neonatalPatients: 0,
    todayScans: 0,
    averageTime: 0
  });

  const [isLoading, setIsLoading] = useState(true);

  // Simular carga de datos
  useEffect(() => {
    const loadDashboardData = () => {
      setTimeout(() => {
        setStats({
          totalStudies: 1247,
          neonatalPatients: 342,
          todayScans: 23,
          averageTime: 15
        });
        setIsLoading(false);
      }, 1000);
    };

    loadDashboardData();
  }, []);

  // Datos para gráficos
  const recentActivity = [
    { time: '09:15', patient: 'Bebé García', study: 'Ecografía Transfontanelar', status: 'Completado' },
    { time: '10:30', patient: 'Neonato López', study: 'Control Semanal', status: 'En Proceso' },
    { time: '11:45', patient: 'Bebé Martínez', study: 'Primera Evaluación', status: 'Programado' },
    { time: '13:20', patient: 'Prematuro Silva', study: 'Seguimiento', status: 'Completado' }
  ];

  const weeklyStats = [
    { day: 'Lun', scans: 18 },
    { day: 'Mar', scans: 24 },
    { day: 'Mié', scans: 31 },
    { day: 'Jue', scans: 27 },
    { day: 'Vie', scans: 23 },
    { day: 'Sáb', scans: 15 },
    { day: 'Dom', scans: 8 }
  ];

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
            <p className="stat-number">{stats.totalStudies.toLocaleString()}</p>
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
            {recentActivity.map((activity, index) => (
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
            ))}
          </div>
        </div>

        {/* Estadísticas Semanales */}
        <div className="dashboard-section">
          <h2>📈 Ecografías por Día</h2>
          <div className="weekly-chart">
            {weeklyStats.map((stat, index) => (
              <div key={index} className="chart-bar">
                <div 
                  className="bar-fill" 
                  style={{ height: `${(stat.scans / 35) * 100}%` }}
                ></div>
                <span className="bar-value">{stat.scans}</span>
                <span className="bar-label">{stat.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Accesos Rápidos */}
      <section className="quick-actions">
        <h2>🚀 Acciones Rápidas</h2>
        <div className="actions-grid">
          <button className="action-btn action-primary">
            <span>📊</span>
            <div>
              <strong>Estadísticas Detalladas</strong>
              <small>Ver reportes completos</small>
            </div>
          </button>
          
          <button className="action-btn action-success">
            <span>📝</span>
            <div>
              <strong>Generar Reporte</strong>
              <small>Exportar datos médicos</small>
            </div>
          </button>
          
          <button className="action-btn action-warning">
            <span>⚙️</span>
            <div>
              <strong>Configuración</strong>
              <small>Ajustes del sistema</small>
            </div>
          </button>
          
          <button className="action-btn action-info">
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
