import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import cartService, { type Cart } from '../services/cartService';
import './CartManagement.css';

const CartManagement: React.FC = () => {
  const [carts, setCarts] = useState<Cart[]>([]);
  const [stats, setStats] = useState({
    totalCarts: 0,
    activeCarts: 0,
    totalItems: 0,
    totalValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedCart, setSelectedCart] = useState<Cart | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    loadCarts();
    loadStats();
  }, [isAdmin]);

  const loadCarts = async () => {
    try {
      setLoading(true);
      const cartsData = await cartService.getAllCarts();
      setCarts(cartsData);
    } catch (error) {
      console.error('Error al cargar carritos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await cartService.getCartStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const handleViewCart = (cart: Cart) => {
    setSelectedCart(cart);
    setShowModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAdmin) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <h3>Acceso Denegado</h3>
          <p>No tienes permisos para acceder a esta página.</p>
        </div>
      </Container>
    );
  }

  if (loading) {
    return (
      <div className="admin-dashboard">
        <header className="admin-header-bar">
          <div className="header-content">
            <div className="header-left">
              <i className="bi bi-cart-check header-icon"></i>
              <span className="header-title">Boxes</span>
            </div>
            <div className="header-center">
              <h1 className="admin-header">
                <span className="logo-japanese">箱</span> <span className="brand-text">hako</span> <span className="develop-text">Develop</span>
              </h1>
            </div>
            <div className="header-right">
              <Link to="/admin" className="back-link">
                <i className="bi bi-arrow-left-circle header-icon"></i>
              </Link>
            </div>
          </div>
        </header>
        <main className="admin-main-content">
          <Container className="py-5">
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p className="mt-3">Cargando carritos...</p>
            </div>
          </Container>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header-bar">
        <div className="header-content">
          <div className="header-left">
            <i className="bi bi-cart-check header-icon"></i>
            <span className="header-title">Boxes</span>
          </div>
          <div className="header-center">
            <h1 className="admin-header">
              <span className="logo-japanese">箱</span> <span className="brand-text">hako</span> <span className="develop-text">Develop</span>
            </h1>
          </div>
          <div className="header-right">
            <Link to="/admin" className="back-link">
              <i className="bi bi-arrow-left-circle header-icon"></i>
            </Link>
          </div>
        </div>
      </header>

      <main className="admin-main-content">
        <Container className="py-5">
          <h2 className="mb-4">Gestión de Boxes</h2>
          
          {/* Estadísticas */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className="text-center stats-card">
                <Card.Body>
                  <h3 className="text-primary">{stats.totalCarts}</h3>
                  <p className="text-muted mb-0">Total de Boxes</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center stats-card">
                <Card.Body>
                  <h3 className="text-success">{stats.activeCarts}</h3>
                  <p className="text-muted mb-0">Boxes Activos</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center stats-card">
                <Card.Body>
                  <h3 className="text-info">{stats.totalItems}</h3>
                  <p className="text-muted mb-0">Total de Items</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center stats-card">
                <Card.Body>
                  <h3 className="text-warning">${stats.totalValue.toLocaleString('es-CO')}</h3>
                  <p className="text-muted mb-0">Valor Total</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Tabla de carritos */}
          <Card>
            <Card.Header>
              <h5 className="mb-0">Lista de Boxes</h5>
            </Card.Header>
            <Card.Body>
              <Table responsive striped hover>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Usuario</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Creado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {carts.map((cart) => (
                    <tr key={cart._id}>
                      <td>
                        <small className="text-muted">{cart._id.slice(-8)}</small>
                      </td>
                      <td>
                        <div>
                          <strong>
                            {typeof cart.id_usuario === 'object' && cart.id_usuario !== null
                              ? cart.id_usuario.nombre
                              : cart.id_usuario}
                          </strong>
                          {typeof cart.id_usuario === 'object' && cart.id_usuario !== null && (
                            <div>
                              <small className="text-muted">{cart.id_usuario.email}</small>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <Badge bg="info">{cart.items.length} productos</Badge>
                      </td>
                      <td>
                        <strong>${cart.total.toLocaleString('es-CO')}</strong>
                      </td>
                      <td>
                        {cart.items.length > 0 ? (
                          <Badge bg="success">Activo</Badge>
                        ) : (
                          <Badge bg="secondary">Vacío</Badge>
                        )}
                      </td>
                      <td>
                        <small>{formatDate(cart.creado_en)}</small>
                      </td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleViewCart(cart)}
                        >
                          <i className="bi bi-eye me-1"></i>
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          {/* Modal para ver detalles del carrito */}
          <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
            <Modal.Header closeButton>
              <Modal.Title>Detalles del Box</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {selectedCart && (
                <div>
                  <div className="mb-3">
                    <strong>ID del Box:</strong> {selectedCart._id}
                  </div>
                  <div className="mb-3">
                    <strong>Usuario:</strong> {
                      typeof selectedCart.id_usuario === 'object' && selectedCart.id_usuario !== null
                        ? selectedCart.id_usuario.nombre
                        : selectedCart.id_usuario
                    }
                    {typeof selectedCart.id_usuario === 'object' && selectedCart.id_usuario !== null && (
                      <div>
                        <small className="text-muted">{selectedCart.id_usuario.email}</small>
                      </div>
                    )}
                  </div>
                  <div className="mb-3">
                    <strong>Creado:</strong> {formatDate(selectedCart.creado_en)}
                  </div>
                  <div className="mb-3">
                    <strong>Actualizado:</strong> {formatDate(selectedCart.actualizado_en)}
                  </div>
                  
                  <h6>Productos en el Box:</h6>
                  {selectedCart.items.length > 0 ? (
                    <div className="table-responsive">
                      <Table size="sm">
                        <thead>
                          <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Precio Unit.</th>
                            <th>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCart.items.map((item, index) => (
                            <tr key={index}>
                              <td>
                                <div className="d-flex align-items-center">
                                  <img
                                    src={item.imagen_producto}
                                    alt={item.nombre_producto}
                                    style={{ width: '40px', height: '40px', objectFit: 'cover', marginRight: '10px' }}
                                    onError={(e) => {
                                      e.currentTarget.src = 'https://via.placeholder.com/40x40?text=Sin+Imagen';
                                    }}
                                  />
                                  <span>{item.nombre_producto}</span>
                                </div>
                              </td>
                              <td>{item.cantidad}</td>
                              <td>${item.precio_unitario.toLocaleString('es-CO')}</td>
                              <td>${(item.precio_unitario * item.cantidad).toLocaleString('es-CO')}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={3} className="text-end"><strong>Total:</strong></td>
                            <td><strong>${selectedCart.total.toLocaleString('es-CO')}</strong></td>
                          </tr>
                        </tfoot>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-muted">Este box está vacío.</p>
                  )}
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cerrar
              </Button>
            </Modal.Footer>
          </Modal>
        </Container>
      </main>
    </div>
  );
};

export default CartManagement; 