import React from 'react';
import type { Product } from '../services/productService';

interface ProductRowProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onToggleStatus: (productId: string) => void;
}

const ProductRow: React.FC<ProductRowProps> = ({ product, onEdit, onDelete, onToggleStatus }) => {
  const getStatusBadge = (isActive: boolean) => {
    const statusClass = isActive ? 'status-active' : 'status-inactive';
    const statusText = isActive ? 'Activo' : 'Inactivo';
    
    return (
      <span className={`status-badge ${statusClass}`}>
        {statusText}
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
    <tr>
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
          <span className="product-name">{product.nombre}</span>
        </div>
      </td>
      <td>{formatPrice(product.precio)}</td>
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