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

  // Calcula el stock total de variantes si existen
  const getTotalVariantStock = () => {
    if (!product.variants || !product.variants.enabled || !product.variants.attributes.length) return null;
    let total = 0;
    product.variants.attributes.forEach(attr => {
      attr.options.forEach(opt => {
        if (opt.isActive) total += Number(opt.stock) || 0;
      });
    });
    return total;
  };
  const variantStock = getTotalVariantStock();

  return (
    <tr className={`product-row ${product.isDestacado ? 'destacado-row' : ''} ${product.isOferta ? 'oferta-row' : ''}`}>
      <td>
        <div className="product-info">
          <img
            src={product.imagen_url}
            alt={product.nombre}
            className="product-image"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2Fsvg%22%20width%3D%2250%22%20height%3D%2250%22%3E%3Crect%20width%3D%2250%22%20height%3D%2250%22%20fill%3D%22%23e9ecef%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%22%20font-size%3D%228%22%20fill%3D%22%236c757d%22%3ESin%20img%3C%2Ftext%3E%3C%2Fsvg%3E';
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
        {variantStock !== null ? (
          <span className={`stock-badge ${variantStock > 0 ? 'in-stock' : 'out-of-stock'}`} title="Stock total de variantes activas" style={{ display: 'inline-flex', alignItems: 'center', minWidth: 32, justifyContent: 'center', gap: 4 }}>
            <span style={{ fontWeight: 600 }}>{variantStock}</span>
            <i className="bi bi-collection" title="Stock de variantes" style={{ fontSize: '1em', marginLeft: 4, verticalAlign: 'middle' }}></i>
          </span>
        ) : (
          <span className={`stock-badge ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
            {product.stock}
          </span>
        )}
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