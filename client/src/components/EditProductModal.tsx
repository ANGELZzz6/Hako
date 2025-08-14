import React, { useState, useEffect } from 'react';
import type { Product, UpdateProductData, ProductVariants } from '../services/productService';
import ProductVariantManager from './ProductVariantManager';
import './EditProductModal.css';
import productService from '../services/productService';
import CategoryManagerModal from './CategoryManagerModal';

interface EditProductModalProps {
  product: Product | null;
  isOpen: boolean;
  isCreating?: boolean;
  onClose: () => void;
  onSave: (productData: UpdateProductData) => Promise<void>;
}

const MAX_IMAGES = 6;

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

const EditProductModal: React.FC<EditProductModalProps> = ({ product, isOpen, isCreating = false, onClose, onSave }) => {
  const [formData, setFormData] = useState<UpdateProductData & { adminRating?: number; images?: string[] }>({
    nombre: '',
    descripcion: '',
    precio: 0,
    stock: 0,
    imagen_url: '',
    isActive: true,
    adminRating: 0,
    images: [],
    dimensiones: {
      largo: 0,
      ancho: 0,
      alto: 0,
      peso: 0
    }
  });
  const [variants, setVariants] = useState<ProductVariants>({
    enabled: false,
    attributes: []
  });
  const [newImage, setNewImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriaInput, setCategoriaInput] = useState('');
  const [variantStockError, setVariantStockError] = useState<string>('');
  const [variantStockDetails, setVariantStockDetails] = useState<{ driverName?: string; totalsByAttribute: Array<{ name: string; total: number }>}>({ driverName: undefined, totalsByAttribute: [] });

  const capitalizeFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  useEffect(() => {
    if (product) {
      setFormData({
        nombre: product.nombre,
        descripcion: product.descripcion,
        precio: product.precio,
        stock: product.stock,
        imagen_url: product.imagen_url,
        isActive: product.isActive,
        adminRating: product.adminRating ?? 0,
        images: ((product.images && product.images.length > 0 ? [...product.images] : [product.imagen_url]).filter(img => typeof img === 'string' && !!img)) as string[],
        dimensiones: product.dimensiones || {
          largo: 0,
          ancho: 0,
          alto: 0,
          peso: 0
        }
      });
      setVariants(product.variants || { enabled: false, attributes: [] });
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        precio: 0,
        stock: 0,
        imagen_url: '',
        isActive: true,
        adminRating: 0,
        images: [],
        dimensiones: {
          largo: 0,
          ancho: 0,
          alto: 0,
          peso: 0
        }
      });
      setVariants({ enabled: false, attributes: [] });
    }
    setNewImage('');
  }, [product]);

  useEffect(() => {
    productService.getAllCategories().then(setCategorias).catch(() => setCategorias([]));
  }, [isOpen]);

  useEffect(() => {
    if (product && product.categoria) {
      setCategoriaInput(product.categoria);
    } else {
      setCategoriaInput('');
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Asegurar que imagen_url sea la primera de images
      const images = (formData.images && formData.images.length > 0
        ? formData.images.filter((img): img is string => typeof img === 'string' && !!img)
        : [formData.imagen_url]
      ).filter((img): img is string => typeof img === 'string' && !!img);
      
      // Calcular stock total de variantes si están activas, con validación de único atributo driver
      let stockTotal = formData.stock;
      if (variants.enabled && variants.attributes.length > 0) {
        const totalsByAttribute = variants.attributes.map(attr => ({
          name: attr.name,
          total: (attr.options || []).reduce((acc, opt) => (
            opt.isActive && typeof opt.stock === 'number' && opt.stock > 0 ? acc + opt.stock : acc
          ), 0)
        }));
        const drivers = totalsByAttribute.filter(t => t.total > 0);
        if (drivers.length > 1) {
          throw new Error('Hay más de un atributo con stock definido. Solo un atributo debe concentrar el stock (por ejemplo, Talla). Ajusta los valores para continuar.');
        }
        stockTotal = drivers.length === 1 ? drivers[0].total : 0;
        console.log(`📊 Stock total calculado de variantes: ${stockTotal}`);
      }
      
      const dataToSend = { 
        ...formData, 
        imagen_url: images[0], 
        images, 
        variants,
        stock: stockTotal // Usar el stock calculado
      };
      
      // Logs detallados para debugging
      console.log('=== [ADMIN] GUARDANDO PRODUCTO ===');
      console.log('📦 Datos básicos:', {
        nombre: dataToSend.nombre,
        precio: dataToSend.precio,
        stock: dataToSend.stock,
        categoria: dataToSend.categoria,
        dimensiones: dataToSend.dimensiones
      });
      
      console.log('🔧 Variantes configuradas:', {
        enabled: variants.enabled,
        attributesCount: variants.attributes.length
      });
      
      if (variants.enabled && variants.attributes.length > 0) {
        console.log('📋 Detalle de atributos de variantes:');
        variants.attributes.forEach((attr, attrIndex) => {
          console.log(`   Atributo ${attrIndex + 1}: ${attr.name}`);
          console.log(`     - Required: ${attr.required}`);
          console.log(`     - DefinesDimensions: ${attr.definesDimensions}`);
          console.log(`     - Opciones: ${attr.options.length}`);
          
          attr.options.forEach((option, optIndex) => {
            console.log(`       Opción ${optIndex + 1}: ${option.value}`);
            console.log(`         - Precio: ${option.price}`);
            console.log(`         - Stock: ${option.stock}`);
            console.log(`         - IsActive: ${option.isActive}`);
            console.log(`         - Dimensiones:`, option.dimensiones);
          });
        });
      }
      
      console.log('📤 Datos completos a enviar:', JSON.stringify(dataToSend, null, 2));
      
      await onSave(dataToSend);
      console.log('✅ Producto guardado exitosamente');
      onClose();
    } catch (err: any) {
      console.error('❌ Error guardando producto:', err);
      setError(err.message || `Error al ${isCreating ? 'crear' : 'actualizar'} producto`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleAddImage = () => {
    if (newImage && /^https?:\/\/.+/.test(newImage) && (!formData.images || formData.images.length < MAX_IMAGES)) {
      setFormData(prev => ({ ...prev, images: [...(prev.images || []), newImage] }));
      setNewImage('');
    }
  };

  const handleRemoveImage = (idx: number) => {
    setFormData(prev => ({ ...prev, images: (prev.images || []).filter((_, i) => i !== idx) }));
  };

  const handleSetMainImage = (idx: number) => {
    setFormData(prev => {
      const imgs = prev.images ? [...prev.images] : [];
      if (imgs.length > 1) {
        const [main, ...rest] = [imgs[idx], ...imgs.slice(0, idx), ...imgs.slice(idx + 1)];
        return { ...prev, images: [main, ...rest], imagen_url: main };
      }
      return prev;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if ((formData.images?.length ?? 0) >= MAX_IMAGES) {
      setError('No puedes subir más de ' + MAX_IMAGES + ' imágenes.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const url = await productService.uploadProductImage(file);
      setFormData(prev => ({ ...prev, images: [...(prev.images || []), url] }));
    } catch (err: any) {
      setError('Error al subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  const handleCategoriaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = capitalizeFirst(e.target.value.trim());
    // Normalizar para comparar (sin espacios y minúsculas)
    const normalized = value.toLowerCase();
    const match = categorias.find(cat => cat.trim().toLowerCase() === normalized);
    if (match) {
      setCategoriaInput(match);
      setFormData(prev => ({ ...prev, categoria: match }));
    } else {
      setCategoriaInput(value);
      setFormData(prev => ({ ...prev, categoria: value }));
    }
  };

  // Calcular stock total de variantes si están activas, considerando un único atributo como driver
  const [variantStock, setVariantStock] = useState(0);

  useEffect(() => {
    if (!variants.enabled || !variants.attributes.length) {
      setVariantStock(0);
      setVariantStockDetails({ driverName: undefined, totalsByAttribute: [] });
      setVariantStockError('');
      return;
    }

    const totalsByAttribute = variants.attributes.map(attr => {
      const totalForAttr = (attr.options || []).reduce((acc, opt) => {
        if (opt.isActive && typeof opt.stock === 'number' && opt.stock > 0) {
          return acc + opt.stock;
        }
        return acc;
      }, 0);
      return { name: attr.name, total: totalForAttr };
    });

    const drivers = totalsByAttribute.filter(t => t.total > 0);

    setVariantStockDetails({
      driverName: drivers.length === 1 ? drivers[0].name : undefined,
      totalsByAttribute
    });

    if (drivers.length > 1) {
      setVariantStockError('Hay más de un atributo con stock definido. Solo un atributo debe concentrar el stock (por ejemplo, Talla). Ajusta los valores para continuar.');
      setVariantStock(0);
    } else {
      setVariantStockError('');
      setVariantStock(drivers.length === 1 ? drivers[0].total : 0);
    }
  }, [variants]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content product-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isCreating ? 'Crear Nuevo Producto' : 'Editar Producto'}</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="nombre">Nombre del Producto</label>
            <input type="text" id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} required className="form-control" maxLength={100} />
          </div>
          <div className="form-group">
            <label htmlFor="descripcion">Descripción</label>
            <textarea id="descripcion" name="descripcion" value={formData.descripcion} onChange={handleChange} required className="form-control" rows={3} maxLength={500} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="precio">Precio ($)</label>
              <input type="number" id="precio" name="precio" value={formData.precio} onChange={handleChange} required className="form-control" min="0" step="0.01" />
            </div>
            <div className="form-group">
              <label htmlFor="stock">Stock</label>
              <input
                type="number"
                id="stock"
                name="stock"
                value={variants.enabled && variants.attributes.length > 0 ? variantStock : formData.stock}
                onChange={handleChange}
                required
                className="form-control"
                min="0"
                disabled={variants.enabled && variants.attributes.length > 0}
              />
              {variants.enabled && variants.attributes.length > 0 && (
                <div className="mt-2">
                  <small className="text-info d-block">
                    <i className="bi bi-calculator me-1"></i>
                    Stock total calculado: <strong>{variantStock}</strong> unidades
                  </small>
                  <small className="text-muted d-block">
                    Este valor se calcula automáticamente desde un único atributo con stock (p. ej., Talla).
                  </small>
                  {variantStockError && (
                    <small className="text-danger d-block mt-1">
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      {variantStockError}
                    </small>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dimensiones_largo">Largo (cm)</label>
              <input 
                type="number" 
                id="dimensiones_largo" 
                name="dimensiones.largo" 
                value={formData.dimensiones?.largo || 0} 
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  dimensiones: {
                    ...prev.dimensiones!,
                    largo: parseFloat(e.target.value) || 0
                  }
                }))} 
                className="form-control" 
                min="0" 
                step="0.1" 
              />
            </div>
            <div className="form-group">
              <label htmlFor="dimensiones_ancho">Ancho (cm)</label>
              <input 
                type="number" 
                id="dimensiones_ancho" 
                name="dimensiones.ancho" 
                value={formData.dimensiones?.ancho || 0} 
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  dimensiones: {
                    ...prev.dimensiones!,
                    ancho: parseFloat(e.target.value) || 0
                  }
                }))} 
                className="form-control" 
                min="0" 
                step="0.1" 
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dimensiones_alto">Alto (cm)</label>
              <input 
                type="number" 
                id="dimensiones_alto" 
                name="dimensiones.alto" 
                value={formData.dimensiones?.alto || 0} 
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  dimensiones: {
                    ...prev.dimensiones!,
                    alto: parseFloat(e.target.value) || 0
                  }
                }))} 
                className="form-control" 
                min="0" 
                step="0.1" 
              />
            </div>
            <div className="form-group">
              <label htmlFor="dimensiones_peso">Peso (g)</label>
              <input 
                type="number" 
                id="dimensiones_peso" 
                name="dimensiones.peso" 
                value={formData.dimensiones?.peso || 0} 
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  dimensiones: {
                    ...prev.dimensiones!,
                    peso: parseFloat(e.target.value) || 0
                  }
                }))} 
                className="form-control" 
                min="0" 
                step="1" 
              />
            </div>
          </div>
          <div className="form-group">
            <label>Calificación de Hako (admin)</label>
            <StarSelector value={formData.adminRating ?? 0} onChange={v => setFormData(prev => ({ ...prev, adminRating: v }))} />
          </div>
          <div className="form-group">
            <label>Imágenes del producto (máx. {MAX_IMAGES})</label>
            <div className="d-flex flex-wrap gap-2 mb-2">
              {(formData.images || []).map((img, idx) => (
                <div key={idx} className="position-relative">
                  <img src={img} alt={`img${idx}`} style={{width:56,height:40,objectFit:'cover',border:idx===0?'2px solid #d32f2f':'1px solid #ccc',borderRadius:6,cursor:'pointer'}} title={idx===0?"Principal":"Haz clic para poner como principal"} onClick={()=>handleSetMainImage(idx)} />
                  <button type="button" className="btn btn-sm btn-danger position-absolute top-0 end-0" style={{padding:'0 4px',fontSize:'0.8em'}} onClick={()=>handleRemoveImage(idx)} title="Eliminar imagen"><i className="bi bi-x"></i></button>
                </div>
              ))}
            </div>
            <div className="d-flex gap-2 mb-2">
              <input type="url" className="form-control" placeholder="https://ejemplo.com/imagen.jpg" value={newImage} onChange={e=>setNewImage(e.target.value)} />
              <button type="button" className="btn btn-primary" onClick={handleAddImage} disabled={!newImage || (formData.images?.length ?? 0) >= MAX_IMAGES}>Agregar</button>
            </div>
            <div className="d-flex gap-2 mb-2">
              <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading || (formData.images?.length ?? 0) >= MAX_IMAGES} />
              {uploading && <span>Subiendo...</span>}
            </div>
            <small className="text-muted">Haz clic en una imagen para ponerla como principal.</small>
          </div>
          <div className="form-group">
            <label htmlFor="imagen_url">URL de la Imagen Principal</label>
            <input type="url" id="imagen_url" name="imagen_url" value={formData.imagen_url} onChange={handleChange} required className="form-control" placeholder="https://ejemplo.com/imagen.jpg" />
          </div>
          <div className="form-group">
            <label htmlFor="categoria">Categoría</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                list="categoria-list"
                id="categoria"
                name="categoria"
                className="form-control"
                style={{ flex: 2 }}
                value={categoriaInput}
                onChange={handleCategoriaChange}
                required
                placeholder="Ej: Electrónica, Hogar, Ropa..."
                autoComplete="off"
              />
              <select
                className="form-select"
                style={{ flex: 1, minWidth: 120 }}
                value={categorias.includes(categoriaInput) ? categoriaInput : ''}
                onChange={handleCategoriaChange}
              >
                <option value="">Seleccionar</option>
                {categorias.map((cat, idx) => (
                  <option value={cat} key={idx}>{cat}</option>
                ))}
              </select>
            </div>
            <datalist id="categoria-list">
              {categorias.map((cat, idx) => (
                <option value={cat} key={idx} />
              ))}
            </datalist>
            <small className="text-muted">
              Selecciona una categoría existente, usa el selector o escribe una nueva. No se permiten duplicados.
            </small>
            <div style={{ marginTop: 4, textAlign: 'left' }}>
              <CategoryManagerModal />
            </div>
          </div>
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="form-checkbox" />
              <span className="checkmark"></span>
              Producto Activo
            </label>
          </div>
          
          {/* Resumen de Stock de Variantes */}
          {variants.enabled && variants.attributes.length > 0 && (
            <div className="form-group">
              <div className={`alert ${variantStockError ? 'alert-danger' : 'alert-info'}`}>
                <h6 className="mb-2">
                  <i className="bi bi-boxes me-2"></i>
                  Resumen de Stock de Variantes
                </h6>
                <div className="row">
                  {variants.attributes.map((attr, attrIndex) => (
                    <div key={attrIndex} className="col-md-6 mb-2">
                      <strong>{attr.name}:</strong>
                      <div className="ms-3">
                        {attr.options.map((opt, optIndex) => (
                          <div key={optIndex} className="d-flex justify-content-between align-items-center">
                            <span className={opt.isActive ? 'text-success' : 'text-muted'}>
                              {opt.value}
                              {!opt.isActive && ' (inactivo)'}
                            </span>
                            <span className={`badge ${opt.isActive ? 'bg-success' : 'bg-secondary'}`}>
                              {opt.stock} unidades
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <hr className="my-2" />
                {!variantStockError ? (
                  <div className="d-flex justify-content-between align-items-center">
                    <strong>Stock Total{variantStockDetails.driverName ? ` (desde "${variantStockDetails.driverName}")` : ''}:</strong>
                    <span className="badge bg-primary fs-6">{variantStock} unidades</span>
                  </div>
                ) : (
                  <div>
                    <div className="mb-2">
                      <strong>Totales por atributo:</strong>
                    </div>
                    <ul className="mb-2">
                      {variantStockDetails.totalsByAttribute.map((t, i) => (
                        <li key={i}>{t.name}: {t.total}</li>
                      ))}
                    </ul>
                    <div className="text-danger">
                      Ajusta los valores para que solo uno de los atributos tenga stock (&gt; 0).
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <ProductVariantManager
            variants={variants}
            onChange={setVariants}
          />
          {error && (<div className="alert alert-danger">{error}</div>)}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={loading}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Guardando...' : (isCreating ? 'Crear Producto' : 'Guardar Cambios')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal; 