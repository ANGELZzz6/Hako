import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './InventoryManagement.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import SearchBar from '../components/SearchBar';
import ProductTable from '../components/ProductTable';

const mockProducts = [
  { id: 1, name: 'Laptop Pro', description: 'Potente laptop para profesionales', price: 1500.00, stock: 25, category: 'Electrónica', status: 'active' },
  { id: 2, name: 'T-Shirt Logo', description: 'Camiseta de algodón con logo', price: 25.50, stock: 150, category: 'Ropa', status: 'active' },
  { id: 3, name: 'Cafetera Express', description: 'Prepara el mejor café en casa', price: 89.99, stock: 0, category: 'Hogar', status: 'inactive' },
  { id: 4, name: 'Zapatillas Runner', description: 'Calzado ideal para correr', price: 120.00, stock: 80, category: 'Calzado', status: 'active' },
  { id: 5, name: 'Libro de Ciencia Ficción', description: 'Una aventura en el espacio', price: 19.95, stock: 200, category: 'Libros', status: 'active' },
];

const InventoryManagement = () => {
  const [products, setProducts] = useState(mockProducts);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="inventory-management">
      <header className="inventory-header-bar">
        <div className="header-content">
          <div className="header-left">
            <i className="bi bi-box-seam header-icon"></i>
            <span className="header-title">Inventory</span>
          </div>
          <div className="header-center">
            <h1 className="inventory-header">
              <span className="logo-japanese">箱</span>
              <span className="brand-text">hako</span>
              <span className="develop-text">Develop</span>
            </h1>
          </div>
          <div className="header-right">
            <Link to="/admin" className="back-link">
              <i className="bi bi-arrow-left-circle header-icon"></i>
            </Link>
          </div>
        </div>
      </header>

      <main className="inventory-main-content">
        <div className="container">
          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
          <ProductTable products={filteredProducts} />
        </div>
      </main>
    </div>
  );
};

export default InventoryManagement; 