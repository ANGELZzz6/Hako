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

const MAX_IMAGES = 6;

const StarSelector: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => (
  <div className="star-selector">
    {[1,2,3,4,5].map(i => (
      <i
        key={i}
        className={`bi ${value >= i ? 'bi-star-fill' : value >= i-0.5 ? 'bi-star-half' : 'bi-star'}`}
        style={{ color: '#f7b731', fontSize: '1.5em', cursor: 'pointer', marginRight: 2 }}
        onClick={() => onChange(i)}
        onMouseOver={e => (e.currentTarget.style.color = '#d32f2f')}
        onMouseOut={e => (e.currentTarget.style.color = '#f7b731')}
        title={`${i} estrella${i>1?'s':''}`}
      />
    ))}
  </div>
);

const EditProductModal: React.FC<EditProductModalProps> = ({ product, isOpen, isCreating = false, onClose, onSave }) => {
  const [formData, setFormData] = useState<UpdateProductData & { adminRating?: number; images?: string[] }>({
    nombre: '',
    descripcion: '',
    precio: 0,
    stock: 0,
    imagen_url: '',
    isActive: true,
    adminRating: 0,
    images: []
  });
  const [newImage, setNewImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      setFormData({
        nombre: product.nombre,
        descripcion: product.descripcion,
        precio: product.precio,
        stock: product.stock,
        imagen_url: product.imagen_url,
        isActive: product.isActive,
        adminRating: product.adminRating ?? 0,
        images: ((product.images && product.images.length > 0 ? [...product.images] : [product.imagen_url]).filter(img => typeof img === 'string' && !!img)) as string[]
      });
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        precio: 0,
        stock: 0,
        imagen_url: '',
        isActive: true,
        adminRating: 0,
        images: []
      });
    }
    setNewImage('');
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Asegurar que imagen_url sea la primera de images
      const images = formData.images && formData.images.length > 0 ? formData.images : [formData.imagen_url];
      await onSave({ ...formData, imagen_url: images[0], images });
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
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleAddImage = () => {
    if (newImage && /^https?:\/\/.+/.test(newImage) && (!formData.images || formData.images.length < MAX_IMAGES)) {
      setFormData(prev => ({ ...prev, images: [...(prev.images || []), newImage] }));
      setNewImage('');
    }
  };

  const handleRemoveImage = (idx: number) => {
    setFormData(prev => ({ ...prev, images: (prev.images || []).filter((_, i) => i !== idx) }));
  };

  const handleSetMainImage = (idx: number) => {
    setFormData(prev => {
      const imgs = prev.images ? [...prev.images] : [];
      if (imgs.length > 1) {
        const [main, ...rest] = [imgs[idx], ...imgs.slice(0, idx), ...imgs.slice(idx + 1)];
        return { ...prev, images: [main, ...rest], imagen_url: main };
      }
      return prev;
    });
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
            <input type="text" id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} required className="form-control" maxLength={100} />
          </div>
          <div className="form-group">
            <label htmlFor="descripcion">Descripción</label>
            <textarea id="descripcion" name="descripcion" value={formData.descripcion} onChange={handleChange} required className="form-control" rows={3} maxLength={500} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="precio">Precio ($)</label>
              <input type="number" id="precio" name="precio" value={formData.precio} onChange={handleChange} required className="form-control" min="0" step="0.01" />
            </div>
            <div className="form-group">
              <label htmlFor="stock">Stock</label>
              <input type="number" id="stock" name="stock" value={formData.stock} onChange={handleChange} required className="form-control" min="0" />
            </div>
          </div>
          <div className="form-group">
            <label>Calificación de Hako (admin)</label>
            <StarSelector value={formData.adminRating ?? 0} onChange={v => setFormData(prev => ({ ...prev, adminRating: v }))} />
          </div>
          <div className="form-group">
            <label>Imágenes del producto (máx. {MAX_IMAGES})</label>
            <div className="d-flex flex-wrap gap-2 mb-2">
              {(formData.images || []).map((img, idx) => (
                <div key={idx} className="position-relative">
                  <img src={img} alt={`img${idx}`} style={{width:56,height:40,objectFit:'cover',border:idx===0?'2px solid #d32f2f':'1px solid #ccc',borderRadius:6,cursor:'pointer'}} title={idx===0?"Principal":"Haz clic para poner como principal"} onClick={()=>handleSetMainImage(idx)} />
                  <button type="button" className="btn btn-sm btn-danger position-absolute top-0 end-0" style={{padding:'0 4px',fontSize:'0.8em'}} onClick={()=>handleRemoveImage(idx)} title="Eliminar imagen"><i className="bi bi-x"></i></button>
                </div>
              ))}
            </div>
            <div className="d-flex gap-2">
              <input type="url" className="form-control" placeholder="https://ejemplo.com/imagen.jpg" value={newImage} onChange={e=>setNewImage(e.target.value)} />
              <button type="button" className="btn btn-primary" onClick={handleAddImage} disabled={!newImage || (formData.images?.length ?? 0) >= MAX_IMAGES}>Agregar</button>
            </div>
            <small className="text-muted">Haz clic en una imagen para ponerla como principal.</small>
          </div>
          <div className="form-group">
            <label htmlFor="imagen_url">URL de la Imagen Principal</label>
            <input type="url" id="imagen_url" name="imagen_url" value={formData.imagen_url} onChange={handleChange} required className="form-control" placeholder="https://ejemplo.com/imagen.jpg" />
          </div>
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="form-checkbox" />
              <span className="checkmark"></span>
              Producto Activo
            </label>
          </div>
          {error && (<div className="alert alert-danger">{error}</div>)}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={loading}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Guardando...' : (isCreating ? 'Crear Producto' : 'Guardar Cambios')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal; 