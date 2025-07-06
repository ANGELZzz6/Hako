import React, { useState, useEffect } from 'react';
import './PSEPaymentForm.css';

interface PSEPaymentFormProps {
  onSubmit: (formData: PSEData) => void;
  loading: boolean;
  error: string | null;
}

export interface PSEData {
  email: string;
  // Campos opcionales para compatibilidad
  personType?: 'natural' | 'juridica';
  identificationType?: string;
  identificationNumber?: string;
  financialInstitution?: string;
  zipCode?: string;
  streetName?: string;
  streetNumber?: string;
  neighborhood?: string;
  city?: string;
  federalUnit?: string;
  phoneAreaCode?: string;
  phoneNumber?: string;
}

interface Bank {
  id: string;
  description: string;
}

const PSEPaymentForm: React.FC<PSEPaymentFormProps> = ({ onSubmit, loading, error }) => {
  const [formData, setFormData] = useState<PSEData>({
    email: ''
  });

  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);

  // Tipos de documento por tipo de persona
  const naturalDocTypes = [
    { value: 'CC', label: 'C.C' },
    { value: 'CE', label: 'C.E.' },
    { value: 'PAS', label: 'Pasaporte' },
    { value: 'TE', label: 'Tarjeta de Extranjería' },
    { value: 'TI', label: 'Tarjeta de Identidad' },
    { value: 'RC', label: 'Registro Civil' },
    { value: 'DI', label: 'Documento de Identificación' }
  ];

  const juridicaDocTypes = [
    { value: 'NIT', label: 'NIT' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Si cambia el tipo de persona, actualizar el tipo de documento
    if (name === 'personType') {
      const newPersonType = value as 'natural' | 'juridica';
      const defaultDocType = newPersonType === 'natural' ? 'CC' : 'NIT';
      setFormData(prev => ({
        ...prev,
        personType: newPersonType,
        identificationType: defaultDocType
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const getDocumentTypes = () => {
    return formData.personType === 'natural' ? naturalDocTypes : juridicaDocTypes;
  };

  return (
    <div className="pse-payment-form">
      <form onSubmit={handleSubmit}>
        <div className="row">
          {/* Información simplificada para preferencias */}
          <div className="col-md-6 mx-auto">
            <h5 className="form-section-title">Pago con PSE</h5>
            
            <div className="mb-3">
              <label htmlFor="email" className="form-label">Correo Electrónico *</label>
              <input
                type="email"
                className="form-control"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="tu@email.com"
              />
            </div>

            <div className="alert alert-info">
              <i className="bi bi-info-circle me-2"></i>
              <strong>¿Cómo funciona?</strong> Al hacer clic en "Pagar con PSE", serás redirigido a Mercado Pago donde podrás seleccionar tu banco y completar el pago de forma segura.
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger mt-3">
            {error}
          </div>
        )}

        <div className="text-center mt-4">
          <button
            type="submit"
            className="btn btn-success btn-lg"
            disabled={loading}
          >
            {loading ? 'Creando pago...' : 'Pagar con PSE'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PSEPaymentForm; 