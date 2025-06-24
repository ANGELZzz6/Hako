import React, { useState, useEffect } from 'react';
import type { Product, UpdateProductData } from '../services/productService';
import './EditProductModal.css';

interface EditProductModalProps {
  product: Product | null;
  isOpen: boolean;
  isCreating?: boolean;
  onClose: () => void;
  onSave: (productData: UpdateProductData) => Promise<void>;
}

const EditProductModal: React.FC<EditProductModalProps> = ({ product, isOpen, isCreating = false, onClose, onSave }) => {
  const [formData, setFormData] = useState<UpdateProductData>({
    nombre: '',
    descripcion: '',
    precio: 0,
    stock: 0,
    imagen_url: '',
    isActive: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      // Modo edición - cargar datos del producto
      setFormData({
        nombre: product.nombre,
        descripcion: product.descripcion,
        precio: product.precio,
        stock: product.stock,
        imagen_url: product.imagen_url,
        isActive: product.isActive
      });
    } else {
      // Modo creación - resetear formulario
      setFormData({
        nombre: '',
        descripcion: '',
        precio: 0,
        stock: 0,
        imagen_url: '',
        isActive: true
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || `Error al ${isCreating ? 'crear' : 'actualizar'} producto`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content product-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isCreating ? 'Crear Nuevo Producto' : 'Editar Producto'}</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="nombre">Nombre del Producto</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              className="form-control"
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label htmlFor="descripcion">Descripción</label>
            <textarea
              id="descripcion"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              required
              className="form-control"
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="precio">Precio ($)</label>
              <input
                type="number"
                id="precio"
                name="precio"
                value={formData.precio}
                onChange={handleChange}
                required
                className="form-control"
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label htmlFor="stock">Stock</label>
              <input
                type="number"
                id="stock"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                required
                className="form-control"
                min="0"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="imagen_url">URL de la Imagen</label>
            <input
              type="url"
              id="imagen_url"
              name="imagen_url"
              value={formData.imagen_url}
              onChange={handleChange}
              required
              className="form-control"
              placeholder="https://ejemplo.com/imagen.jpg"
            />
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="form-checkbox"
              />
              <span className="checkmark"></span>
              Producto Activo
            </label>
          </div>

          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Guardando...' : (isCreating ? 'Crear Producto' : 'Guardar Cambios')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal; 