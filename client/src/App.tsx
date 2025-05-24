import React, { useState, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css'; // Para los íconos como el del carrito
import { Carousel } from 'react-bootstrap';
import BoxAnimation from './components/BoxAnimation';
import FallingLines from './components/FallingLines';
import './App.css'; // Puedes mover los estilos en línea aquí
import anuncioVideo from './assets/anuncio.mp4';
import ubicacion from './assets/ubicacion.png';

// Importar fuente Montserrat
import '@fontsource/montserrat/300.css';
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/800.css';

// Definir la interfaz para un producto
interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  image: string;
}

const App = () => {
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Datos de ejemplo para los productos
  const products: Product[] = [
    {
      id: 1,
      name: "Box Premium",
      price: 99.99,
      description: "Box premium con productos seleccionados y exclusivos.",
      image: "https://via.placeholder.com/300x300?text=Box+Premium"
    },
    {
      id: 2,
      name: "Box Gamer",
      price: 149.99,
      description: "Box especial para gamers con accesorios y coleccionables.",
      image: "https://via.placeholder.com/300x300?text=Box+Gamer"
    },
    {
      id: 3,
      name: "Box Anime",
      price: 199.99,
      description: "Box temático de anime con figuras y merchandising exclusivo.",
      image: "https://via.placeholder.com/300x300?text=Box+Anime"
    },
    {
      id: 4,
      name: "Box Kawaii",
      price: 129.99,
      description: "Box lleno de productos kawaii y accesorios adorables.",
      image: "https://via.placeholder.com/300x300?text=Box+Kawaii"
    },
    {
      id: 5,
      name: "Box Retro",
      price: 179.99,
      description: "Box con artículos retro y coleccionables vintage.",
      image: "https://via.placeholder.com/300x300?text=Box+Retro"
    },
    {
      id: 6,
      name: "Box Sorpresa",
      price: 89.99,
      description: "Box misterioso con productos sorpresa de alta calidad.",
      image: "https://via.placeholder.com/300x300?text=Box+Sorpresa"
    },
    {
      id: 7,
      name: "Box Deluxe",
      price: 249.99,
      description: "Box de lujo con productos premium y ediciones limitadas.",
      image: "https://via.placeholder.com/300x300?text=Box+Deluxe"
    },
    {
      id: 8,
      name: "Box Coleccionista",
      price: 299.99,
      description: "Box especial para coleccionistas con items exclusivos.",
      image: "https://via.placeholder.com/300x300?text=Box+Coleccionista"
    },
    {
      id: 9,
      name: "Box Manga",
      price: 159.99,
      description: "Box con mangas selectos y artículos relacionados.",
      image: "https://via.placeholder.com/300x300?text=Box+Manga"
    },
    {
      id: 10,
      name: "Box Arte",
      price: 189.99,
      description: "Box con materiales de arte y productos creativos.",
      image: "https://via.placeholder.com/300x300?text=Box+Arte"
    },
    {
      id: 11,
      name: "Box Limited",
      price: 399.99,
      description: "Box de edición limitada con productos únicos.",
      image: "https://via.placeholder.com/300x300?text=Box+Limited"
    },
    {
      id: 12,
      name: "Box Popular",
      price: 79.99,
      description: "Box con los productos más populares del momento.",
      image: "https://via.placeholder.com/300x300?text=Box+Popular"
    }
  ];

  // Coordenadas exactas de la ubicación
  const storeLocation = {
    lat: 4.701816097338806,
    lng: -74.1201097123357,
    name: "Hako Store"
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

  return (
    <>
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-light bg-light sticky-top">
        <div className="container">
          <a className="navbar-brand d-flex align-items-center" href="#">
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
                <i className="bi bi-box-seam me-1"></i>
                Tu Box <span className="badge bg-primary">0</span>
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
                <a href="#productos" className="btn btn-primary btn-lg">
                  <i className="bi bi-shop me-2"></i>Ver Productos
                </a>
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
                  className="btn btn-primary btn-lg">
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
      <section className="container my-5" id="productos">
        <h2 className="text-center mb-4">Productos Destacados</h2>
        <Carousel 
          indicators={true}
          controls={true}
          interval={5000}
          className="product-carousel"
          touch={true}
          wrap={true}
        >
          {products.reduce((groups, product, index) => {
            const groupIndex = Math.floor(index / 6); // 6 productos por slide (3x2)
            if (!groups[groupIndex]) {
              groups[groupIndex] = [];
            }
            groups[groupIndex].push(product);
            return groups;
          }, [] as Product[][]).map((group, groupIndex) => (
            <Carousel.Item key={groupIndex}>
              <div className="row g-2">
                {group.map((product) => (
                  <div className="col-4" key={product.id}>
                    <div className="card product-card h-100 fade-in">
                      <div className="position-absolute top-0 end-0 m-2">
                        <span className="badge bg-primary">Nuevo</span>
                      </div>
                      <img 
                        src={product.image}
                        className="card-img-top" 
                        alt={product.name}
                        loading="lazy"
                      />
                      <div className="card-body d-flex flex-column">
                        <h5 className="card-title">{product.name}</h5>
                        <p className="card-text">{product.description}</p>
                        <div className="price-tag mb-2">
                          <span className="h5 mb-0 text-primary">${product.price.toFixed(2)}</span>
                        </div>
                        <button className="btn btn-primary btn-sm mt-auto">
                          <i className="bi bi-box-seam me-1"></i>A MI BOX
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Carousel.Item>
          ))}
        </Carousel>
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
