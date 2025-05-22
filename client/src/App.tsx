import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css'; // Para los íconos como el del carrito
import './App.css'; // Puedes mover los estilos en línea aquí

const App = () => {
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);

  const handleNavCollapse = () => setIsNavCollapsed(!isNavCollapsed);

  return (
    <>
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-light bg-light sticky-top">
        <div className="container">
          <a className="navbar-brand d-flex align-items-center" href="#">
            <i className="bi bi-shop me-2"></i>
            Mi Tienda
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
                <a className="nav-link active" href="#"><i className="bi bi-house-door me-1"></i>Inicio</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#productos"><i className="bi bi-grid me-1"></i>Productos</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#ofertas"><i className="bi bi-tag me-1"></i>Ofertas</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#contacto"><i className="bi bi-envelope me-1"></i>Contacto</a>
              </li>
            </ul>
            <div className="d-flex flex-column flex-lg-row gap-2">
              <a href="#" className="btn btn-outline-primary">
                <i className="bi bi-cart me-1"></i>
                Carrito <span className="badge bg-primary">0</span>
              </a>
              <a href="#" className="btn btn-primary">
                <i className="bi bi-person me-1"></i>
                Iniciar Sesión
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section text-center">
        <div className="container">
          <h1 className="display-4 fade-in">Bienvenido a Mi Tienda</h1>
          <p className="lead fade-in">Descubre nuestros productos exclusivos con los mejores precios</p>
          <div className="d-flex justify-content-center gap-3 mt-4">
            <a href="#productos" className="btn btn-primary btn-lg">
              <i className="bi bi-shop me-2"></i>Ver Productos
            </a>
            <a href="#ofertas" className="btn btn-outline-primary btn-lg">
              <i className="bi bi-tag me-2"></i>Ver Ofertas
            </a>
          </div>
        </div>
      </section>

      {/* Categorías */}
      <section className="container my-5">
        <h2 className="text-center mb-4">Categorías Populares</h2>
        <div className="row g-4">
          {['Electrónica', 'Ropa', 'Hogar', 'Deportes'].map((categoria) => (
            <div className="col-6 col-md-3" key={categoria}>
              <div className="card h-100 text-center fade-in">
                <div className="card-body">
                  <i className={`bi bi-${
                    categoria === 'Electrónica' ? 'laptop' :
                    categoria === 'Ropa' ? 'bag' :
                    categoria === 'Hogar' ? 'house' : 'trophy'
                  } fs-1 mb-3 text-primary`}></i>
                  <h5 className="card-title">{categoria}</h5>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Productos */}
      <section className="container my-5" id="productos">
        <h2 className="text-center mb-4">Productos Destacados</h2>
        <div className="row g-4">
          {[1, 2, 3, 4].map((num) => (
            <div className="col-12 col-sm-6 col-md-3" key={num}>
              <div className="card product-card h-100 fade-in">
                <div className="position-absolute top-0 end-0 m-2">
                  <span className="badge bg-primary">Nuevo</span>
                </div>
                <img 
                  src={`https://via.placeholder.com/300x300?text=Producto+${num}`} 
                  className="card-img-top" 
                  alt={`Producto ${num}`}
                  loading="lazy"
                />
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title">{`Producto ${num}`}</h5>
                  <p className="card-text flex-grow-1">Descripción breve del producto con detalles importantes.</p>
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <span className="h5 mb-0">{`$${(num * 50 + 49.99).toFixed(2)}`}</span>
                    <button className="btn btn-primary">
                      <i className="bi bi-cart-plus me-1"></i>Agregar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

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
