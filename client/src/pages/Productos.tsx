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
    .filter(product => selectedCategory === 'todos' || product.category === selectedCategory)
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

  // Obtener categorías únicas
  const categories = ['todos', ...new Set(products.map(product => product.category))];

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
                src={product.image} 
                alt={product.name}
                className="product-image"
              />
              <Card.Body className="d-flex flex-column">
                <Card.Title>{product.name}</Card.Title>
                <Card.Text>{product.description}</Card.Text>
                <div className="price-tag mt-auto mb-3">
                  ${product.price.toFixed(2)}
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