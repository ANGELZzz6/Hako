import React from 'react';
import type { Product } from '../services/productService';
import ProductRow from './ProductRow';

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onToggleStatus: (productId: string) => void;
}

const ProductTable: React.FC<ProductTableProps> = ({ products, onEdit, onDelete, onToggleStatus }) => {
  return (
    <div className="table-wrapper">
      <div className="mobile-scroll-hint">
        <span>← Desliza horizontalmente para ver más columnas →</span>
      </div>
      <div className="table-container">
        <table className="product-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Fecha de Creación</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <ProductRow 
                key={product._id} 
                product={product} 
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleStatus={onToggleStatus}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductTable; 