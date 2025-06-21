import React from 'react';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
  status: string;
}

interface ProductRowProps {
  product: Product;
}

const ProductRow: React.FC<ProductRowProps> = ({ product }) => {
  const getStatusBadge = (status: string) => {
    const statusClass = status === 'active' ? 'status-active' : 'status-inactive';
    const statusText = status === 'active' ? 'Publicado' : 'Borrador';

    return (
      <span className={`status-badge ${statusClass}`}>
        {statusText}
      </span>
    );
  };

  return (
    <tr>
      <td>{product.name}</td>
      <td>${product.price.toFixed(2)}</td>
      <td>{product.stock}</td>
      <td>{product.category}</td>
      <td>{getStatusBadge(product.status)}</td>
      <td className="action-buttons">
        <button
          className="btn-action btn-edit"
          onClick={() => console.log('Edit product:', product.id)}
          aria-label={`Editar producto ${product.name}`}
        >
          <i className="bi bi-pencil-square"></i>
        </button>
        <button
          className="btn-action btn-delete"
          onClick={() => console.log('Delete product:', product.id)}
          aria-label={`Borrar producto ${product.name}`}
        >
          <i className="bi bi-trash3-fill"></i>
        </button>
      </td>
    </tr>
  );
};

export default ProductRow; 