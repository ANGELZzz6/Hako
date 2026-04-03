import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import productService, { type Product } from '../services/productService';
import cartService from '../services/cartService';
import { useMobileViewport } from '../hooks/useMobileViewport';
import './ProductDetail.css';
import ProductVariantModal from '../components/ProductVariantModal';
import { useCart } from '../contexts/CartContext';
import { showSuccessToast } from '../utils/toast.ts';

const estrellas = (valor: number) => (
  <span className="stars">
    {[1, 2, 3, 4, 5].map(i => (
      <i key={i} className={`bi ${valor >= i ? 'bi-star-fill' : valor >= i - 0.5 ? 'bi-star-half' : 'bi-star'}`} style={{ marginRight: '2px' }}></i>
    ))}
  </span>
);





const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToBox, setAddingToBox] = useState(false);
  const [mainImg, setMainImg] = useState('');
  const [extraImgs, setExtraImgs] = useState<string[]>([]);
  const [adminRating, setAdminRating] = useState<number | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const navigate = useNavigate();
  const reviewsRef = React.useRef<HTMLDivElement>(null);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [quantity] = useState(1);
  const { refreshCart } = useCart();

  const hasVariants = product?.variants?.enabled && product?.variants?.attributes?.length > 0;

  const handleVariantChange = (attributeName: string, value: string) => {
    setSelectedVariants(prev => ({
      ...prev,
      [attributeName]: value
    }));
  };

  const isFormValid = () => {
    if (!product?.variants?.enabled) return true;
    const attributes = product?.variants?.attributes || [];
    return attributes.every(attribute => {
      if (!attribute.required) return true;
      return selectedVariants[attribute.name] && selectedVariants[attribute.name].trim() !== '';
    });
  };

  // Forzar resolución móvil
  useMobileViewport();

  const refreshProduct = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const prod = await productService.getProductById(id);
      setProduct(prod);
      setMainImg(prod.images && prod.images.length > 0 ? prod.images[0] : prod.imagen_url);
      setExtraImgs(prod.images && prod.images.length > 0 ? prod.images : [prod.imagen_url]);
      setAdminRating(prod.adminRating ?? null);
    } catch {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshProduct(); }, [id]);

  // Hacer scroll hacia arriba cuando se carga la página
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    // Productos relacionados (puedes mejorar el criterio)
    const fetchRelated = async () => {
      try {
        const res = await productService.getProducts({ limit: 6 });
        setRelated(res.products.filter(p => p._id !== id));
      } catch { }
    };
    fetchRelated();
  }, [id]);

  const scrollToReviews = () => {
    reviewsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAddToBox = async () => {
    if (!product) return;

    // Si tiene variantes y no se han seleccionado todas, o si queremos mantener el fallback
    // Pero la instrucción es intentar en página primero.
    if (hasVariants && !isFormValid()) {
      // Si el usuario hace click y no ha seleccionado variantes en página, 
      // podemos o mostrar el modal o resaltar los selectores.
      // Siguiendo la instrucción de "fallback", si falla algo o le falta selección, abrimos modal.
      setShowVariantModal(true);
      return;
    }

    try {
      setAddingToBox(true);
      if (hasVariants) {
        await cartService.addToCartWithVariants({
          productId: product._id,
          quantity,
          variants: selectedVariants
        });
      } else {
        await cartService.addToCart(product._id, quantity);
      }
      await refreshCart();
      showSuccessToast('¡Producto agregado al box! 🎉');
    } catch (error) {
      console.error('Error al agregar al box:', error);
      alert('Error al agregar al box. Intenta de nuevo.');
    } finally {
      setAddingToBox(false);
    }
  };

  // Manejar la adición al carrito desde el modal de variantes
  const handleAddToCartWithVariants = async (selectedVariants: Record<string, string>, quantity: number) => {
    if (!product) return;
    try {
      setAddingToBox(true);

      // Si el producto tiene variantes, usar addToCartWithVariants, sino usar addToCart
      if (product.variants && product.variants.enabled) {
        await cartService.addToCartWithVariants({
          productId: product._id,
          quantity,
          variants: selectedVariants
        });
      } else {
        await cartService.addToCart(product._id, quantity);
      }

      await refreshCart();
      setShowVariantModal(false);
      // Mostrar toast de éxito
      showSuccessToast('¡Producto agregado al box! 🎉');
    } catch (error) {
      console.error('Error al agregar al box con variantes:', error);
      alert('Error al agregar al box. Intenta de nuevo.');
    } finally {
      setAddingToBox(false);
    }
  };

  if (loading) return (
    <div className="container py-5 text-center">
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '50vh' }}>
        <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
        <h5 className="text-muted">Cargando producto...</h5>
        <div className="progress mt-3" style={{ width: '200px' }}>
          <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: '100%' }}></div>
        </div>
      </div>
    </div>
  );
  if (!product) return (
    <div className="container py-5 text-center">
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '50vh' }}>
        <div className="mb-4">
          <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '4rem' }}></i>
        </div>
        <h3 className="mb-3">Producto no encontrado</h3>
        <p className="text-muted mb-4">El producto que buscas no existe o ha sido removido.</p>
        <button className="btn btn-primary" onClick={() => window.history.back()}>
          <i className="bi bi-arrow-left me-2"></i>Volver atrás
        </button>
      </div>
    </div>
  );

  return (
    <div className="product-detail">
      <div className="container product-detail__container">
        {/* Flecha para regresar */}
        <div className="product-detail__back">
          <button
            className="btn btn-outline-secondary"
            onClick={() => navigate('/productos')}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Volver a Productos
          </button>
        </div>

        <div className="product-detail__content">
          {/* Galería de Imágenes */}
          <div className="product-detail__gallery">
            <div className="product-detail__main-img-wrap">
              {product.isOferta && (
                <div className="product-detail__badge product-detail__badge--oferta">
                  <i className="bi bi-tag-fill me-1"></i>¡Oferta!
                </div>
              )}
              {product.isDestacado && (
                <div className="product-detail__badge product-detail__badge--destacado">
                  <i className="bi bi-star-fill me-1"></i>Destacado
                </div>
              )}
              <img 
                src={mainImg} 
                alt={product.nombre} 
                className="product-detail__main-img" 
                onError={e => { e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Sin+Imagen' }} 
              />
            </div>
            
            <div className="product-detail__thumbs">
              {extraImgs.map((img, idx) => (
                <div 
                  key={idx} 
                  className={`product-detail__thumb-wrap ${mainImg === img ? 'product-detail__thumb-wrap--selected' : ''}`}
                  onClick={() => setMainImg(img)}
                >
                  <img src={img} alt={`Extra ${idx + 1}`} className="product-detail__thumb-img" />
                </div>
              ))}
            </div>
          </div>

          {/* Información del Producto */}
          <div className="product-detail__info">
            <h2 className="product-detail__title">{product.nombre}</h2>
            
            <div className="product-detail__meta">
              <span className="product-detail__verified">Producto comprobado por Hako ✅</span>
              {adminRating !== null && estrellas(adminRating)}
            </div>

            <button className="product-detail__reviews-trigger" onClick={scrollToReviews}>
              <i className="bi bi-chat-left-text me-2"></i>Ver opiniones
            </button>

            <div className="product-detail__description">
              {product.descripcion || 'Sin descripción disponible.'}
            </div>

            <div className="product-detail__price-wrap">
              <span className="product-detail__price">
                {product.precio.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                <span className="product-detail__currency">COP</span>
              </span>
            </div>

            {/* Selector de Variantes Inline (Nuevo) */}
            {hasVariants && (
              <div className="product-detail__variants">
                {product.variants?.attributes.map((attr, idx) => (
                  <div key={idx} className="product-detail__variant-group">
                    <label className="product-detail__variant-label">
                      {attr.name} {attr.required && <span className="text-danger">*</span>}
                    </label>
                    <div className="product-detail__variant-options">
                      {attr.options.filter(opt => opt.isActive).map((opt, optIdx) => (
                        <button
                          key={optIdx}
                          className={`product-detail__variant-btn ${selectedVariants[attr.name] === opt.value ? 'product-detail__variant-btn--active' : ''}`}
                          onClick={() => handleVariantChange(attr.name, opt.value)}
                          disabled={opt.stock === 0}
                        >
                          {opt.value}
                          {opt.stock === 0 && <span className="product-detail__variant-out">Agotado</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="product-detail__secure">
              <h5 className="product-detail__secure-title">Pagos seguros y Hako Services</h5>
              <ul className="product-detail__secure-list">
                <li><i className="bi bi-shield-lock text-primary me-2"></i>Datos personales seguros</li>
                <li><i className="bi bi-credit-card-2-front text-primary me-2"></i>Pagos seguros</li>
                <li style={{ color: '#2ecc40' }}><i className="bi bi-arrow-repeat me-2"></i>Reembolso por artículo defectuoso</li>
              </ul>
            </div>

            {/* El botón en layout desktop (se oculta en móvil vía CSS si es necesario o se duplica) */}
            <div className="product-detail__buy-action">
              <button
                className="btn btn-lg btn-danger w-100"
                disabled={addingToBox || product.stock === 0}
                onClick={handleAddToBox}
              >
                {addingToBox ? (
                  <><span className="spinner-border spinner-border-sm me-2" />Agregando...</>
                ) : product.stock === 0 ? (
                  <><i className="bi bi-x-octagon me-2" />Agotado</>
                ) : (
                  <><i className="bi bi-box-seam me-2" />¡Agregar a box!</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Botón Sticky para Móvil (Solo visible en pantallas pequeñas) */}
        <div className="product-detail__sticky-action">
          <button
            className="btn btn-danger product-detail__sticky-btn"
            disabled={addingToBox || product.stock === 0}
            onClick={handleAddToBox}
          >
            {addingToBox ? (
              <span className="spinner-border spinner-border-sm" />
            ) : product.stock === 0 ? (
              "Agotado"
            ) : (
              "¡AGREGAR AL BOX!"
            )}
          </button>
        </div>

        {/* Sección de Reseñas en Página */}
        <div className="product-detail__reviews-section" ref={reviewsRef}>
          <h4 className="product-detail__section-title">Opiniones de la comunidad</h4>
          <div className="product-detail__reviews-container">
             {product.reviews && product.reviews.length > 0 ? (
               product.reviews.map((r, idx) => (
                 <div key={idx} className="product-detail__review-card">
                    <div className="product-detail__review-header">
                      {estrellas(r.rating)}
                      <span className="product-detail__review-user">{r.user?.nombre || 'Hako User'}</span>
                    </div>
                    <p className="product-detail__review-text">{r.comentario}</p>
                    <span className="product-detail__review-date">{new Date(r.fecha).toLocaleDateString()}</span>
                 </div>
               ))
             ) : (
               <p className="text-muted text-center py-4">Aún no hay opiniones. ¡Sé el primero en comentar al recibir tu pedido!</p>
             )}
          </div>
        </div>

        {/* Productos relacionados */}
        <div className="product-detail__related">
          <h4 className="product-detail__section-title">Productos que te pueden interesar</h4>
          <div className="row g-3">
            {related.map(p => (
              <div className="col-6 col-md-4 col-lg-2" key={p._id}>
                <div className="card h-100 product-card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/productos/${p._id}`)}>
                  <img src={p.imagen_url} alt={p.nombre} className="card-img-top" style={{ height: 100, objectFit: 'cover' }} onError={e => { e.currentTarget.src = 'https://via.placeholder.com/100x100?text=Sin+Imagen' }} />
                  <div className="card-body p-2">
                    <div className="card-title mb-1" style={{ fontSize: '1rem' }}>{p.nombre}</div>
                    <div className="price-tag">{p.precio.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Modal de variantes */}
        {product && (
          <ProductVariantModal
            show={showVariantModal}
            onHide={() => setShowVariantModal(false)}
            product={product}
            onAddToCart={handleAddToCartWithVariants}
          />
        )}
      </div>
    </div>
  );
};

export default ProductDetail; 