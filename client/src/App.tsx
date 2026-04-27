import { useState, useRef, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import BoxAnimation from './components/BoxAnimation';
import ProductCard from './components/ProductCard';
import appointmentService from './services/appointmentService';
import FallingLines from './components/FallingLines';
import Productos from './pages/Productos';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import CartPage from './pages/CartPage';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import InventoryManagement from './pages/InventoryManagement';
import SupportPage from './pages/SupportManagement';
import ProtectedRoute from './components/ProtectedRoute';
import AdminOnly from './components/AdminOnly';
import './App.css';
import anuncioVideo from './assets/anuncio.mp4';
import ubicacion from './assets/ubicacion.png';
import productService from './services/productService';
import type { Product } from './services/productService';
import { useAuth } from './contexts/AuthContext';
import ProductDetail from './pages/ProductDetail';
import ProfilePage from './pages/ProfilePage';
import CartManagement from './pages/CartManagement';
import AdminSupportPage from './pages/AdminSupport';
import PaymentManagement from './pages/PaymentManagement';
import { CartProvider, useCart } from './contexts/CartContext';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SplashScreen from './components/SplashScreen';
import SugerenciasPage from './pages/SugerenciasPage';
import CheckoutPage from './pages/CheckoutPage';
import PaymentResultPage from './pages/PaymentResultPage';
import OrdersPage from './pages/OrdersPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminLockersPage from './pages/AdminLockersPage';
import AdminAppointmentsPage from './pages/AdminAppointmentsPage';
import AdminSupportCompleteFlow from './pages/AdminSupportCompleteFlow';
import AdminProductTestPage from './pages/AdminProductTestPage';
import AdminMonitoringPage from './pages/AdminMonitoringPage';
import AdminContentEditorPage from './pages/AdminContentEditorPage';
import orderService from './services/orderService';

import { SiteSettingsProvider, useSiteSettings } from './contexts/SiteSettingsContext';

// Importar fuente Montserrat
import '@fontsource/montserrat/300.css';
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/800.css';

const AppContent = () => {
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Usar el contexto de autenticación
  const { isAuthenticated, logout } = useAuth();
  const { cart, setCart, clearCart } = useCart();

  const { settings } = useSiteSettings();

  const [showSplash, setShowSplash] = useState(!isAuthenticated);
  const [showReservationAlert, setShowReservationAlert] = useState(false);
  const [myActiveReservations, setMyActiveReservations] = useState<Array<{ locker: number; date: string; time: string }>>([]);

  // Efecto para cargar productos
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await productService.getProducts({ limit: 100 });
        setProducts(data.products);
      } catch (error) {
        console.error('Error al cargar productos:', error);
      }
    };
    loadProducts();
  }, []);

  // Efecto para manejar el tema
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkTheme(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  // Efecto para detectar si el usuario viene de un pago
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('id') && urlParams.get('status') && urlParams.get('reference')) {
      navigate(`/payment-result?${urlParams.toString()}`);
    }
  }, [navigate]);

  // Efecto para limpiar el estado de pago cuando se navega a la página principal
  useEffect(() => {
    if (location.pathname === '/') {
      cleanupPaymentState();
    }
  }, [location.pathname]);

  // Efecto para verificar productos sin reservar solo si está autenticado y en Home
  useEffect(() => {
    const checkUnreservedProducts = async () => {
      if (isAuthenticated && location.pathname === '/') {
        try {
          const items = await orderService.getMyPurchasedProducts();
          const hasUnreserved = items.some(item => (item as any).status === 'available');
          setShowReservationAlert(hasUnreserved);
          // Cargar reservas activas del usuario para colorear casilleros
          const myApps = await appointmentService.getMyAppointments();
          const active = myApps
            .filter((a: any) => a.status !== 'cancelled' && a.status !== 'completed')
            .flatMap((a: any) => (a.itemsToPickup || []).map((it: any) => ({
              locker: it.lockerNumber,
              date: new Date(a.scheduledDate).toISOString().split('T')[0],
              time: a.timeSlot
            })));
          setMyActiveReservations(active);
        } catch (err) {
          setShowReservationAlert(false);
          setMyActiveReservations([]);
        }
      } else {
        setShowReservationAlert(false);
        setMyActiveReservations([]);
      }
    };
    checkUnreservedProducts();
  }, [isAuthenticated, location.pathname]);

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

  // Filtrar solo productos destacados para la sección de inicio
  const productosDestacados = products.filter(p => p.isDestacado);

  // Función para limpiar el estado
  const cleanupPaymentState = () => {
    // Wompi no requiere limpieza compleja de SDK en el lado del cliente (Redirect Flow)
    localStorage.removeItem('payment_auto_reload');
  };

  // Función para manejar el logout
  const handleLogout = () => {
    logout();
    if (clearCart) {
      clearCart();
    } else {
      setCart(null);
    }
    cleanupPaymentState();
  };

  // Función para manejar click en producto (ir a detalle)
  const handleProductClick = (productId: string) => {
    navigate(`/productos/${productId}`);
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
        {/* Aviso de productos sin reservar */}
        {showReservationAlert && (
          <div className="alert alert-warning d-flex flex-column flex-md-row justify-content-center align-items-center gap-3 mb-4 text-center" role="alert">
            <span className="d-flex align-items-center gap-2" style={{ fontSize: '1.15rem' }}>
              <i className="bi bi-box2-heart" style={{ color: '#d32f2f', fontSize: '1.5rem' }}></i>
              ¡Tienes productos sin reservar! Haz tu reserva para recogerlos.
            </span>
            <button className="btn btn-primary mt-2 mt-md-0" onClick={() => navigate('/mis-pedidos')}>
              Ir a Reservar
            </button>
          </div>
        )}
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
                <BoxAnimation highlightRandomCell={showReservationAlert} reservations={myActiveReservations} />
                <h1 className="display-4 fade-in">{settings?.heroTitle || 'Bienvenido a Hako'}</h1>
                <p className="lead fade-in">{settings?.heroDescription || 'Descubre nuestros productos exclusivos con los mejores precios'}</p>
                <div className="d-flex gap-3 justify-content-center justify-content-md-start mt-4">
                  <Link to="/productos" className="btn btn-danger btn-lg">
                    <i className="bi bi-shop me-2"></i>{settings?.heroCtaText || 'Ver Productos'}
                  </Link>
                  <Link to="/productos?filtro=ofertas" className="btn btn-outline-primary btn-lg">
                    <i className="bi bi-tag me-2"></i>Ver Ofertas
                  </Link>
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
            <div className="carousel-productos">
              {productosDestacados.map(producto => (
                <div key={producto._id} className="product-card-wrapper">
                  <ProductCard 
                    producto={producto}
                    onClick={handleProductClick}
                    showStars={true}
                  />
                </div>
              ))}
            </div>
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

  if (showSplash && !isAuthenticated) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <>
      {/* Navbar */}
      {showNavbar && (
        <nav className="navbar navbar-expand-lg navbar-light bg-light sticky-top">
          <div className="container">
            <a
              className="navbar-brand d-flex align-items-center"
              href="/"
              onClick={(e) => {
                e.preventDefault();
                cleanupPaymentState();
                window.location.href = '/';
              }}
            >
              <span>箱</span><span className="brand-text">hako</span>
            </a>
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
                  <a
                    className="nav-link"
                    href="/"
                    onClick={(e) => {
                      e.preventDefault();
                      cleanupPaymentState();
                      window.location.href = '/';
                    }}
                  >
                    <i className="bi bi-house-door me-1"></i>Inicio
                  </a>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/productos"><i className="bi bi-grid me-1"></i>Productos</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/soporte"><i className="bi bi-headset me-1"></i>Soporte</Link>
                </li>
              </ul>
              <div className="navbar__auth-actions">
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
                  <div className="d-flex flex-wrap gap-2 justify-content-center align-items-center">
                    <AdminOnly>
                      <Link to="/admin" className="btn btn-outline-danger">
                        <i className="bi bi-shield-lock me-1"></i>
                        Admin
                      </Link>
                    </AdminOnly>
                    <Link to="/mis-pedidos" className="btn btn-outline-primary">
                      <i className="bi bi-clipboard-check me-1"></i>
                      Mi Pedido
                    </Link>
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
                    <Link to="/login" className="btn" style={{ backgroundColor: 'var(--primary-color)', color: '#fff', border: 'none' }}>
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

      {/* Promo Banner */}
      {showNavbar && settings?.promoBannerEnabled && settings?.promoBannerMessage && (
        <div className="bg-warning text-dark text-center py-2 fw-semibold">
          {settings.promoBannerMessage}
        </div>
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
            <AdminSupportPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/carts" element={
          <ProtectedRoute requireAdmin>
            <CartManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/payments" element={
          <ProtectedRoute requireAdmin>
            <PaymentManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/orders" element={<ProtectedRoute requireAdmin><AdminOrdersPage /></ProtectedRoute>} />
        <Route path="/admin/lockers" element={<ProtectedRoute requireAdmin><AdminLockersPage /></ProtectedRoute>} />
        <Route path="/admin/appointments" element={<ProtectedRoute requireAdmin><AdminAppointmentsPage /></ProtectedRoute>} />
        <Route path="/admin/monitoring" element={<ProtectedRoute requireAdmin><AdminMonitoringPage /></ProtectedRoute>} />
        <Route path="/admin/content" element={<ProtectedRoute requireAdmin><AdminContentEditorPage /></ProtectedRoute>} />
        <Route path="/admin/support-complete" element={<ProtectedRoute requireAdmin><AdminSupportCompleteFlow /></ProtectedRoute>} />
        <Route path="/admin/product-test" element={<ProtectedRoute requireAdmin><AdminProductTestPage /></ProtectedRoute>} />
        <Route path="/soporte" element={<SupportPage />} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/cart-management" element={<ProtectedRoute><CartManagement /></ProtectedRoute>} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/sugerencias" element={<SugerenciasPage />} />
        <Route path="/payment-result" element={
          <ProtectedRoute>
            <PaymentResultPage />
          </ProtectedRoute>
        } />
        <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
        <Route path="/mis-pedidos" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />

      </Routes>

      {/* Footer */}
      <footer className="bg-light py-4 mt-5">
        <div className="container">
          <div className="row g-4">
            <div className="col-12 col-md-4">
              <h5 className="mb-3">Mi Tienda</h5>
              <p className="text-muted">{settings?.aboutUsDescription || 'Tu tienda online de confianza con los mejores productos y precios del mercado.'}</p>
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
                <li className="mb-2"><i className="bi bi-envelope me-2"></i>{settings?.contactEmail || 'contacto@hako.com'}</li>
                <li className="mb-2"><i className="bi bi-telephone me-2"></i>(123) 456-7890</li>
                <li className="mb-2"><i className="bi bi-geo-alt me-2"></i>Calle Principal #123, Ciudad</li>
              </ul>
            </div>
          </div>
          <hr className="my-4" />
          <div className="text-center text-muted">
            <small className="d-block mb-1">{settings?.footerTagline || 'Todos los derechos reservados'}</small>
            <small>&copy; {new Date().getFullYear()} Hako. Todos los derechos reservados.</small>
          </div>
        </div>
      </footer>
    </>
  );
};

const App = () => (
  <SiteSettingsProvider>
    <CartProvider>
      <AppContent />
    </CartProvider>
  </SiteSettingsProvider>
);

export default App;
