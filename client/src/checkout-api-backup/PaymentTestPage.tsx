import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import paymentService from '../services/paymentService';

const PaymentTestPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [testResults, setTestResults] = useState<any>(null);

  const testStates = [
    { status: 'approved', status_detail: 'APRO', description: 'Pago Aprobado' },
    { status: 'rejected', status_detail: 'OTHE', description: 'Rechazado por error general' },
    { status: 'pending', status_detail: 'CONT', description: 'Pendiente de pago' },
    { status: 'rejected', status_detail: 'CALL', description: 'Rechazado con validación para autorizar' },
    { status: 'rejected', status_detail: 'FUND', description: 'Fondos insuficientes' },
    { status: 'rejected', status_detail: 'SECU', description: 'Código de seguridad inválido' },
    { status: 'rejected', status_detail: 'EXPI', description: 'Problema de fecha de vencimiento' },
    { status: 'rejected', status_detail: 'FORM', description: 'Error de formulario' },
  ];

  // Tarjetas de prueba de Mercado Pago que generan errores específicos
  const testCards = [
    {
      number: '4509 9535 6623 3704',
      description: 'Visa - Pago Aprobado',
      cvv: '123',
      date: '12/25',
      expectedStatus: 'approved',
      expectedDetail: 'APRO'
    },
    {
      number: '4000 0000 0000 0002',
      description: 'Visa - Pago Rechazado (Error General)',
      cvv: '123',
      date: '12/25',
      expectedStatus: 'rejected',
      expectedDetail: 'OTHE'
    },
    {
      number: '5031 1111 1111 6351',
      description: 'Mastercard - Fondos Insuficientes',
      cvv: '123',
      date: '12/25',
      expectedStatus: 'rejected',
      expectedDetail: 'FUND'
    },
    {
      number: '4000 0000 0000 0069',
      description: 'Visa - Código de Seguridad Inválido',
      cvv: '123',
      date: '12/25',
      expectedStatus: 'rejected',
      expectedDetail: 'SECU'
    },
    {
      number: '4000 0000 0000 0010',
      description: 'Visa - Fecha de Vencimiento',
      cvv: '123',
      date: '12/25',
      expectedStatus: 'rejected',
      expectedDetail: 'EXPI'
    }
  ];

  const testPaymentState = async (status: string, statusDetail: string) => {
    setLoading(true);
    setResult(null);
    
    try {
      const paymentData = await paymentService.testPaymentStatus(status, statusDetail);
      setResult(paymentData);
      
      // Simular redirección a la página de resultado
      const params = new URLSearchParams({
        payment_id: paymentData.id,
        status: paymentData.status,
        status_detail: paymentData.status_detail
      });
      
      console.log('Redirigiendo a payment-result con parámetros:', params.toString());
      navigate(`/payment-result?${params.toString()}`);
    } catch (error: any) {
      console.error('Error al probar estado:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testPaymentStateDirect = async (status: string, statusDetail: string) => {
    setLoading(true);
    setResult(null);
    
    try {
      const paymentData = await paymentService.testPaymentStatus(status, statusDetail);
      setResult(paymentData);
      
      // Simular el resultado que se pasaría a PaymentResultPage
      const mockPaymentResult = {
        status: paymentData.status,
        payment_id: paymentData.id,
        status_detail: paymentData.status_detail
      };
      
      console.log('Resultado simulado para PaymentResultPage:', mockPaymentResult);
      
      // Aquí podríamos simular la lógica de PaymentResultPage
      const statusInfo = getStatusInfo(mockPaymentResult.status, mockPaymentResult.status_detail);
      console.log('StatusInfo calculado:', statusInfo);
      
    } catch (error: any) {
      console.error('Error al probar estado:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testPSEConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/payment/test-pse-config');
      const result = await response.json();
      
      if (response.ok) {
        setTestResults((prev: any) => ({
          ...prev,
          pseConfig: {
            success: true,
            message: 'Configuración PSE correcta',
            payment_id: result.payment_id,
            status: result.status,
            status_detail: result.status_detail
          }
        }));
      } else {
        setTestResults((prev: any) => ({
          ...prev,
          pseConfig: {
            success: false,
            error: result.error || 'Error desconocido',
            details: result.details
          }
        }));
      }
    } catch (err: any) {
      setTestResults((prev: any) => ({
        ...prev,
        pseConfig: {
          success: false,
          error: 'Error de conexión',
          details: err.message
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  // Función auxiliar para simular getStatusInfo (copiada de PaymentResultPage)
  const getStatusInfo = (status: string, statusDetail?: string) => {
    // Primero verificamos el status_detail específico para casos especiales
    if (statusDetail) {
      switch (statusDetail.toUpperCase()) {
        case 'APRO':
          return {
            title: '¡Pago Aprobado!',
            message: 'Tu pago ha sido procesado exitosamente.',
            icon: 'bi-check-circle-fill',
            color: 'success',
            bgColor: 'bg-success'
          };
        case 'OTHE':
          return {
            title: 'Pago Rechazado',
            message: 'Tu pago fue rechazado por un error general. Por favor, intenta nuevamente.',
            icon: 'bi-x-circle-fill',
            color: 'danger',
            bgColor: 'bg-danger'
          };
        case 'CONT':
          return {
            title: 'Pago Pendiente',
            message: 'Tu pago está pendiente de confirmación. Te notificaremos cuando se complete.',
            icon: 'bi-clock-fill',
            color: 'warning',
            bgColor: 'bg-warning'
          };
        case 'CALL':
          return {
            title: 'Pago Rechazado',
            message: 'Tu pago fue rechazado y requiere validación para autorizar. Contacta a tu banco.',
            icon: 'bi-x-circle-fill',
            color: 'danger',
            bgColor: 'bg-danger'
          };
        case 'FUND':
          return {
            title: 'Pago Rechazado',
            message: 'Tu pago fue rechazado por fondos insuficientes. Verifica tu saldo disponible.',
            icon: 'bi-x-circle-fill',
            color: 'danger',
            bgColor: 'bg-danger'
          };
        case 'SECU':
          return {
            title: 'Pago Rechazado',
            message: 'Tu pago fue rechazado por código de seguridad inválido. Verifica el CVV de tu tarjeta.',
            icon: 'bi-x-circle-fill',
            color: 'danger',
            bgColor: 'bg-danger'
          };
        case 'EXPI':
          return {
            title: 'Pago Rechazado',
            message: 'Tu pago fue rechazado por problema con la fecha de vencimiento. Verifica la fecha de tu tarjeta.',
            icon: 'bi-x-circle-fill',
            color: 'danger',
            bgColor: 'bg-danger'
          };
        case 'FORM':
          return {
            title: 'Pago Rechazado',
            message: 'Tu pago fue rechazado por error en el formulario. Verifica los datos ingresados.',
            icon: 'bi-x-circle-fill',
            color: 'danger',
            bgColor: 'bg-danger'
          };
      }
    }

    // Si no hay status_detail específico o no coincide, usamos el status general
    switch (status.toLowerCase()) {
      case 'approved':
        return {
          title: '¡Pago Aprobado!',
          message: 'Tu pago ha sido procesado exitosamente.',
          icon: 'bi-check-circle-fill',
          color: 'success',
          bgColor: 'bg-success'
        };
      case 'pending':
        return {
          title: 'Pago Pendiente',
          message: 'Tu pago está siendo procesado. Te notificaremos cuando se complete.',
          icon: 'bi-clock-fill',
          color: 'warning',
          bgColor: 'bg-warning'
        };
      case 'rejected':
        return {
          title: 'Pago Rechazado',
          message: 'Tu pago fue rechazado. Por favor, intenta con otro método de pago.',
          icon: 'bi-x-circle-fill',
          color: 'danger',
          bgColor: 'bg-danger'
        };
      case 'in_process':
        return {
          title: 'Pago en Proceso',
          message: 'Tu pago está siendo revisado. Te notificaremos el resultado.',
          icon: 'bi-hourglass-split',
          color: 'info',
          bgColor: 'bg-info'
        };
      default:
        return {
          title: 'Estado Desconocido',
          message: 'No se pudo determinar el estado del pago.',
          icon: 'bi-question-circle-fill',
          color: 'secondary',
          bgColor: 'bg-secondary'
        };
    }
  };

  return (
    <div className="container py-5">
      <h1>Prueba de Estados de Pago</h1>
      <p className="lead">Esta página te permite probar diferentes estados de pago sin hacer pagos reales.</p>
      
      <div className="row">
        <div className="col-md-8">
          <div className="card mb-4">
            <div className="card-header">
              <h5>Estados de Prueba Simulados</h5>
            </div>
            <div className="card-body">
              <div className="row">
                {testStates.map((testState, index) => (
                  <div key={index} className="col-md-6 mb-3">
                    <div className="card">
                      <div className="card-body">
                        <h6 className="card-title">{testState.description}</h6>
                        <p className="card-text">
                          <small className="text-muted">
                            Status: {testState.status} | Detail: {testState.status_detail}
                          </small>
                        </p>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => testPaymentState(testState.status, testState.status_detail)}
                            disabled={loading}
                          >
                            {loading ? 'Probando...' : 'Probar'}
                          </button>
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => testPaymentStateDirect(testState.status, testState.status_detail)}
                            disabled={loading}
                          >
                            {loading ? 'Probando...' : 'Directo'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h5>Tarjetas de Prueba de Mercado Pago</h5>
              <small className="text-muted">Usa estas tarjetas en el checkout real para probar diferentes errores</small>
            </div>
            <div className="card-body">
              <div className="row">
                {testCards.map((card, index) => (
                  <div key={index} className="col-md-6 mb-3">
                    <div className="card border-info">
                      <div className="card-body">
                        <h6 className="card-title">{card.description}</h6>
                        <div className="mb-2">
                          <strong>Número:</strong> <code>{card.number}</code>
                        </div>
                        <div className="mb-2">
                          <strong>CVV:</strong> <code>{card.cvv}</code>
                        </div>
                        <div className="mb-2">
                          <strong>Fecha:</strong> <code>{card.date}</code>
                        </div>
                        <div className="mb-2">
                          <strong>Resultado Esperado:</strong>
                          <br />
                          <small className="text-muted">
                            Status: {card.expectedStatus} | Detail: {card.expectedDetail}
                          </small>
                        </div>
                        <div className="alert alert-info">
                          <small>
                            <i className="bi bi-info-circle me-1"></i>
                            Ve al carrito y usa esta tarjeta para probar el error real
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="card mb-4">
            <div className="card-header">
              <h5>Prueba de Configuración PSE</h5>
            </div>
            <div className="card-body">
              <button
                className="btn btn-warning btn-lg w-100 mb-3"
                onClick={testPSEConfig}
                disabled={loading}
              >
                {loading ? 'Probando...' : 'Probar Configuración PSE'}
              </button>
              
              {testResults?.pseConfig && (
                <div className={`alert ${testResults.pseConfig.success ? 'alert-success' : 'alert-danger'}`}>
                  <h6>{testResults.pseConfig.success ? '✅ Configuración Correcta' : '❌ Error de Configuración'}</h6>
                  <p>{testResults.pseConfig.message || testResults.pseConfig.error}</p>
                  {testResults.pseConfig.details && (
                    <small className="text-muted">{testResults.pseConfig.details}</small>
                  )}
                  {testResults.pseConfig.payment_id && (
                    <div className="mt-2">
                      <strong>Payment ID:</strong> {testResults.pseConfig.payment_id}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h5>Resultado de Prueba</h5>
            </div>
            <div className="card-body">
              {result ? (
                <div>
                  <h6>Datos del Pago:</h6>
                  <pre className="bg-light p-3 rounded" style={{fontSize: '0.8em'}}>
                    {JSON.stringify(result, null, 2)}
                  </pre>
                  
                  {result.status && result.status_detail && (
                    <div className="mt-3">
                      <h6>StatusInfo Calculado:</h6>
                      <pre className="bg-light p-3 rounded" style={{fontSize: '0.8em'}}>
                        {JSON.stringify(getStatusInfo(result.status, result.status_detail), null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted">Haz clic en "Probar" o "Directo" para ver el resultado</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentTestPage; 