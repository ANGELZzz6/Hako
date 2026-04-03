import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ProductCard.css';

interface Product {
  _id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen_url: string;
}

interface ProductCardProps {
  producto: Product;
  onClick?: (id: string) => void; // Opcional: permitir override del click handler
}

const ProductCard: React.FC<ProductCardProps> = ({ producto, onClick }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(producto._id);
    } else {
      // Comportamiento default: navegar a detalle
      navigate(`/producto/${producto._id}`);
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22200%22%3E%3Crect%20width%3D%22300%22%20height%3D%22200%22%20fill%3D%22%23e9ecef%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%22%20font-size%3D%2214%22%20fill%3D%22%236c757d%22%3ESin%20imagen%3C%2Ftext%3E%3C%2Fsvg%3E';
  };

  return (
    <div 
      className="product-card" 
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <img
        src={producto.imagen_url}
        className="product-card-image"
        alt={producto.nombre}
        onError={handleImageError}
        loading="lazy"
      />
      
      <div className="card-body d-flex flex-column">
        <h5 className="card-title">{producto.nombre}</h5>
        <p className="card-text">{producto.descripcion}</p>
        
        <div className="price-tag">
          {producto.precio.toLocaleString('es-CO', { 
            style: 'currency', 
            currency: 'COP', 
            minimumFractionDigits: 0 
          })}
          {' '}
          <span style={{ fontSize: '0.9em', fontWeight: 400 }}>COP</span>
        </div>
        
        <button
          className="btn btn-danger mt-auto"
          style={{ pointerEvents: 'none', opacity: 0.85 }}
          tabIndex={-1}
          aria-hidden="true"
        >
          <i className="bi bi-box-seam me-2"></i>
          A MI BOX
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
