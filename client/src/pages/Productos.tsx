import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Form } from 'react-bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css';
import FallingLines from '../components/FallingLines';
import './Productos.css';
import type { Product } from '../services/productService';

interface ProductosProps {
  products: Product[];
}

const Productos: React.FC<ProductosProps> = ({ products }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<string>('default');

  // Filtrar y ordenar productos
  const filteredProducts = products
    .filter(product => selectedCategory === 'todos' || product.isActive) // Solo mostrar productos activos
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

  // Obtener categorías únicas (por ahora solo mostrar todos los productos activos)
  const categories = ['todos'];

  return (
    <Container className="py-5 position-relative">
      <div className="productos-falling-lines">
        <FallingLines />
      </div>
      <h1 className="text-center mb-5">Nuestros Productos</h1>
      
      {/* Filtros y ordenamiento */}
      <Row className="mb-4">
        <Col md={6} className="mb-3">
          <Form.Group>
            <Form.Label>Categoría</Form.Label>
            <Form.Select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={6} className="mb-3">
          <Form.Group>
            <Form.Label>Ordenar por</Form.Label>
            <Form.Select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="default">Predeterminado</option>
              <option value="price-asc">Precio: Menor a Mayor</option>
              <option value="price-desc">Precio: Mayor a Menor</option>
              <option value="name-asc">Nombre: A-Z</option>
              <option value="name-desc">Nombre: Z-A</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      {/* Grid de productos */}
      <Row className="g-4 mx-0">
        {filteredProducts.map((product) => (
          <Col key={product._id} xs={4} sm={6} md={4} lg={3} className="px-1">
            <Card className="h-100 product-card">
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
                  Agregar al Box
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
};

export default Productos; 