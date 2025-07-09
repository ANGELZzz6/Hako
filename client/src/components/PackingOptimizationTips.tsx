import React from 'react';
import type { PackingResult } from '../services/gridPackingService';

interface PackingOptimizationTipsProps {
  result: PackingResult;
}

const SLOT_SIZE = 15; // cm
const SLOT_VOLUME = SLOT_SIZE * SLOT_SIZE * SLOT_SIZE; // 3375 cm³

const PackingOptimizationTips: React.FC<PackingOptimizationTipsProps> = ({ result }) => {
  const stats = {
    efficiency: Math.round(result.totalEfficiency),
    score: result.packingScore,
    lockers: result.lockers.length,
    unusedVolume: result.totalUnusedSlots * SLOT_VOLUME,
    totalUsedVolume: result.lockers.reduce((sum, locker) => sum + locker.usedSlots * SLOT_VOLUME, 0)
  };

  const getEfficiencyLevel = () => {
    if (stats.efficiency >= 90) return { level: 'Excelente', color: 'success', icon: 'bi-star-fill' };
    if (stats.efficiency >= 80) return { level: 'Muy Buena', color: 'info', icon: 'bi-star-half' };
    if (stats.efficiency >= 70) return { level: 'Buena', color: 'warning', icon: 'bi-star' };
    if (stats.efficiency >= 1) return { level: 'Mejorable', color: 'danger', icon: 'bi-exclamation-triangle' };
    return { level: 'Normal', color: 'info', icon: 'bi-box-seam' };
  };

  const getScoreLevel = () => {
    if (stats.score >= 85) return { level: 'Óptimo', color: 'success' };
    if (stats.score >= 70) return { level: 'Bueno', color: 'info' };
    if (stats.score >= 50) return { level: 'Regular', color: 'warning' };
    return { level: 'Necesita mejora', color: 'danger' };
  };

  const efficiencyInfo = getEfficiencyLevel();
  const scoreInfo = getScoreLevel();

  const getRecommendations = () => {
    const recommendations = [];
    if (stats.efficiency < 1) {
      recommendations.push({
        icon: 'bi-box-seam',
        title: 'Productos pequeños detectados',
        description: 'Los productos son muy pequeños comparados con el casillero. Esto es normal y eficiente.',
        priority: 'low'
      });
    } else if (stats.efficiency < 80) {
      recommendations.push({
        icon: 'bi-lightbulb',
        title: 'Optimiza el espacio',
        description: 'Considera reorganizar los productos para aprovechar mejor el volumen disponible.',
        priority: 'high'
      });
    }
    if (stats.lockers > 1) {
      recommendations.push({
        icon: 'bi-boxes',
        title: 'Reduce casilleros',
        description: 'Los productos podrían caber en menos casilleros con mejor organización.',
        priority: 'medium'
      });
    }
    if (stats.unusedVolume > 25000 && stats.efficiency > 1) {
      recommendations.push({
        icon: 'bi-arrows-move',
        title: 'Espacio desaprovechado',
        description: `Hay ${Math.round(stats.unusedVolume / 1000)}L de espacio sin usar.`,
        priority: 'medium'
      });
    }
    if (stats.score < 70 && stats.efficiency > 1) {
      recommendations.push({
        icon: 'bi-gear',
        title: 'Mejora la configuración',
        description: 'El algoritmo sugiere optimizar la disposición de los productos.',
        priority: 'high'
      });
    }
    if (stats.efficiency < 1 && stats.lockers === 1 && stats.score >= 60) {
      recommendations.push({
        icon: 'bi-check-circle',
        title: 'Empaquetado eficiente',
        description: 'Los productos están bien organizados en un solo casillero.',
        priority: 'low'
      });
    }
    return recommendations;
  };

  const recommendations = getRecommendations();

  return (
    <div className="packing-optimization-tips">
      {/* Resumen de métricas */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="metric-card text-center p-3 border rounded">
            <div className={`text-${efficiencyInfo.color}`}>
              <i className={`bi ${efficiencyInfo.icon} fs-2`}></i>
            </div>
            <h5 className="mt-2 mb-1">{stats.efficiency}%</h5>
            <small className="text-muted">Eficiencia</small>
            <div className="mt-1">
              <span className={`badge bg-${efficiencyInfo.color}`}>
                {efficiencyInfo.level}
              </span>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="metric-card text-center p-3 border rounded">
            <div className={`text-${scoreInfo.color}`}>
              <i className="bi bi-speedometer2 fs-2"></i>
            </div>
            <h5 className="mt-2 mb-1">{stats.score}/100</h5>
            <small className="text-muted">Score de Empaquetado</small>
            <div className="mt-1">
              <span className={`badge bg-${scoreInfo.color}`}>
                {scoreInfo.level}
              </span>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="metric-card text-center p-3 border rounded">
            <div className="text-primary">
              <i className="bi bi-boxes fs-2"></i>
            </div>
            <h5 className="mt-2 mb-1">{stats.lockers}</h5>
            <small className="text-muted">Casilleros Usados</small>
            <div className="mt-1">
              <span className="badge bg-primary">
                {stats.lockers === 1 ? 'Óptimo' : 'Múltiples'}
              </span>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="metric-card text-center p-3 border rounded">
            <div className="text-warning">
              <i className="bi bi-arrows-move fs-2"></i>
            </div>
            <h5 className="mt-2 mb-1">{Math.round(stats.unusedVolume / 1000)}L</h5>
            <small className="text-muted">Espacio Sin Usar</small>
            <div className="mt-1">
              <span className="badge bg-warning">
                {stats.unusedVolume > 25000 ? 'Mucho' : 'Poco'}
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* Recomendaciones */}
      {recommendations.length > 0 && (
        <div className="recommendations-section">
          <h6 className="mb-3">
            <i className="bi bi-lightbulb me-2"></i>
            Recomendaciones de Optimización
          </h6>
          <div className="row">
            {recommendations.map((rec, index) => (
              <div key={index} className="col-md-6 mb-3">
                <div className={`recommendation-card p-3 border rounded ${rec.priority === 'high' ? 'border-danger' : 'border-warning'}`}>
                  <div className="d-flex align-items-start">
                    <div className={`text-${rec.priority === 'high' ? 'danger' : 'warning'} me-3`}>
                      <i className={`bi ${rec.icon} fs-4`}></i>
                    </div>
                    <div className="flex-grow-1">
                      <h6 className="mb-1">{rec.title}</h6>
                      <p className="mb-0 text-muted small">{rec.description}</p>
                    </div>
                    <div>
                      <span className={`badge bg-${rec.priority === 'high' ? 'danger' : 'warning'}`}>
                        {rec.priority === 'high' ? 'Alta' : 'Media'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Tips generales */}
      <div className="tips-section mt-4">
        <h6 className="mb-3">
          <i className="bi bi-info-circle me-2"></i>
          Tips para Mejorar el Empaquetado
        </h6>
        
        <div className="row">
          <div className="col-md-4 mb-3">
            <div className="tip-card p-3 border rounded">
              <div className="text-info mb-2">
                <i className="bi bi-rotate-90 fs-3"></i>
              </div>
              <h6>Orientación de Productos</h6>
              <p className="small text-muted mb-0">
                El algoritmo considera 6 orientaciones diferentes para cada producto para encontrar la mejor disposición.
              </p>
            </div>
          </div>
          
          <div className="col-md-4 mb-3">
            <div className="tip-card p-3 border rounded">
              <div className="text-success mb-2">
                <i className="bi bi-sort-numeric-down fs-3"></i>
              </div>
              <h6>Orden de Empaquetado</h6>
              <p className="small text-muted mb-0">
                Los productos más grandes se empaquetan primero para optimizar el uso del espacio disponible.
              </p>
            </div>
          </div>
          
          <div className="col-md-4 mb-3">
            <div className="tip-card p-3 border rounded">
              <div className="text-warning mb-2">
                <i className="bi bi-calculator fs-3"></i>
              </div>
              <h6>Cálculo de Eficiencia</h6>
              <p className="small text-muted mb-0">
                La eficiencia se calcula considerando el volumen usado vs. el volumen total disponible en todos los casilleros.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackingOptimizationTips; 