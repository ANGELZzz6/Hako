import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import paymentService from '../services/paymentService';

const PaymentTestPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testStates = [
    { status: 'approved', status_detail: 'accredited', description: 'Pago Aprobado' },
    { status: 'rejected', status_detail: 'OTHE', description: 'Rechazado por error general' },
    { status: 'rejected', status_detail: 'FUND', description: 'Fondos insuficientes' },
    { status: 'pending', status_detail: 'CONT', description: 'Pendiente de pago' },
    { status: 'rejected', status_detail: 'CALL', description: 'Rechazado con validación para autorizar' },
    { status: 'rejected', status_detail: 'SECU', description: 'Código de seguridad inválido' },
    { status: 'rejected', status_detail: 'EXPI', description: 'Problema de fecha de vencimiento' },
    { status: 'rejected', status_detail: 'FORM', description: 'Error de formulario' },
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
        collection_status: paymentData.status_detail
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

  return (
    <div className="container py-5">
      <h1>Prueba de Estados de Pago</h1>
      <p className="lead">Esta página te permite probar diferentes estados de pago sin hacer pagos reales.</p>
      
      <div className="row">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h5>Estados de Prueba</h5>
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
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => testPaymentState(testState.status, testState.status_detail)}
                          disabled={loading}
                        >
                          {loading ? 'Probando...' : 'Probar'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="card">
            <div className="card-header">
              <h5>Resultado de Prueba</h5>
            </div>
            <div className="card-body">
              {result ? (
                <pre className="bg-light p-3 rounded">
                  {JSON.stringify(result, null, 2)}
                </pre>
              ) : (
                <p className="text-muted">Haz clic en "Probar" para ver el resultado</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentTestPage; 