import React from 'react';
import type { Product } from '../services/productService';

interface ProductRowProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onToggleStatus: (productId: string) => void;
  onToggleDestacado: (productId: string) => void;
  onToggleOferta: (productId: string) => void;
}

const ProductRow: React.FC<ProductRowProps> = ({ product, onEdit, onDelete, onToggleStatus, onToggleDestacado, onToggleOferta }) => {
  const getStatusBadge = (isActive: boolean) => {
    const statusClass = isActive ? 'status-active' : 'status-inactive';
    const statusText = isActive ? 'Activo' : 'Inactivo';
    
    return (
      <span className={`status-badge ${statusClass}`}>
        {statusText}
      </span>
    );
  };

  const getDestacadoBadge = () => {
    if (!product.isDestacado) return null;
    
    return (
      <span className="badge destacado-badge">
        <i className="bi bi-star-fill"></i>
        Destacado
      </span>
    );
  };

  const getOfertaBadge = () => {
    if (!product.isOferta) return null;
    
    return (
      <span className="badge oferta-badge">
        <i className="bi bi-tag-fill"></i>
        Oferta
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(price);
  };

  return (
    <tr className={`product-row ${product.isDestacado ? 'destacado-row' : ''} ${product.isOferta ? 'oferta-row' : ''}`}>
      <td>
        <div className="product-info">
          <img 
            src={product.imagen_url} 
            alt={product.nombre}
            className="product-image"
            onError={(e) => {
              e.currentTarget.src = 'https://via.placeholder.com/50x50?text=Sin+Imagen';
            }}
          />
          <div className="product-details">
            <span className="product-name">{product.nombre}</span>
            <div className="product-badges">
              {getDestacadoBadge()}
              {getOfertaBadge()}
            </div>
          </div>
        </div>
      </td>
      <td>
        <div className="price-container">
          <span className="product-price">{formatPrice(product.precio)}</span>
          {(product.isDestacado || product.isOferta) && (
            <div className="price-indicators">
              {product.isDestacado && <i className="bi bi-star-fill price-star"></i>}
              {product.isOferta && <i className="bi bi-tag-fill price-tag"></i>}
            </div>
          )}
        </div>
      </td>
      <td>
        <span className={`stock-badge ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
          {product.stock}
        </span>
      </td>
      <td>{formatDate(product.fecha_creacion)}</td>
      <td>{getStatusBadge(product.isActive)}</td>
      <td className="action-buttons">
        <button 
          className="btn-action btn-edit" 
          onClick={() => onEdit(product)}
          aria-label={`Editar producto ${product.nombre}`}
          title="Editar producto"
        >
          <i className="bi bi-pencil-square"></i>
        </button>
        <button 
          className={`btn-action ${product.isDestacado ? 'btn-destacado-active' : 'btn-destacado'}`}
          onClick={() => onToggleDestacado(product._id)}
          aria-label={`${product.isDestacado ? 'Quitar de' : 'Marcar como'} destacado ${product.nombre}`}
          title={product.isDestacado ? 'Quitar de destacados' : 'Marcar como destacado'}
        >
          <i className="bi bi-star-fill"></i>
        </button>
        <button 
          className={`btn-action ${product.isOferta ? 'btn-oferta-active' : 'btn-oferta'}`}
          onClick={() => onToggleOferta(product._id)}
          aria-label={`${product.isOferta ? 'Quitar de' : 'Marcar como'} oferta ${product.nombre}`}
          title={product.isOferta ? 'Quitar de ofertas' : 'Marcar como oferta'}
        >
          <i className="bi bi-tag-fill"></i>
        </button>
        <button 
          className="btn-action btn-toggle-status" 
          onClick={() => onToggleStatus(product._id)}
          aria-label={`${product.isActive ? 'Desactivar' : 'Activar'} producto ${product.nombre}`}
          title={product.isActive ? 'Desactivar producto' : 'Activar producto'}
        >
          <i className={`bi ${product.isActive ? 'bi-eye-slash' : 'bi-eye'}`}></i>
        </button>
        <button 
          className="btn-action btn-delete" 
          onClick={() => onDelete(product._id)}
          aria-label={`Borrar producto ${product.nombre}`}
          title="Eliminar producto"
        >
          <i className="bi bi-trash3-fill"></i>
        </button>
      </td>
    </tr>
  );
};

export default ProductRow; 