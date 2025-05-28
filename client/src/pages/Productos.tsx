import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Form } from 'react-bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css';
import FallingLines from '../components/FallingLines';
import './Productos.css';

interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  image: string;
  category: string;
}

const Productos: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<string>('default');

  // Datos de ejemplo para los productos
  const products: Product[] = [
    {
      id: 1,
      name: "Box Premium",
      price: 99.99,
      description: "Box premium con productos seleccionados y exclusivos.",
      image: "https://via.placeholder.com/300x300?text=Box+Premium",
      category: "premium"
    },
    {
      id: 2,
      name: "Box Gamer",
      price: 149.99,
      description: "Box especial para gamers con accesorios y coleccionables.",
      image: "https://via.placeholder.com/300x300?text=Box+Gamer",
      category: "gamer"
    },
    {
      id: 3,
      name: "Box Anime",
      price: 199.99,
      description: "Box temático de anime con figuras y merchandising exclusivo.",
      image: "https://via.placeholder.com/300x300?text=Box+Anime",
      category: "anime"
    },
    {
      id: 4,
      name: "Box Kawaii",
      price: 129.99,
      description: "Box lleno de productos kawaii y accesorios adorables.",
      image: "https://via.placeholder.com/300x300?text=Box+Kawaii",
      category: "kawaii"
    },
    {
      id: 5,
      name: "Box Retro",
      price: 179.99,
      description: "Box con artículos retro y coleccionables vintage.",
      image: "https://via.placeholder.com/300x300?text=Box+Retro",
      category: "retro"
    },
    {
      id: 6,
      name: "Box Sorpresa",
      price: 89.99,
      description: "Box misterioso con productos sorpresa de alta calidad.",
      image: "https://via.placeholder.com/300x300?text=Box+Sorpresa",
      category: "sorpresa"
    },
    {
      id: 7,
      name: "Box Deluxe",
      price: 249.99,
      description: "Box de lujo con productos premium y ediciones limitadas.",
      image: "https://via.placeholder.com/300x300?text=Box+Deluxe",
      category: "premium"
    },
    {
      id: 8,
      name: "Box Coleccionista",
      price: 299.99,
      description: "Box especial para coleccionistas con items exclusivos.",
      image: "https://via.placeholder.com/300x300?text=Box+Coleccionista",
      category: "coleccionista"
    },
    {
      id: 9,
      name: "Box Manga",
      price: 159.99,
      description: "Box con mangas selectos y artículos relacionados.",
      image: "https://via.placeholder.com/300x300?text=Box+Manga",
      category: "manga"
    },
    {
      id: 10,
      name: "Box Arte",
      price: 189.99,
      description: "Box con materiales de arte y productos creativos.",
      image: "https://via.placeholder.com/300x300?text=Box+Arte",
      category: "arte"
    },
    {
      id: 11,
      name: "Box Limited",
      price: 399.99,
      description: "Box de edición limitada con productos únicos.",
      image: "https://via.placeholder.com/300x300?text=Box+Limited",
      category: "limited"
    },
    {
      id: 12,
      name: "Box Popular",
      price: 79.99,
      description: "Box con los productos más populares del momento.",
      image: "https://via.placeholder.com/300x300?text=Box+Popular",
      category: "popular"
    }
  ];

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
          <Col key={product.id} xs={4} sm={6} md={4} lg={3} className="px-1">
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
                  A MI BOX
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