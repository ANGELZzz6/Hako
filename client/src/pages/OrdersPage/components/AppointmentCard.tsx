import React, { useState } from 'react';
import { getTimeUntilAppointment, canModifyAppointment, isAppointmentExpired, formatAppointmentDate, debugDateIssue } from '../utils/dateUtils';
import qrService from '../../../services/qrService';
import appointmentService from '../../../services/appointmentService';
import type { QRCode } from '../../../services/qrService';
import './AppointmentCard.css';

/**
 * Componente para mostrar una tarjeta de cita/reserva
 * 
 * Funcionalidades:
 * - Mostrar información de la reserva
 * - Generar y mostrar código QR
 * - Modificar o cancelar reserva
 * - Botón "Recoger Test" para marcar productos como recogidos
 * 
 * El botón "Recoger Test" permite:
 * 1. Marcar la cita como 'completed' en el backend
 * 2. Los productos pasan a estado 'recogido'
 * 3. La reserva se mueve a historial/completadas
 * 4. Ya no aparece en "Mis Órdenes" activas
 */
interface AppointmentCardProps {
  appointment: any;
  onEdit: (appointment: any) => void;
  onCancel: (appointmentId: string) => void;
  cancellingAppointment: boolean;
  updatingAppointment: boolean;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onEdit,
  onCancel,
  cancellingAppointment,
  updatingAppointment
}) => {
  const [generatingQR, setGeneratingQR] = useState(false);
  const [qrCode, setQrCode] = useState<QRCode | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [pickingUp, setPickingUp] = useState(false);

  // Verificar si la cita está activa (no vencida y no completada)
  const isAppointmentActive = !isAppointmentExpired(appointment) && appointment.status !== 'completed';

  // Generar código QR
  const handleGenerateQR = async () => {
    try {
      setGeneratingQR(true);
      
      // Primero intentar obtener un QR existente
      try {
        const existingQR = await qrService.getQRByAppointment(appointment._id);
        if (existingQR.success && existingQR.qr) {
          console.log('✅ QR existente encontrado:', existingQR.qr);
          // Convertir el QR del backend al tipo completo
          const fullQR: QRCode = {
            ...existingQR.qr,
            status: existingQR.qr.status as 'disponible' | 'vencido' | 'recogido',
            generado_en: new Date().toISOString(),
            order: appointment.order?._id || '',
            appointment: appointment._id
          };
          setQrCode(fullQR);
          setShowQRModal(true);
          return;
        }
      } catch (error) {
        // Si no existe, continuar con la generación
        console.log('ℹ️ No existe QR previo, generando uno nuevo...');
      }

      // Generar nuevo QR
      const response = await qrService.generateQR(appointment._id);
      
      if (response.success && response.qr) {
        // Convertir el QR del backend al tipo completo
        const fullQR: QRCode = {
          ...response.qr,
          status: response.qr.status as 'disponible' | 'vencido' | 'recogido',
          generado_en: new Date().toISOString(),
          order: appointment.order?._id || '',
          appointment: appointment._id
        };
        setQrCode(fullQR);
        setShowQRModal(true);
      }
    } catch (error: any) {
      console.error('Error al generar QR:', error);
      alert(`Error al generar QR: ${error.message}`);
    } finally {
      setGeneratingQR(false);
    }
  };

  // Marcar cita como recogida (test)
  const handlePickupTest = async () => {
    try {
      setPickingUp(true);
      
      const response = await appointmentService.markAsCompleted(appointment._id);
      
      if (response.success) {
        console.log('✅ Cita marcada como completada:', response.appointment);
        
        // Cerrar la modal
        setShowQRModal(false);
        
        // Mostrar mensaje de éxito
        alert('✅ Productos marcados como recogidos exitosamente. La reserva se moverá a tu historial.');
        
        // Opción 1: Recargar la página para reflejar los cambios
        window.location.reload();
        
        // Opción 2: Actualizar el estado local (implementar después)
        // TODO: Implementar callback para actualizar el estado del padre
        // onAppointmentCompleted?.(appointment._id);
      } else {
        throw new Error(response.message || 'Error al marcar como completada');
      }
    } catch (error: any) {
      console.error('Error al marcar como recogida:', error);
      alert(`❌ Error al marcar como recogida: ${error.message}`);
    } finally {
      setPickingUp(false);
    }
  };

  return (
    <>
      <div key={appointment._id} className="col-12 mb-3">
        <div className="card border-success appointment-card">
          <div className="card-header bg-success text-white">
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0">
                <i className="bi bi-calendar-event me-2"></i>
                Reserva #{appointment._id.slice(-6)}
              </h6>
              <span className={`badge ${appointment.status === 'confirmed' ? 'bg-light text-dark' : 'bg-warning'}`}>
                {appointment.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
              </span>
            </div>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-3">
                <p className="mb-1">
                  <strong>Fecha:</strong><br />
                  {formatAppointmentDate(appointment.scheduledDate)}
                </p>
                {/* Botón de debug temporal */}
                <button
                  className="btn btn-outline-secondary btn-sm mb-2"
                  onClick={() => {
                    console.log('🔍 Debug de fecha para cita:', appointment._id);
                    debugDateIssue(appointment.scheduledDate, appointment.timeSlot);
                  }}
                  title="Debug de fecha (temporal)"
                >
                  <i className="bi bi-bug me-1"></i>
                  Debug Fecha
                </button>
                <p className="mb-1">
                  <strong>Hora:</strong><br />
                  {appointment.timeSlot}
                </p>
              </div>
              <div className="col-md-3">
                <p className="mb-1">
                  <strong>Casilleros:</strong><br />
                  {appointment.itemsToPickup.map((item: any) => item.lockerNumber).join(', ')}
                </p>
                <p className="mb-1">
                  <strong>Productos:</strong><br />
                  {appointment.itemsToPickup.length} producto{appointment.itemsToPickup.length > 1 ? 's' : ''}
                </p>
                <p className="mb-1">
                  <strong>Tiempo restante:</strong><br />
                  <span className={canModifyAppointment(appointment) ? 'text-success' : 'text-danger'}>
                    {getTimeUntilAppointment(appointment)}
                  </span>
                </p>
              </div>
              <div className="col-md-6">
                <div className="d-flex justify-content-end gap-2 flex-wrap">
                  {/* Botón QR - Solo visible si la cita está activa */}
                  {isAppointmentActive && (
                    <button
                      className="btn btn-outline-info btn-sm"
                      onClick={handleGenerateQR}
                      disabled={generatingQR}
                    >
                      {generatingQR ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                          Generando QR...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-qr-code me-1"></i>
                          QR
                        </>
                      )}
                    </button>
                  )}
                  
                  {isAppointmentExpired(appointment) ? (
                    <button
                      className="btn btn-outline-warning btn-sm"
                      onClick={() => {
                        onEdit(appointment);
                        setTimeout(() => {
                          alert('Debes reclamar tus productos, si no lo haces no podrás reservar para el día de hoy.');
                        }, 300);
                      }}
                    >
                      <i className="bi bi-arrow-repeat me-1"></i>
                      Volver a reservar
                    </button>
                  ) : canModifyAppointment(appointment) ? (
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => onEdit(appointment)}
                      disabled={updatingAppointment}
                    >
                      <i className="bi bi-pencil me-1"></i>
                      Modificar Reserva
                    </button>
                  ) : (
                    <small className="text-muted d-flex align-items-center">
                      <i className="bi bi-clock me-1"></i>
                      No modificable (menos de 1h)
                    </small>
                  )}
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => onCancel(appointment._id)}
                    disabled={cancellingAppointment}
                  >
                    {cancellingAppointment ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Cancelando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-x-circle me-1"></i>
                        Cancelar Reserva
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para mostrar el código QR */}
      {showQRModal && qrCode && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white text-center py-2">
                <h6 className="modal-title mb-0">
                  <i className="bi bi-qr-code me-2"></i>
                  Código QR para Recogida
                </h6>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowQRModal(false)}
                ></button>
              </div>
              
              <div className="modal-body text-center p-4">
                {/* Información básica de la reserva */}
                <div className="mb-3">
                  <div className="row">
                    <div className="col-6">
                      <small className="text-muted">
                        <strong>Fecha:</strong><br />
                        {formatAppointmentDate(appointment.scheduledDate)}
                      </small>
                    </div>
                    <div className="col-6">
                      <small className="text-muted">
                        <strong>Hora:</strong><br />
                        {appointment.timeSlot}
                      </small>
                    </div>
                  </div>
                  <div className="mt-2">
                    <small className="text-muted">
                      <strong>Casilleros:</strong> {appointment.itemsToPickup.map((item: any) => item.lockerNumber).join(', ')}
                    </small>
                  </div>
                </div>

                {/* Código QR Centrado */}
                <div className="mb-3">
                  <div className="border border-2 border-primary rounded p-2" style={{ backgroundColor: 'white', display: 'inline-block' }}>
                    <img 
                      src={qrCode.qr_url} 
                      alt="Código QR" 
                      className="img-fluid"
                      style={{ width: '180px', height: '180px' }}
                    />
                  </div>
                </div>
                
                {/* Código QR ID */}
                <div className="mb-3">
                  <small className="text-muted">
                    <strong>Código:</strong> {qrCode.qr_id.slice(-8)}
                  </small>
                </div>

                {/* Estado */}
                <div className="mb-3">
                  <span className={`badge ${qrService.getQRStatus(qrCode).className}`}>
                    {qrService.getQRStatus(qrCode).text}
                  </span>
                </div>

                {/* Instrucción simple */}
                <div className="alert alert-info py-2 mb-0">
                  <small>
                    <i className="bi bi-info-circle me-1"></i>
                    Muestra este código QR en la tienda para recoger tus productos
                  </small>
                </div>
              </div>
              
              {/* Botón Cerrar Centrado */}
              <div className="modal-footer justify-content-center py-2">
                {/* Botón Recoger Test - Solo visible si la cita está activa */}
                {isAppointmentActive && (
                  <button
                    type="button"
                    className="btn btn-success btn-sm me-2"
                    onClick={handlePickupTest}
                    disabled={pickingUp}
                    title="Marcar productos como recogidos (test)"
                  >
                    {pickingUp ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-box-arrow-in-down me-1"></i>
                        Recoger Test
                      </>
                    )}
                  </button>
                )}
                
                <button
                  type="button"
                  className="btn btn-primary btn-sm px-4"
                  onClick={() => setShowQRModal(false)}
                >
                  <i className="bi bi-check-circle me-1"></i>
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AppointmentCard; 