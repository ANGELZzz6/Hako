import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import productService, { type Product, type Review } from '../services/productService';
import cartService from '../services/cartService';
import { useAuth } from '../contexts/AuthContext';
import { useMobileViewport } from '../hooks/useMobileViewport';
import './ProductDetail.css';
import ProductVariantModal from '../components/ProductVariantModal';
import { useCart } from '../contexts/CartContext';

const estrellas = (valor: number) => (
  <span className="stars">
    {[1,2,3,4,5].map(i => (
      <i key={i} className={`bi ${valor >= i ? 'bi-star-fill' : valor >= i-0.5 ? 'bi-star-half' : 'bi-star'}`} style={{marginRight: '2px'}}></i>
    ))}
  </span>
);

const StarSelector: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => (
  <div className="star-selector">
    {[1,2,3,4,5].map(i => (
      <i
        key={i}
        className={`bi ${value >= i ? 'bi-star-fill' : value >= i-0.5 ? 'bi-star-half' : 'bi-star'}`}
        style={{ color: '#f7b731', fontSize: '1.5em', cursor: 'pointer', marginRight: 2 }}
        onClick={() => onChange(i)}
        onMouseOver={e => (e.currentTarget.style.color = '#d32f2f')}
        onMouseOut={e => (e.currentTarget.style.color = '#f7b731')}
        title={`${i} estrella${i>1?'s':''}`}
      />
    ))}
  </div>
);

const ReseñasPopup: React.FC<{
  reviews: Review[];
  onClose: () => void;
  productId: string;
  onRefresh: () => void;
}> = ({ reviews, onClose, productId, onRefresh }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [comentario, setComentario] = useState('');
  const [rating, setRating] = useState(5);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Calcular media
  const avg = reviews.length ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length) : 0;
  // Buscar si el usuario ya dejó reseña
  const myReview = currentUser ? reviews.find(r => r.user?._id === currentUser.id) : undefined;

  useEffect(() => {
    if (myReview) {
      setComentario(myReview.comentario);
      setRating(myReview.rating);
      setEditMode(true);
    } else {
      setComentario('');
      setRating(5);
      setEditMode(false);
    }
  }, [myReview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (editMode) {
        // Lógica para editar reseña (a implementar en el servicio)
        await productService.editReview(productId, { comentario, rating });
      } else {
        // Lógica para crear reseña
        await productService.addReview(productId, { comentario, rating });
      }
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Error al guardar reseña');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Seguro que quieres eliminar tu reseña?')) return;
    setLoading(true);
    setError('');
    try {
      await productService.deleteReview(productId);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar reseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reseñas-popup-overlay" onClick={onClose}>
      <div className="reseñas-popup" onClick={e => e.stopPropagation()}>
        <div className="reseñas-popup-header">
          <h4>Reseñas de usuarios</h4>
          <button className="btn btn-sm btn-secondary close-btn" onClick={onClose}><i className="bi bi-x-lg"></i></button>
        </div>
        <div className="reseñas-popup-body">
          <div className="mb-3 text-center">
            <span className="fw-bold">Media de usuarios: </span>
            {estrellas(avg)} <span className="ms-2">{avg.toFixed(1)}</span>
            <br />
            <span className="text-muted ms-2 reviews-count">({reviews.length} reseña{reviews.length!==1?'s':''})</span>
          </div>
          {isAuthenticated ? (
            <div className="mb-4">
              <form onSubmit={handleSubmit}>
                <div className="mb-2">
                  <StarSelector value={rating} onChange={setRating} />
                </div>
                <textarea
                  className="form-control mb-2"
                  placeholder="Escribe tu reseña..."
                  value={comentario}
                  onChange={e => setComentario(e.target.value)}
                  maxLength={500}
                  required
                  rows={2}
                />
                {error && <div className="alert alert-danger py-1">{error}</div>}
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        {editMode ? 'Actualizando...' : 'Enviando...'}
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        {editMode ? 'Actualizar reseña' : 'Enviar reseña'}
                      </>
                    )}
                  </button>
                  {editMode && (
                    <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={loading}>
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Eliminando...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-trash me-2"></i>
                          Eliminar reseña
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          ) : (
            <div className="alert alert-info text-center">Inicia sesión para dejar tu reseña.</div>
          )}
          <hr />
          {reviews.length === 0 ? (
            <p className="text-muted no-reviews-message">Aún no hay reseñas para este producto.</p>
          ) : (
            reviews.map((r, idx) => (
              <div key={idx} className="reseña-item mb-3 p-2 border rounded">
                <div className="d-flex flex-column mb-1">
                  <div className="d-flex align-items-center mb-1">
                    {estrellas(r.rating)}
                    <span className="ms-2 fw-bold review-username">{r.user?.nombre || 'Usuario'}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="review-comment">{r.comentario}</div>
                    <span className="text-muted review-date" style={{fontSize:'0.9em', whiteSpace: 'nowrap'}}>{new Date(r.fecha).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToBox, setAddingToBox] = useState(false);
  const [mainImg, setMainImg] = useState('');
  const [extraImgs, setExtraImgs] = useState<string[]>([]);
  const [adminRating, setAdminRating] = useState(4.5); // ejemplo
  const [showReviews, setShowReviews] = useState(false);
  const [related, setRelated] = useState<Product[]>([]);
  const navigate = useNavigate();
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const { refreshCart } = useCart();

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
      setAdminRating(prod.adminRating ?? 0);
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
      } catch {}
    };
    fetchRelated();
  }, [id]);

  const handleAddToBox = async () => {
    if (!product) return;
    if (product.variants && product.variants.enabled) {
      setShowVariantModal(true);
      return;
    }
    try {
      setAddingToBox(true);
      await cartService.addToCart(product._id, 1);
      await refreshCart();
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
    } finally {
      setAddingToBox(false);
    }
  };

  // Manejar la adición al carrito desde el modal de variantes
  const handleAddToCartWithVariants = async (selectedVariants: Record<string, string>, quantity: number) => {
    if (!product) return;
    try {
      setAddingToBox(true);
      await cartService.addToCartWithVariants({
        productId: product._id,
        quantity,
        variants: selectedVariants
      });
      await refreshCart();
      setShowVariantModal(false);
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
      setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => document.body.removeChild(toast), 3000);
      }, 3000);
    } catch (error) {
      console.error('Error al agregar al box con variantes:', error);
      alert('Error al agregar al box. Intenta de nuevo.');
    } finally {
      setAddingToBox(false);
    }
  };

  if (loading) return (
    <div className="container py-5 text-center">
      <div className="d-flex flex-column align-items-center justify-content-center" style={{minHeight: '50vh'}}>
        <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}} role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
        <h5 className="text-muted">Cargando producto...</h5>
        <div className="progress mt-3" style={{width: '200px'}}>
          <div className="progress-bar progress-bar-striped progress-bar-animated" style={{width: '100%'}}></div>
        </div>
      </div>
    </div>
  );
  if (!product) return (
    <div className="container py-5 text-center">
      <div className="d-flex flex-column align-items-center justify-content-center" style={{minHeight: '50vh'}}>
        <div className="mb-4">
          <i className="bi bi-exclamation-triangle text-warning" style={{fontSize: '4rem'}}></i>
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
    <div style={{ marginTop: '3.5rem' }}>
      <div className="container py-5 product-detail-container">
        {/* Flecha para regresar */}
        <div className="mb-4">
          <button 
            className="btn btn-outline-secondary"
            onClick={() => navigate('/productos')}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Volver a Productos
          </button>
        </div>
        
        <div className="row g-4">
          {/* Imágenes */}
          <div className="col-md-6">
            <div className="main-img-container mb-3" style={{position: 'relative'}}>
              {/* Cinta de oferta */}
              {product.isOferta && (
                <div className="oferta-ribbon" style={{top: 10, left: -10, position: 'absolute'}}>
                  <i className="bi bi-tag-fill me-1"></i>¡Oferta!
                </div>
              )}
              {/* Cinta de destacado */}
              {product.isDestacado && (
                <div className="destacado-ribbon" style={{top: 50, left: -10, position: 'absolute', background: '#ffd600', color: '#333'}}>
                  <i className="bi bi-star-fill me-1"></i>Destacado
                </div>
              )}
              <img src={mainImg} alt={product.nombre} className="main-img img-fluid rounded shadow" onError={e => {e.currentTarget.src='https://via.placeholder.com/400x300?text=Sin+Imagen'}} />
            </div>
            <div className="extra-imgs d-flex gap-2">
              {extraImgs.map((img, idx) => (
                <img key={idx} src={img} alt={`Extra ${idx+1}`} className={`extra-img rounded ${mainImg===img ? 'selected' : ''}`} style={{width: 64, height: 48, objectFit: 'cover', cursor: 'pointer', border: mainImg===img?'2px solid #d32f2f':'1px solid #ccc'}} onClick={()=>setMainImg(img)} />
              ))}
            </div>
          </div>
          {/* Detalles */}
          <div className="col-md-6">
            <h2 className="mb-2 product-title">{product.nombre}</h2>
            <div className="d-flex align-items-center mb-2">
              <span className="badge bg-success me-2">Producto comprobado por Hako ✅</span>
              {estrellas(adminRating)}
            </div>
            <button className="btn btn-outline-secondary reviews-btn mb-3" onClick={() => setShowReviews(true)}>
              <i className="bi bi-chat-left-text me-2"></i>Ver reseñas
            </button>
            <p className="mb-3 product-description">{product.descripcion || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque euismod, nisi eu consectetur.'}</p>
            <div className="price mb-4">
              <span className="fs-3 fw-bold text-primary">
                {product.precio.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })} <span style={{fontSize: '1rem', fontWeight: 400}}>COP</span>
              </span>
            </div>
            <div className="secure-section mb-4">
              <h5 className="secure-title">Pagos seguros y Hako Services</h5>
              <ul className="list-unstyled mb-2">
                <li><i className="bi bi-shield-lock text-primary me-2"></i>Datos personales seguros</li>
                <li><i className="bi bi-credit-card-2-front text-primary me-2"></i>Pagos seguros</li>
                <li style={{color:'#2ecc40'}}><i className="bi bi-arrow-repeat me-2"></i>Reembolso por artículo defectuoso</li>
              </ul>
            </div>
            <button 
              className="btn btn-lg btn-danger w-100 mt-3" 
              disabled={addingToBox || product.stock === 0} 
              onClick={handleAddToBox}
            >
              {addingToBox ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Agregando al box...
                </>
              ) : product.stock === 0 ? (
                <>
                  <i className="bi bi-x-octagon me-2"></i>Producto agotado
                </>
              ) : (
                <>
                  <i className="bi bi-box-seam me-2"></i>¡Agregar a box!
                </>
              )}
            </button>
          </div>
        </div>
        {/* Popup de reseñas */}
        {showReviews && <ReseñasPopup reviews={product.reviews || []} onClose={() => setShowReviews(false)} productId={product._id} onRefresh={refreshProduct} />}
        {/* Productos relacionados */}
        <div className="mt-5">
          <h4 className="mb-4 related-title">Productos que te pueden interesar</h4>
          <div className="row g-3">
            {related.map(p => (
              <div className="col-6 col-md-4 col-lg-2" key={p._id}>
                <div className="card h-100 product-card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/productos/${p._id}`)}>
                  <img src={p.imagen_url} alt={p.nombre} className="card-img-top" style={{height:100,objectFit:'cover'}} onError={e => {e.currentTarget.src='https://via.placeholder.com/100x100?text=Sin+Imagen'}} />
                  <div className="card-body p-2">
                    <div className="card-title mb-1" style={{fontSize:'1rem'}}>{p.nombre}</div>
                    <div className="price-tag">{p.precio.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Modal de variantes */}
        {product && product.variants && product.variants.enabled && (
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