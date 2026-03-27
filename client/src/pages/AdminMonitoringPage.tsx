import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import healthService, { type HealthData } from '../services/healthService';
import './AdminMonitoringPage.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const AdminMonitoringPage: React.FC = () => {
  const { isAdmin, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  // Refresh state
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number>(0);
  const REFRESH_INTERVAL_SECONDS = 30;

  // Verify auth
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate]);

  const fetchHealthData = async () => {
    try {
      const data = await healthService.getDetailedHealth();
      setHealthData(data);
      setError('');
      setSecondsSinceUpdate(0);
    } catch (err: any) {
      setError(err.message || 'Error fetching health data');
    } finally {
      if (loading) setLoading(false);
    }
  };

  // Initial fetch and 30s interval
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;

    fetchHealthData();

    const dataInterval = setInterval(() => {
      fetchHealthData();
    }, REFRESH_INTERVAL_SECONDS * 1000);

    return () => clearInterval(dataInterval);
  }, [isAuthenticated, isAdmin]);

  // Tick counter for "updated X seconds ago"
  useEffect(() => {
    const tickInterval = setInterval(() => {
      setSecondsSinceUpdate(prev => prev + 1);
    }, 1000);

    return () => clearInterval(tickInterval);
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${Math.floor(seconds % 60)}s`);

    return parts.join(' ');
  };

  const getStatusColorClass = (status: string) => {
    if (status === 'OK' || status === 'Connected' || status === 'Configured') return 'success';
    if (status === 'DEGRADED') return 'warning';
    return 'error';
  };

  const renderMemoryProgressBar = () => {
    if (!healthData?.memory) return null;

    const usedMb = parseInt(healthData.memory.used);
    const totalMb = parseInt(healthData.memory.total);
    const percentage = totalMb > 0 ? (usedMb / totalMb) * 100 : 0;

    let barColorClass = 'bg-success';
    if (percentage > 75) barColorClass = 'bg-warning';
    if (percentage > 90) barColorClass = 'bg-danger';

    return (
      <div className="memory-progress-container mt-3">
        <div className="progress" style={{ height: '20px' }}>
          <div 
            className={`progress-bar ${barColorClass}`} 
            role="progressbar" 
            style={{ width: `${percentage}%` }} 
            aria-valuenow={percentage} 
            aria-valuemin={0} 
            aria-valuemax={100}
          >
            {percentage.toFixed(1)}%
          </div>
        </div>
        <div className="memory-labels">
          <span>Used: {healthData.memory.used}</span>
          <span>External: {healthData.memory.external}</span>
          <span>Total: {healthData.memory.total}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="monitoring-management" data-theme="light">
      <header className="monitoring-header-bar">
        <div className="header-content">
          <div className="header-left">
            <i className="bi bi-activity header-icon"></i>
            <span className="header-title">System Monitoring</span>
          </div>
          <div className="header-center">
            <span className="logo-japanese">箱</span><span className="brand-text">hako</span>
          </div>
          <div className="header-right">
            <Link to="/admin" className="back-link">
              <i className="bi bi-arrow-left-circle header-icon"></i>
            </Link>
          </div>
        </div>
      </header>

      <main className="monitoring-main-content">
        <div className="container">

          <div className="refresh-bar-container">
            <span className="refresh-text">
              <i className="bi bi-clock-history me-2"></i>
              Last updated: {secondsSinceUpdate} seconds ago
            </span>
            <button className="btn btn-outline-primary btn-sm" onClick={fetchHealthData}>
              <i className="bi bi-arrow-clockwise me-1"></i> Refresh Now
            </button>
          </div>

          {error && (
            <div className="alert alert-danger mb-4">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </div>
          )}

          {loading ? (
             <div className="loading-container">
               <div className="spinner-border text-primary" role="status">
                 <span className="visually-hidden">Loading...</span>
               </div>
               <p>Fetching health data...</p>
             </div>
          ) : healthData ? (
            <div className="row g-4">
              
              {/* Server Status Card */}
              <div className="col-12 col-md-6">
                <div className="monitoring-card">
                  <div className="monitoring-card-header">
                    <i className="bi bi-server"></i>
                    <h3>Server Status</h3>
                  </div>
                  <div className="monitoring-card-body">
                    <div className="monitoring-data-row">
                      <span className="monitoring-data-label">Status</span>
                      <span className="monitoring-data-value">
                        <span className={`status-indicator ${getStatusColorClass(healthData.status)}`}></span>
                        {healthData.status}
                      </span>
                    </div>
                    <div className="monitoring-data-row">
                      <span className="monitoring-data-label">Uptime</span>
                      <span className="monitoring-data-value">{formatUptime(healthData.uptime)}</span>
                    </div>
                    <div className="monitoring-data-row">
                      <span className="monitoring-data-label">Environment</span>
                      <span className="monitoring-data-value text-capitalize">{healthData.environment}</span>
                    </div>
                    <div className="monitoring-data-row">
                      <span className="monitoring-data-label">Version</span>
                      <span className="monitoring-data-value">{healthData.version}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Memory Status Card */}
              <div className="col-12 col-md-6">
                <div className="monitoring-card">
                  <div className="monitoring-card-header">
                    <i className="bi bi-cpu"></i>
                    <h3>Memory Usage</h3>
                  </div>
                  <div className="monitoring-card-body">
                    {renderMemoryProgressBar()}
                  </div>
                </div>
              </div>

              {/* Database Card */}
              <div className="col-12 col-md-6">
                <div className="monitoring-card">
                  <div className="monitoring-card-header">
                    <i className="bi bi-database"></i>
                    <h3>Database (MongoDB)</h3>
                  </div>
                  <div className="monitoring-card-body">
                    <div className="monitoring-data-row">
                      <span className="monitoring-data-label">Status</span>
                      <span className="monitoring-data-value">
                        <span className={`status-indicator ${getStatusColorClass(healthData.database.status)}`}></span>
                        {healthData.database.status}
                      </span>
                    </div>
                    <div className="monitoring-data-row">
                      <span className="monitoring-data-label">Connection State</span>
                      <span className="monitoring-data-value">
                        {healthData.database.connectionState === 1 ? 'Connected (1)' : `State: ${healthData.database.connectionState}`}
                      </span>
                    </div>
                    <div className="monitoring-data-row">
                      <span className="monitoring-data-label">Host</span>
                      <span className="monitoring-data-value">{healthData.database.host}</span>
                    </div>
                    <div className="monitoring-data-row">
                      <span className="monitoring-data-label">Database Name</span>
                      <span className="monitoring-data-value">{healthData.database.name}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* External Services Card */}
              <div className="col-12 col-md-6">
                <div className="monitoring-card">
                  <div className="monitoring-card-header">
                    <i className="bi bi-plug"></i>
                    <h3>External Services</h3>
                  </div>
                  <div className="monitoring-card-body">
                    <div className="monitoring-data-row">
                      <span className="monitoring-data-label">Mercado Pago</span>
                      <span className="monitoring-data-value">
                        <span className={`status-indicator ${getStatusColorClass(healthData.services.mercadoPago)}`}></span>
                        {healthData.services.mercadoPago}
                      </span>
                    </div>
                    <div className="monitoring-data-row">
                      <span className="monitoring-data-label">Cloudinary</span>
                      <span className="monitoring-data-value">
                        <span className={`status-indicator ${getStatusColorClass(healthData.services.cloudinary)}`}></span>
                        {healthData.services.cloudinary}
                      </span>
                    </div>
                    <div className="monitoring-data-row">
                      <span className="monitoring-data-label">Email Service</span>
                      <span className="monitoring-data-value">
                        <span className={`status-indicator ${getStatusColorClass(healthData.services.email)}`}></span>
                        {healthData.services.email}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : null}

        </div>
      </main>
    </div>
  );
};

export default AdminMonitoringPage;
