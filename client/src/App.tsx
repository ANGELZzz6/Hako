import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css'; // Para los íconos como el del carrito
import { Carousel } from 'react-bootstrap';
import BoxAnimation from './components/BoxAnimation';
import FallingLines from './components/FallingLines';
import Productos from './pages/Productos';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import InventoryManagement from './pages/InventoryManagement';
import SupportPage from './pages/SupportManagement';
import ProtectedRoute from './components/ProtectedRoute';
import AdminOnly from './components/AdminOnly';
import './App.css'; // Puedes mover los estilos en línea aquí
import anuncioVideo from './assets/anuncio.mp4';
import ubicacion from './assets/ubicacion.png';
import productService from './services/productService';
import type { Product } from './services/productService';
import { useAuth } from './contexts/AuthContext';
import cartService from './services/cartService';
import type { Cart } from './services/cartService';
import ProductDetail from './pages/ProductDetail';
import ProfilePage from './pages/ProfilePage';
import CartManagement from './pages/CartManagement';
import { useMobileViewport } from './hooks/useMobileViewport';

// Importar fuente Montserrat
import '@fontsource/montserrat/300.css';
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/800.css';

const App = () => {
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Usar el contexto de autenticación
  const { currentUser, isAuthenticated, logout, isAdmin } = useAuth();

  // Forzar resolución móvil
  useMobileViewport();

  // Efecto para cargar productos
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await productService.getAllProducts();
        setProducts(data);
      } catch (error) {
        console.error('Error al cargar productos:', error);
      }
    };
    loadProducts();
  }, []);

  // Efecto para cargar el carrito si el usuario está autenticado
  useEffect(() => {
    const loadCart = async () => {
      if (isAuthenticated) {
        try {
          const cartData = await cartService.getCart();
          setCart(cartData);
        } catch (error) {
          console.error('Error al cargar el carrito:', error);
        }
      }
    };
    loadCart();
  }, [isAuthenticated]);

  // Efecto para manejar el tema
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkTheme(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  // Función para cambiar el tema
  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
    document.documentElement.setAttribute('data-theme', !isDarkTheme ? 'dark' : 'light');
    localStorage.setItem('theme', !isDarkTheme ? 'dark' : 'light');
  };

  const handleNavCollapse = () => setIsNavCollapsed(!isNavCollapsed);

  const handleVideoToggle = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  const handleVideoEnd = () => {
    setIsVideoPlaying(false);
  };

  const handleOpenGoogleMaps = () => {
    const storeLocation = {
      lat: 4.701816097338806,
      lng: -74.1201097123357,
      name: "Hako Store"
    };
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${storeLocation.lat},${storeLocation.lng}&query_place_id=${encodeURIComponent(storeLocation.name)}`;
    window.open(mapsUrl, '_blank');
  };

  // Función para agrupar productos en grupos de 4
  const chunkArray = (arr: Product[], size: number): Product[][] => {
    const chunkedArr: Product[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunkedArr.push(arr.slice(i, i + size));
    }
    return chunkedArr;
  };

  const productGroups = chunkArray(products, 4);

  // Función para manejar el logout
  const handleLogout = () => {
    logout();
    setCart(null);
  };

  // Función para manejar click en producto (ir a detalle)
  const handleProductClick = (productId: string) => {
    navigate(`/productos/${productId}`);
  };

  // Función para agregar producto al carrito
  const handleAddToCart = async (e: React.MouseEvent, productId: string) => {
    e.stopPropagation(); // Evitar que se active el onClick de la tarjeta
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      await cartService.addToCart(productId, 1);
      
      // Actualizar el carrito
      const updatedCart = await cartService.getCart();
      setCart(updatedCart);
      
      // Mostrar toast de éxito
      const toast = document.createElement('div');
      toast.className = 'toast-success';
      toast.innerHTML = `
        <div style="
          position: fixed; top: 20px; right: 20px; 
          background: #28a745; color: white; padding: 1rem 1.5rem; 
          border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 10000; animation: slideInRight 0.3s ease;
          display: flex; align-items: center; gap: 0.5rem;
        ">
          <i class="bi bi-check-circle-fill"></i>
          ¡Producto agregado al box! 🎉
        </div>
      `;
      document.body.appendChild(toast);
      
      // Remover toast después de 3 segundos
      setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 3000);
      
    } catch (error) {
      console.error('Error al agregar al box:', error);
      alert('Error al agregar al box. Intenta de nuevo.');
    }
  };

  // Renderizar el contenido según la ruta
  const renderContent = () => {
    if (location.pathname === '/productos') {
      return <Productos products={products} />;
    }

    // Verificar que los productos existan antes de renderizar
    if (!products || products.length === 0) {
      return (
        <div className="container py-5 text-center">
          <div className="spinner"></div>
          <p>Cargando productos...</p>
        </div>
      );
    }

    return (
      <>
        {/* Hero Section */}
        <section className="hero-section">
          <FallingLines />
          <div className="container position-relative" style={{ zIndex: 2 }}>
            <div className="row align-items-center">
              {/* Columna del Video */}
              <div className="col-md-6">
                <div className="ratio ratio-16x9">
                  <video 
                    ref={videoRef}
                    className="rounded shadow"
                    autoPlay 
                    muted 
                    playsInline
                    onEnded={handleVideoEnd}
                  >
                    <source src={anuncioVideo} type="video/mp4" />
                    Tu navegador no soporta el elemento de video.
                  </video>
                  <button
                    className="video-control-btn"
                    onClick={handleVideoToggle}
                    aria-label={isVideoPlaying ? 'Pausar video' : 'Reproducir video'}
                  >
                    <i className={`bi bi-${isVideoPlaying ? 'pause' : 'play'}-fill`}></i>
                  </button>
                </div>
              </div>
              {/* Columna del Texto */}
              <div className="col-md-6 text-center text-md-start">
                <BoxAnimation />
                <h1 className="display-4 fade-in">Bienvenido a Hako</h1>
                <p className="lead fade-in">Descubre nuestros productos exclusivos con los mejores precios</p>
                <div className="d-flex gap-3 justify-content-center justify-content-md-start mt-4">
                  <Link to="/productos" className="btn btn-danger btn-lg">
                    <i className="bi bi-shop me-2"></i>Ver Productos
                  </Link>
                  <a href="#ofertas" className="btn btn-outline-primary btn-lg">
                    <i className="bi bi-tag me-2"></i>Ver Ofertas
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Segunda Hero Section */}
        <section className="hero-section hero-section-alt">
          <FallingLines />
          <div className="container position-relative" style={{ zIndex: 2 }}>
            <div className="row align-items-center">
              {/* Columna del Texto (Ahora a la izquierda) */}
              <div className="col-md-6 text-center text-md-start">
                <h2 className="display-4 fade-in">Recoge tus compras al instante</h2>
                <p className="lead fade-in">Ya no tienes que esperar a que te llegue tu pedido, recogelo en el momento que quieras.</p>
                <div className="features-list fade-in">
                  <div className="feature-item">
                    <i className="bi bi-cash-coin text-primary me-2"></i>
                    Pagos seguros y rápidos
                  </div>
                  <div className="feature-item">
                    <i className="bi bi-person-check text-primary me-2"></i>
                    Productos calificados por el personal
                  </div>
                  <div className="feature-item">
                    <i className="bi bi-person-check text-primary me-2"></i>
                    Soporte al usuario 24/7
                  </div>
                  <div className="feature-item">
                    <i className="bi bi-shield-check text-primary me-2"></i>
                    Productos 100% garantizados
                  </div>
                  <div className="feature-item">
                    <i className="bi bi-shield-check text-primary me-2"></i>
                    Rembolso por artículo defectuoso
                  </div>
                  <div className="feature-item">
                    <i className="bi bi-shield-check text-primary me-2"></i>
                    Datos personales protegidos
                  </div>
                </div>
                <div className="d-flex gap-3 justify-content-center justify-content-md-start mt-4">
                  <button 
                    onClick={handleOpenGoogleMaps}
                    className="btn btn-danger btn-lg">
                    <i className="bi bi-geo-alt me-2"></i>Consultar zona
                  </button>
                </div>
              </div>
              {/* Columna de la Imagen (Ahora a la derecha) */}
              <div className="col-md-6">
                <div className="delivery-image-container">
                  <img 
                    src={ubicacion}
                    alt="Servicio de envíos"
                    className="img-fluid rounded shadow fade-in"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Productos */}
        <section className="hero-section hero-section-productos" id="productos">
          <div className="container">
            <h2>Productos Destacados</h2>
            <Carousel 
              className="productos-carousel"
              indicators={true}
              controls={true}
            >
              {productGroups.map((group, groupIndex) => (
                <Carousel.Item key={groupIndex}>
                  <div className="container">
                    <div className="row g-4">
                      {group.map((product) => (
                        <div className="col-6 col-md-4" key={product._id}>
                          <div className="card" style={{ cursor: 'pointer' }} onClick={() => handleProductClick(product._id)}>
                            <img 
                              src={product.imagen_url}
                              className="card-img-top" 
                              alt={product.nombre}
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Sin+Imagen';
                              }}
                            />
                            <div className="card-body d-flex flex-column">
                              <h5 className="card-title">{product.nombre}</h5>
                              <p className="card-text">{product.descripcion}</p>
                              <div className="price-tag">
                                ${product.precio.toFixed(2)}
                              </div>
                              <button 
                                className="btn btn-danger mt-auto"
                                onClick={(e) => handleAddToCart(e, product._id)}
                              >
                                <i className="bi bi-box-seam me-2"></i>
                                A MI BOX
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Carousel.Item>
              ))}
            </Carousel>
            <Link to="/productos" className="ver-mas-btn">
              <i className="bi bi-arrow-right-circle me-2"></i>
              Ver más productos
            </Link>
          </div>
        </section>
      </>
    );
  };

  const showNavbar = location.pathname !== '/admin' && !location.pathname.startsWith('/admin/');

  return (
    <>
      {/* Navbar */}
      {showNavbar && (
        <nav className="navbar navbar-expand-lg navbar-light bg-light sticky-top">
          <div className="container">
            <Link className="navbar-brand d-flex align-items-center" to="/">
              <span>箱</span><span className="brand-text">hako</span>
            </Link>
            <button 
              className="navbar-toggler" 
              type="button" 
              onClick={handleNavCollapse}
              aria-expanded={!isNavCollapsed}
            >
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className={`${isNavCollapsed ? 'collapse' : ''} navbar-collapse`}>
              <ul className="navbar-nav me-auto">
                <li className="nav-item">
                  <Link className="nav-link" to="/"><i className="bi bi-house-door me-1"></i>Inicio</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/productos"><i className="bi bi-grid me-1"></i>Productos</Link>
                </li>
                <li className="nav-item">
                  <a className="nav-link" href="#ofertas"><i className="bi bi-tag me-1"></i>Ofertas</a>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/soporte"><i className="bi bi-headset me-1"></i>Soporte</Link>
                </li>
              </ul>
              <div className="d-flex flex-column flex-lg-row gap-2 align-items-center">
                <button
                  className="theme-switch"
                  onClick={toggleTheme}
                  aria-label={isDarkTheme ? 'Activar modo claro' : 'Activar modo oscuro'}
                >
                  <i className={`bi bi-${isDarkTheme ? 'sun' : 'moon'}-fill`}></i>
                </button>
                <Link to="/cart" className="btn btn-outline-primary">
                  <i className="bi bi-box-seam me-1"></i>
                  Tu Box <span className="badge bg-primary">{cart?.items.length || 0}</span>
                </Link>
                {isAuthenticated ? (
                  <div className="d-flex gap-2 align-items-center">
                    <AdminOnly>
                      <Link to="/admin" className="btn btn-outline-danger">
                        <i className="bi bi-shield-lock me-1"></i>
                        Admin
                      </Link>
                    </AdminOnly>
                    <button 
                      className="btn btn-danger"
                      onClick={handleLogout}
                    >
                      <i className="bi bi-box-arrow-right me-1"></i>
                      Cerrar Sesión
                    </button>
                    <Link to="/profile" className="user-icon-container">
                      <i className="bi bi-person-circle user-icon"></i>
                    </Link>
                  </div>
                ) : (
                  <>
                    <Link to="/login" className="btn btn-primary">
                      <i className="bi bi-person me-1"></i>
                      Iniciar Sesión
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Contenido principal */}
      <Routes>
        <Route path="/" element={renderContent()} />
        <Route path="/productos" element={renderContent()} />
        <Route path="/productos/:id" element={<ProductDetail />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/cart" element={
          <ProtectedRoute>
            <CartPage />
          </ProtectedRoute>
        } />
        <Route path="/checkout" element={
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        } />
        <Route path="/order-confirmation" element={
          <ProtectedRoute>
            <OrderConfirmationPage />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute requireAdmin>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute requireAdmin>
            <UserManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/inventory" element={
          <ProtectedRoute requireAdmin>
            <InventoryManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/support" element={
          <ProtectedRoute requireAdmin>
            <SupportPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/carts" element={
          <ProtectedRoute requireAdmin>
            <CartManagement />
          </ProtectedRoute>
        } />
        <Route path="/soporte" element={<SupportPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/cart-management" element={<CartManagement />} />
      </Routes>

      {/* Footer */}
      <footer className="bg-light py-4 mt-5">
        <div className="container">
          <div className="row g-4">
            <div className="col-12 col-md-4">
              <h5 className="mb-3">Mi Tienda</h5>
              <p className="text-muted">Tu tienda online de confianza con los mejores productos y precios del mercado.</p>
              <div className="d-flex gap-3">
                <a href="#" className="text-decoration-none fs-5"><i className="bi bi-facebook"></i></a>
                <a href="#" className="text-decoration-none fs-5"><i className="bi bi-instagram"></i></a>
                <a href="#" className="text-decoration-none fs-5"><i className="bi bi-twitter"></i></a>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <h5 className="mb-3">Enlaces Rápidos</h5>
              <ul className="list-unstyled">
                <li className="mb-2"><a href="#" className="text-decoration-none"><i className="bi bi-chevron-right me-1"></i>Sobre Nosotros</a></li>
                <li className="mb-2"><a href="#" className="text-decoration-none"><i className="bi bi-chevron-right me-1"></i>Términos y Condiciones</a></li>
                <li className="mb-2"><a href="#" className="text-decoration-none"><i className="bi bi-chevron-right me-1"></i>Política de Privacidad</a></li>
                <li className="mb-2"><a href="#" className="text-decoration-none"><i className="bi bi-chevron-right me-1"></i>Preguntas Frecuentes</a></li>
              </ul>
            </div>
            <div className="col-12 col-md-4">
              <h5 className="mb-3">Contacto</h5>
              <ul className="list-unstyled">
                <li className="mb-2"><i className="bi bi-envelope me-2"></i>contacto@mitienda.com</li>
                <li className="mb-2"><i className="bi bi-telephone me-2"></i>(123) 456-7890</li>
                <li className="mb-2"><i className="bi bi-geo-alt me-2"></i>Calle Principal #123, Ciudad</li>
              </ul>
            </div>
          </div>
          <hr className="my-4" />
          <div className="text-center text-muted">
            <small>&copy; {new Date().getFullYear()} Mi Tienda. Todos los derechos reservados.</small>
          </div>
        </div>
      </footer>
    </>
  );
};

export default App;
