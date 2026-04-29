import { useState, useEffect, type FC, type MouseEvent } from 'react';
import { Container, Row, Col, Card, Form } from 'react-bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css';
import FallingLines from '../components/FallingLines';
import ProductVariantModal from '../components/ProductVariantModal';
import ConfirmModal from '../components/ConfirmModal';
import './Productos.css';
import type { Product } from '../services/productService';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import cartService from '../services/cartService';
import { useCart } from '../contexts/CartContext';
import { showSuccessToast } from '../utils/toast.ts';

interface ProductCardItemProps {
  product: Product;
  onCardClick: (id: string) => void;
  onButtonClick: (e: MouseEvent, id: string) => void;
}

const ProductCardItem: FC<ProductCardItemProps> = ({ product, onCardClick, onButtonClick }) => (
  <Col xs={6} sm={6} md={4} lg={3} className="px-1 mb-3">
    <Card
      className="h-100 product-card"
      style={{ cursor: 'pointer', position: 'relative' }}
      onClick={() => onCardClick(product._id)}
    >
      {product.isOferta && (
        <div className="oferta-ribbon">
          <i className="bi bi-tag-fill me-1"></i>¡Oferta!
        </div>
      )}
      {product.isDestacado && (
        <div className="destacado-ribbon">
          <i className="bi bi-star-fill me-1"></i>Destacado
        </div>
      )}
      <Card.Img
        variant="top"
        src={product.imagen_url}
        alt={product.nombre}
        className="product-image"
        style={{ width: '100%', height: '180px', objectFit: 'cover', objectPosition: 'center' }}
        onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Sin+Imagen'; }}
      />
      <Card.Body className="d-flex flex-column">
        <Card.Title>{product.nombre}</Card.Title>
        <Card.Text>{product.descripcion}</Card.Text>
        <div className="price-tag mt-auto mb-3">
          <span style={{ fontSize: '0.95em', fontWeight: 400, marginRight: 4 }}>COP</span>
          {product.precio.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
        </div>
        <div className="mt-auto">
          <button
            className="btn btn-danger w-100"
            onClick={(e) => onButtonClick(e, product._id)}
          >
            <i className="bi bi-box-seam me-1"></i>
            <span className="d-none d-sm-inline">A MI BOX</span>
            <span className="d-sm-none">BOX</span>
          </button>
        </div>
      </Card.Body>
    </Card>
  </Col>
);

interface ProductosProps {
  products: Product[];
}

const Productos: FC<ProductosProps> = ({ products }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [sortAndFilter, setSortAndFilter] = useState<string>('default');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { refreshCart } = useCart();

  // Estado para el modal de confirmación genérico
  const [modalConfig, setModalConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    type: 'confirm' | 'alert';
    variant: 'primary' | 'danger' | 'warning' | 'success' | 'info';
    confirmText?: string;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => { },
    type: 'alert',
    variant: 'primary'
  });

  // Helper para mostrar alertas asíncronas
  const showAlert = (title: string, message: string, variant: 'primary' | 'danger' | 'warning' | 'success' | 'info' = 'primary') => {
    return new Promise<void>((resolve) => {
      setModalConfig({
        show: true,
        title,
        message,
        onConfirm: () => {
          setModalConfig(prev => ({ ...prev, show: false }));
          resolve();
        },
        onCancel: () => {
          setModalConfig(prev => ({ ...prev, show: false }));
          resolve();
        },
        type: 'alert',
        variant
      });
    });
  };

  // Hacer scroll hacia arriba cuando se carga la página y manejar query params
  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Si viene de "Ver Ofertas" en la landing
    const filtro = searchParams.get('filtro');
    if (filtro === 'ofertas') {
      setSortAndFilter('oferta');
    }
  }, [searchParams]);

  // Obtener categorías únicas
  const categories = ['todos', ...Array.from(new Set(products.map(p => p.categoria).filter(Boolean)))];

  // Filtrar productos por búsqueda, categoría y precio
  const filteredProducts = products
    .filter(product => {
      // Filtro por búsqueda
      const matchesSearch = searchTerm === '' ||
        product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
      // Filtro por categoría
      const matchesCategory = selectedCategory === 'todos' || product.categoria === selectedCategory;
      // Filtro por rango de precio
      const matchesPrice = (!priceRange.min || product.precio >= parseFloat(priceRange.min)) &&
        (!priceRange.max || product.precio <= parseFloat(priceRange.max));
      // Filtro por tipo (oferta/destacado)
      let matchesType = true;
      if (sortAndFilter === 'oferta') matchesType = !!product.isOferta;
      if (sortAndFilter === 'destacado') matchesType = !!product.isDestacado;
      return matchesSearch && matchesCategory && matchesPrice && matchesType;
    })
    .sort((a, b) => {
      switch (sortAndFilter) {
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

  // Limpiar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('todos');
    setSortAndFilter('default');
    setPriceRange({ min: '', max: '' });
  };

  // Función para manejar la adición al carrito desde el modal de variantes
  const handleAddToCartWithVariants = async (selectedVariants: Record<string, string>, quantity: number) => {
    if (!selectedProduct) return;
    try {
      // Si el producto tiene variantes, usar addToCartWithVariants, sino usar addToCart
      if (selectedProduct.variants && selectedProduct.variants.enabled) {
        const cartItem = {
          productId: selectedProduct._id,
          quantity,
          variants: selectedVariants
        };
        await cartService.addToCartWithVariants(cartItem);
      } else {
        await cartService.addToCart(selectedProduct._id, quantity);
      }

      await refreshCart(); // Actualiza el carrito global
      setShowVariantModal(false);

      // Mostrar toast de éxito
      showSuccessToast('¡Producto agregado al box! 🎉');
    } catch (error) {
      console.error('Error al agregar al box:', error);
      await showAlert('Error', 'Error al agregar al box. Intenta de nuevo.', 'danger');
    } finally {
      // finalizado
    }
  };

  return (
    <Container className="py-3 py-md-5 position-relative">
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
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchTerm('');
                }}
              >
                <i className="bi bi-x-circle"></i>
              </button>
            )}
          </div>
          {isAuthenticated && (
            <div style={{ color: '#d32f2f', fontSize: '0.98rem', marginTop: 4 }}>
              ¿No encontraste lo que buscabas?{' '}
              <Link to="/sugerencias" style={{ color: '#d32f2f', textDecoration: 'underline', fontWeight: 500 }}>
                Ayúdanos a mejorar
              </Link>
            </div>
          )}
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
              Ordenar y filtrar
            </Form.Label>
            <Form.Select
              value={sortAndFilter}
              onChange={e => setSortAndFilter(e.target.value)}
              className="filter-select"
            >
              <option value="default">Predeterminado</option>
              <option value="price-asc">Precio: Menor a Mayor</option>
              <option value="price-desc">Precio: Mayor a Menor</option>
              <option value="name-asc">Nombre: A-Z</option>
              <option value="name-desc">Nombre: Z-A</option>
              <option value="oferta">Solo ofertas</option>
              <option value="destacado">Solo destacados</option>
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
      {(searchTerm || selectedCategory !== 'todos' || sortAndFilter !== 'default' || priceRange.min || priceRange.max) && (
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
            <ProductCardItem
              key={product._id}
              product={product}
              onCardClick={(id) => navigate(`/productos/${id}`)}
              onButtonClick={(e, id) => {
                e.stopPropagation();
                navigate(`/productos/${id}`);
              }}
            />
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

      {/* Modal de variantes */}
      {selectedProduct && (
        <ProductVariantModal
          show={showVariantModal}
          onHide={() => {
            setShowVariantModal(false);
            setSelectedProduct(null);
          }}
          product={selectedProduct}
          onAddToCart={handleAddToCartWithVariants}
        />
      )}

      {/* Modal de confirmación genérico */}
      <ConfirmModal
        show={modalConfig.show}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm}
        onCancel={modalConfig.onCancel || (() => setModalConfig(prev => ({ ...prev, show: false })))}
        variant={modalConfig.variant}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
      />
    </Container>
  );
};

export default Productos; 