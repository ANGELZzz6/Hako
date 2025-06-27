import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Form } from 'react-bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css';
import FallingLines from '../components/FallingLines';
import './Productos.css';
import type { Product } from '../services/productService';
import { useNavigate } from 'react-router-dom';

interface ProductosProps {
  products: Product[];
}

const Productos: React.FC<ProductosProps> = ({ products }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<string>('default');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const navigate = useNavigate();

  // Filtrar productos por búsqueda, categoría y precio
  const filteredProducts = products
    .filter(product => {
      // Filtro por búsqueda
      const matchesSearch = searchTerm === '' || 
        product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtro por categoría
      const matchesCategory = selectedCategory === 'todos' || product.isActive;
      
      // Filtro por rango de precio
      const matchesPrice = (!priceRange.min || product.precio >= parseFloat(priceRange.min)) &&
                          (!priceRange.max || product.precio <= parseFloat(priceRange.max));
      
      return matchesSearch && matchesCategory && matchesPrice;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.precio - b.precio;
        case 'price-desc':
          return b.precio - a.precio;
        case 'name-asc':
          return a.nombre.localeCompare(b.nombre);
        case 'name-desc':
          return b.nombre.localeCompare(a.nombre);
        default:
          return 0;
      }
    });

  // Obtener categorías únicas
  const categories = ['todos'];

  // Limpiar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('todos');
    setSortBy('default');
    setPriceRange({ min: '', max: '' });
  };

  return (
    <Container className="py-5 position-relative">
      <div className="productos-falling-lines">
        <FallingLines />
      </div>
      
      {/* Header con búsqueda */}
      <div className="search-header mb-5">
        <h1 className="text-center mb-4">Nuestros Productos</h1>
        
        {/* Barra de búsqueda principal */}
        <div className="search-container">
          <div className="search-input-wrapper">
            <i className="bi bi-search search-icon"></i>
            <input
              type="text"
              className="form-control search-input"
              placeholder="Buscar productos por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                className="btn btn-link clear-search"
                onClick={() => setSearchTerm('')}
              >
                <i className="bi bi-x-circle"></i>
              </button>
            )}
          </div>
        </div>

        {/* Resultados de búsqueda */}
        {searchTerm && (
          <div className="search-results-info">
            <p className="text-muted">
              <i className="bi bi-search me-2"></i>
              {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''} para "{searchTerm}"
            </p>
          </div>
        )}
      </div>
      
      {/* Filtros avanzados */}
      <Row className="mb-4 filters-section">
        <Col xs={12} sm={12} lg={3} className="mb-3">
          <Form.Group>
            <Form.Label>
              <i className="bi bi-tag me-2"></i>
              Categoría
            </Form.Label>
            <Form.Select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="filter-select"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        
        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Form.Group>
            <Form.Label>
              <i className="bi bi-sort-down me-2"></i>
              Ordenar por
            </Form.Label>
            <Form.Select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="default">Predeterminado</option>
              <option value="price-asc">Precio: Menor a Mayor</option>
              <option value="price-desc">Precio: Mayor a Menor</option>
              <option value="name-asc">Nombre: A-Z</option>
              <option value="name-desc">Nombre: Z-A</option>
            </Form.Select>
          </Form.Group>
        </Col>
        
        <Col xs={6} sm={6} lg={3} className="mb-3">
          <Form.Group>
            <Form.Label>
              <i className="bi bi-currency-dollar me-2"></i>
              <span className="d-none d-sm-inline">Precio mínimo</span>
              <span className="d-sm-none">Min</span>
            </Form.Label>
            <Form.Control
              type="number"
              placeholder="0"
              value={priceRange.min}
              onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
              className="filter-input"
            />
          </Form.Group>
        </Col>
        
        <Col xs={6} sm={6} lg={3} className="mb-3">
          <Form.Group>
            <Form.Label>
              <i className="bi bi-currency-dollar me-2"></i>
              <span className="d-none d-sm-inline">Precio máximo</span>
              <span className="d-sm-none">Max</span>
            </Form.Label>
            <Form.Control
              type="number"
              placeholder="∞"
              value={priceRange.max}
              onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
              className="filter-input"
            />
          </Form.Group>
        </Col>
      </Row>

      {/* Botón limpiar filtros */}
      {(searchTerm || selectedCategory !== 'todos' || sortBy !== 'default' || priceRange.min || priceRange.max) && (
        <div className="text-center mb-4">
          <button 
            className="btn btn-outline-secondary clear-filters-btn"
            onClick={clearFilters}
          >
            <i className="bi bi-x-circle me-2"></i>
            Limpiar Filtros
          </button>
        </div>
      )}

      {/* Grid de productos */}
      <Row className="g-4 mx-0">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <Col key={product._id} xs={4} sm={6} md={4} lg={3} className="px-1">
              <Card className="h-100 product-card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/productos/${product._id}`)}>
                <Card.Img 
                  variant="top" 
                  src={product.imagen_url} 
                  alt={product.nombre}
                  className="product-image"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Sin+Imagen';
                  }}
                />
                <Card.Body className="d-flex flex-column">
                  <Card.Title>{product.nombre}</Card.Title>
                  <Card.Text>{product.descripcion}</Card.Text>
                  <div className="price-tag mt-auto mb-3">
                    ${product.precio.toFixed(2)}
                  </div>
                  <Button variant="primary" className="w-100">
                    <i className="bi bi-box-seam me-2"></i>
                    A MI BOX
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))
        ) : (
          <Col xs={12} className="text-center">
            <div className="no-products-found">
              <i className="bi bi-search display-1 text-muted"></i>
              <h3 className="mt-3">No se encontraron productos</h3>
              <p className="text-muted">
                Intenta ajustar tus filtros de búsqueda o 
                <button 
                  className="btn btn-link p-0 ms-1"
                  onClick={clearFilters}
                >
                  limpiar todos los filtros
                </button>
              </p>
            </div>
          </Col>
        )}
      </Row>
    </Container>
  );
};

export default Productos; 