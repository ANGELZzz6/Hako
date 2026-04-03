import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import productService, { getVariantOrProductDimensions } from '../services/productService';
import Locker3DCanvas from '../components/Locker3DCanvas';
import gridPackingService from '../services/gridPackingService';
import type { Product } from '../services/productService';
import './AdminProductTestPage.css';
import './AdminModalImprovements.css';

interface TestProduct {
  id: string;
  name: string;
  dimensions: { length: number; width: number; height: number };
  quantity: number;
  volume: number;
  variants?: any;
  individualProductId?: string;
  originalProductId?: string;
  selectedVariants?: Record<string, string>;
}

interface Product3D {
  id: string;
  name: string;
  dimensions: { length: number; width: number; height: number };
  quantity: number;
  volume: number;
}

const AdminProductTestPage: React.FC = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();

  // Estados principales
  const [products, setProducts] = useState<Product[]>([]);
  const [testProducts, setTestProducts] = useState<TestProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados para visualización 3D
  const [locker3DData, setLocker3DData] = useState<any[]>([]);

  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('nombre');

  // Estados para límites
  const [maxSlots, setMaxSlots] = useState(27); // Límite de slots del casillero
  const [currentSlotsUsed, setCurrentSlotsUsed] = useState(0);

  // Estados para selección de variantes
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<Product | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      navigate('/');
    }
  }, [isAuthenticated, isAdmin, isLoading, navigate]);

  // Cargar productos al montar el componente
  useEffect(() => {
    loadProducts();
  }, []);

  // Actualizar slots usados y regenerar 3D cuando cambien los productos de prueba
  useEffect(() => {
    calculateSlotsUsed();
    if (testProducts.length > 0) {
      generate3DData();
    } else {
      setLocker3DData([]);
    }
  }, [testProducts]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔍 Cargando productos para pruebas...');
      const productsData = await productService.getAllProducts();

      console.log('🔍 Productos cargados:', productsData.length);
      setProducts(productsData);
    } catch (err: any) {
      setError('Error al cargar los productos: ' + err.message);
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateSlotsUsed = () => {
    let totalSlots = 0;
    testProducts.forEach(product => {
      const slotsX = Math.ceil(product.dimensions.length / 15);
      const slotsY = Math.ceil(product.dimensions.width / 15);
      const slotsZ = Math.ceil(product.dimensions.height / 15);
      const productSlots = slotsX * slotsY * slotsZ;
      totalSlots += productSlots * product.quantity;
    });
    setCurrentSlotsUsed(totalSlots);
  };

  const addProductToTest = async (product: Product, variants?: Record<string, string>) => {
    try {
      console.log('🔍 Agregando producto a prueba:', product.nombre);

      // Obtener dimensiones del producto
      let dimensions = { length: 10, width: 10, height: 10 }; // Valores por defecto

      // Si hay variantes seleccionadas, usar esas dimensiones
      if (variants && Object.keys(variants).length > 0) {
        try {
          const variantDims = getVariantOrProductDimensions(product, variants);
          if (variantDims && variantDims.largo && variantDims.ancho && variantDims.alto) {
            dimensions = {
              length: variantDims.largo,
              width: variantDims.ancho,
              height: variantDims.alto
            };
            console.log('✅ Usando dimensiones de variante:', dimensions);
          }
        } catch (err) {
          console.log('⚠️ No se pudieron obtener dimensiones de variantes seleccionadas');
        }
      }

      // Si no hay variantes o no se pudieron obtener dimensiones, usar las del producto base
      if (dimensions.length === 10 && dimensions.width === 10 && dimensions.height === 10) {
        if (product.dimensiones) {
          dimensions = {
            length: product.dimensiones.largo || 10,
            width: product.dimensiones.ancho || 10,
            height: product.dimensiones.alto || 10
          };
        } else {
          // Intentar obtener dimensiones desde variantes por defecto
          try {
            const variantDims = getVariantOrProductDimensions(product, {});
            if (variantDims && variantDims.largo && variantDims.ancho && variantDims.alto) {
              dimensions = {
                length: variantDims.largo,
                width: variantDims.ancho,
                height: variantDims.alto
              };
            }
          } catch (err) {
            console.log('⚠️ No se pudieron obtener dimensiones de variantes, usando valores por defecto');
          }
        }
      }

      const testProduct: TestProduct = {
        id: `${product._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: product.nombre,
        dimensions,
        quantity: 1,
        volume: dimensions.length * dimensions.width * dimensions.height,
        variants: product.variants,
        individualProductId: product._id,
        originalProductId: product._id,
        selectedVariants: variants || {}
      };

      // Calcular slots que ocuparía este producto
      const slotsX = Math.ceil(dimensions.length / 15);
      const slotsY = Math.ceil(dimensions.width / 15);
      const slotsZ = Math.ceil(dimensions.height / 15);
      const productSlots = slotsX * slotsY * slotsZ;


      setTestProducts(prev => [...prev, testProduct]);
      console.log('✅ Producto agregado a prueba');

      // Limpiar selección de variantes
      setSelectedProductForVariants(null);
      setSelectedVariants({});
    } catch (err) {
      console.error('Error agregando producto:', err);
      alert('Error al agregar el producto a la prueba');
    }
  };

  const removeProductFromTest = (productId: string) => {
    setTestProducts(prev => prev.filter(p => p.id !== productId));
    console.log('🗑️ Producto removido de la prueba');
  };

  const updateProductQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeProductFromTest(productId);
      return;
    }

    setTestProducts(prev =>
      prev.map(p =>
        p.id === productId
          ? { ...p, quantity, volume: p.dimensions.length * p.dimensions.width * p.dimensions.height * quantity }
          : p
      )
    );
  };

  const clearTestProducts = () => {
    setTestProducts([]);
    console.log('🧹 Productos de prueba limpiados');
  };

  const openVariantSelector = (product: Product) => {
    setSelectedProductForVariants(product);
    setSelectedVariants({});
  };

  const handleVariantChange = (attributeName: string, value: string) => {
    setSelectedVariants(prev => ({
      ...prev,
      [attributeName]: value
    }));
  };

  const confirmVariantSelection = () => {
    if (selectedProductForVariants) {
      addProductToTest(selectedProductForVariants, selectedVariants);
    }
  };

  const cancelVariantSelection = () => {
    setSelectedProductForVariants(null);
    setSelectedVariants({});
  };

  const generate3DData = async () => {
    try {
      console.log('🎯 Generando datos 3D para prueba...');

      if (testProducts.length === 0) {
        setLocker3DData([]);
        return;
      }

      // Convertir productos de prueba al formato Product3D
      const products3D: Product3D[] = testProducts.map(product => {
        // Si el producto tiene variantes seleccionadas, recalcular dimensiones
        let finalDimensions = product.dimensions;

        if (product.selectedVariants && Object.keys(product.selectedVariants).length > 0) {
          try {
            const variantDims = getVariantOrProductDimensions(
              products.find(p => p._id === product.originalProductId) || {} as Product,
              product.selectedVariants
            );
            if (variantDims && variantDims.largo && variantDims.ancho && variantDims.alto) {
              finalDimensions = {
                length: variantDims.largo,
                width: variantDims.ancho,
                height: variantDims.alto
              };
              console.log(`✅ Usando dimensiones de variante para ${product.name}:`, finalDimensions);
            }
          } catch (err) {
            console.log(`⚠️ No se pudieron obtener dimensiones de variante para ${product.name}, usando dimensiones guardadas`);
          }
        }

        return {
          id: product.id,
          name: product.name,
          dimensions: finalDimensions,
          quantity: product.quantity,
          volume: finalDimensions.length * finalDimensions.width * finalDimensions.height * product.quantity
        };
      });

      console.log('🔍 Productos para 3D:', products3D);

      // Realizar bin packing
      const result = gridPackingService.packProducts3D(products3D);

      console.log(`🎯 Bin packing: ${result.lockers.length} casilleros, eficiencia: ${result.totalEfficiency}%`);

      if (result.lockers.length > 0) {
        result.lockers.forEach((locker, index) => {
          console.log(`🎯 Casillero ${index + 1}: ${locker.usedSlots}/27 slots usados`);
          locker.packedProducts.forEach((packedItem, i) => {
            console.log(`🎯 Producto ${i + 1}: ${packedItem.product.name} - ${packedItem.slotsUsed} slots`);
          });
        });
        setLocker3DData(result.lockers);
      } else {
        console.log('No se pudo generar la visualización 3D. Verifica que los productos tengan dimensiones válidas.');
        setLocker3DData([]);
      }
    } catch (error) {
      console.error('Error generando datos 3D:', error);
      setLocker3DData([]);
    }
  };

  // Filtrar productos
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Ordenar productos
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'nombre':
        return a.nombre.localeCompare(b.nombre);
      case 'precio':
        return a.precio - b.precio;
      case 'categoria':
        return a.categoria.localeCompare(b.categoria);
      default:
        return 0;
    }
  });

  // Obtener categorías únicas
  const categories = [...new Set(products.map(p => p.categoria))];

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="admin-dashboard admin-product-test-page" data-theme="light">
      <header className="admin-header-bar">
        <div className="header-content">
          <div className="header-left">
            <i className="bi bi-cube header-icon"></i>
            <i className="bi bi-tags header-icon ms-2"></i>
            <span className="header-title">Pruebas de Productos 3D</span>
          </div>
          <div className="header-center">
            <span className="logo-japanese">箱</span><span className="brand-text">hako</span>
          </div>
          <div className="header-right">
            <a href="/admin" className="back-link">
              <i className="bi bi-arrow-left-circle header-icon"></i>
            </a>
          </div>
        </div>
      </header>

      <main className="admin-main-content">
        <div className="container-fluid">
          {/* Panel de Control */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card control-panel">
                <div className="card-header">
                  <h5 className="mb-0">
                    <i className="bi bi-gear me-2"></i>
                    Panel de Control
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="stats-info">
                        <div className="stat-item">
                          <span className="stat-label">Productos en Prueba:</span>
                          <span className="stat-value">{testProducts.length}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Slots Usados:</span>
                          <span className="stat-value">{currentSlotsUsed}/{maxSlots}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Eficiencia:</span>
                          <span className="stat-value">{Math.round((currentSlotsUsed / maxSlots) * 100)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="action-buttons">
                        <button
                          className="btn btn-outline-danger"
                          onClick={clearTestProducts}
                          disabled={testProducts.length === 0}
                        >
                          <i className="bi bi-trash me-1"></i>
                          Limpiar Todo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Visualización 3D */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card visualization-card">
                <div className="card-header">
                  <h5 className="mb-0">
                    <i className="bi bi-cube me-2"></i>
                    Visualización 3D
                    {locker3DData && locker3DData.length > 0 && (
                      <span className="badge bg-success ms-2">
                        {locker3DData.length} casillero{locker3DData.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </h5>
                </div>
                <div className="card-body">
                  {locker3DData && locker3DData.length > 0 ? (
                    <>
                      {locker3DData.map((locker: any, lockerIndex: number) => (
                        <div key={locker.id} className="mb-4">
                          <h6 className="text-muted mb-3">
                            <i className="bi bi-box me-1"></i>
                            Casillero #{lockerIndex + 1}
                            <span className="badge bg-success ms-2">{locker.usedSlots}/27 slots</span>
                            {locker.isFull && <span className="badge bg-danger ms-1">Lleno</span>}
                          </h6>
                          <div className="row">
                            <div className="col-md-8">
                              <div className="visualization-container">
                                <Locker3DCanvas bin={locker} />
                              </div>
                            </div>
                            <div className="col-md-4">
                              <div className="visualization-info">
                                <h6>Información</h6>
                                <ul className="list-unstyled">
                                  <li><strong>Slots usados:</strong> {locker.usedSlots}/27</li>
                                  <li><strong>Productos:</strong> {locker.packedProducts.length}</li>
                                  <li><strong>Eficiencia:</strong> {Math.round((locker.usedSlots / 27) * 100)}%</li>
                                </ul>
                                <h6 className="mt-3">Contenido</h6>
                                <ul className="list-unstyled">
                                  {locker.packedProducts.map((item: any, index: number) => (
                                    <li key={index} className="mb-2">
                                      <div className="d-flex justify-content-between align-items-center">
                                        <span><strong>{item.product.name}</strong> x{item.product.quantity}</span>
                                        <span className="badge bg-info">{item.slotsUsed} slots</span>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                          {lockerIndex < locker3DData.length - 1 && <hr className="my-3" />}
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="text-center empty-visualization">
                      <i className="bi bi-cube display-1 text-muted"></i>
                      <p className="text-muted mt-3">
                        {testProducts.length === 0
                          ? 'Agrega productos para ver la visualización 3D'
                          : 'Generando visualización 3D...'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Productos de Prueba */}
          {testProducts.length > 0 && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card test-products-card">
                  <div className="card-header">
                    <h5 className="mb-0">
                      <i className="bi bi-box-seam me-2"></i>
                      Productos en Prueba ({testProducts.length})
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      {testProducts.map((product, index) => {
                        const slotsX = Math.ceil(product.dimensions.length / 15);
                        const slotsY = Math.ceil(product.dimensions.width / 15);
                        const slotsZ = Math.ceil(product.dimensions.height / 15);
                        const productSlots = slotsX * slotsY * slotsZ;

                        return (
                          <div key={index} className="col-md-6 col-lg-4 mb-3">
                            <div className="card test-product-item">
                              <div className="card-body">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                  <h6 className="card-title">{product.name}</h6>
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => removeProductFromTest(product.id)}
                                  >
                                    <i className="bi bi-x"></i>
                                  </button>
                                </div>
                                <div className="product-details">
                                  <p className="mb-1">
                                    <small className="text-muted">Dimensiones:</small> {product.dimensions.length}×{product.dimensions.width}×{product.dimensions.height} cm
                                  </p>
                                  <p className="mb-1">
                                    <small className="text-muted">Slots:</small> {productSlots} por unidad
                                  </p>
                                  <p className="mb-2">
                                    <small className="text-muted">Volumen:</small> {product.volume.toFixed(0)} cm³
                                  </p>
                                </div>
                                <div className="quantity-controls">
                                  <label className="form-label small">Cantidad:</label>
                                  <div className="quantity-input-group">
                                    <button
                                      className="btn btn-outline-danger quantity-btn"
                                      onClick={() => updateProductQuantity(product.id, product.quantity - 1)}
                                      title="Disminuir cantidad"
                                    >
                                      <i className="bi bi-dash-lg"></i>
                                    </button>
                                    <div className="quantity-display">
                                      <span className="quantity-number">{product.quantity}</span>
                                    </div>
                                    <button
                                      className="btn btn-outline-success quantity-btn"
                                      onClick={() => updateProductQuantity(product.id, product.quantity + 1)}
                                      title="Aumentar cantidad"
                                    >
                                      <i className="bi bi-plus-lg"></i>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filtros y Búsqueda */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card filters-card">
                <div className="card-header">
                  <h5 className="mb-0">
                    <i className="bi bi-funnel me-2"></i>
                    Filtros y Búsqueda
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-4">
                      <label className="form-label">Buscar Producto</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Nombre del producto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Categoría</label>
                      <select
                        className="form-select"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                      >
                        <option value="">Todas las categorías</option>
                        {categories.map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Ordenar por</label>
                      <select
                        className="form-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                      >
                        <option value="nombre">Nombre</option>
                        <option value="precio">Precio</option>
                        <option value="categoria">Categoría</option>
                      </select>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">&nbsp;</label>
                      <button
                        className="btn btn-outline-secondary w-100"
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedCategory('');
                          setSortBy('nombre');
                        }}
                      >
                        <i className="bi bi-arrow-clockwise me-1"></i>
                        Limpiar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Productos */}
          <div className="row">
            <div className="col-12">
              <div className="card products-list-card">
                <div className="card-header">
                  <h5 className="mb-0">
                    <i className="bi bi-list-ul me-2"></i>
                    Productos Disponibles ({filteredProducts.length})
                  </h5>
                </div>
                <div className="card-body">
                  {loading ? (
                    <div className="text-center">
                      <div className="spinner-border" role="status">
                        <span className="visually-hidden">Cargando...</span>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="alert alert-danger text-center">{error}</div>
                  ) : sortedProducts.length === 0 ? (
                    <div className="text-center empty-state">
                      <i className="bi bi-inbox display-1 text-muted"></i>
                      <p className="text-muted mt-3">No se encontraron productos</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead className="table-dark">
                          <tr>
                            <th>Producto</th>
                            <th>Categoría</th>
                            <th>Precio</th>
                            <th>Dimensiones</th>
                            <th>Slots</th>
                            <th>Variantes</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedProducts.map((product) => {
                            const dimensions = product.dimensiones || { largo: 10, ancho: 10, alto: 10 };
                            const slotsX = Math.ceil(dimensions.largo / 15);
                            const slotsY = Math.ceil(dimensions.ancho / 15);
                            const slotsZ = Math.ceil(dimensions.alto / 15);
                            const productSlots = slotsX * slotsY * slotsZ;
                            const hasVariants = product.variants && product.variants.enabled && product.variants.attributes.length > 0;

                            return (
                              <tr key={product._id}>
                                <td data-label="Producto">
                                  <div className="product-info">
                                    <div className="product-name">{product.nombre}</div>
                                    <small className="text-muted">{product.descripcion}</small>
                                  </div>
                                </td>
                                <td data-label="Categoría">
                                  <span className="badge bg-secondary">{product.categoria}</span>
                                </td>
                                <td data-label="Precio">
                                  <span className="price">${product.precio.toLocaleString()}</span>
                                </td>
                                <td data-label="Dimensiones">
                                  <span className="dimensions">
                                    {dimensions.largo}×{dimensions.ancho}×{dimensions.alto} cm
                                  </span>
                                </td>
                                <td data-label="Slots">
                                  <span className="badge bg-info">{productSlots} slots</span>
                                </td>
                                <td data-label="Variantes">
                                  {hasVariants ? (
                                    <span className="badge bg-warning">
                                      <i className="bi bi-tags me-1"></i>
                                      {product.variants?.attributes.length} variante{(product.variants?.attributes.length ?? 0) > 1 ? 's' : ''}
                                    </span>
                                  ) : (
                                    <span className="text-muted">Sin variantes</span>
                                  )}
                                </td>
                                <td>
                                  <div className="btn-group" role="group">
                                    <button
                                      className="btn btn-outline-primary btn-sm"
                                      onClick={() => addProductToTest(product)}
                                      disabled={false}
                                      title="Agregar a prueba"
                                    >
                                      <i className="bi bi-plus-circle me-1"></i>
                                      Agregar
                                    </button>
                                    {hasVariants && (
                                      <button
                                        className="btn btn-outline-success btn-sm"
                                        onClick={() => openVariantSelector(product)}
                                        title="Seleccionar variante"
                                      >
                                        <i className="bi bi-tags me-1"></i>
                                        Variantes
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Modal de Selección de Variantes */}
          {selectedProductForVariants && (
            <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1}>
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      <i className="bi bi-tags me-2"></i>
                      Seleccionar Variante - {selectedProductForVariants.nombre}
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={cancelVariantSelection}
                    ></button>
                  </div>
                  <div className="modal-body">
                    {selectedProductForVariants.variants && selectedProductForVariants.variants.enabled && (
                      <div className="variants-container">
                        {selectedProductForVariants.variants.attributes.map((attribute, index) => (
                          <div key={index} className="mb-4">
                            <label className="form-label fw-bold">
                              {attribute.name}
                              {attribute.required && <span className="text-danger ms-1">*</span>}
                            </label>
                            <div className="row">
                              {attribute.options.map((option, optionIndex) => (
                                <div key={optionIndex} className="col-md-6 mb-2">
                                  <div className="form-check">
                                    <input
                                      className="form-check-input"
                                      type="radio"
                                      name={`variant-${attribute.name}`}
                                      id={`variant-${index}-${optionIndex}`}
                                      value={option.value}
                                      checked={selectedVariants[attribute.name] === option.value}
                                      onChange={() => handleVariantChange(attribute.name, option.value)}
                                    />
                                    <label
                                      className="form-check-label d-flex justify-content-between align-items-center w-100"
                                      htmlFor={`variant-${index}-${optionIndex}`}
                                    >
                                      <span>{option.value}</span>
                                      <div className="variant-details">
                                        {option.dimensiones && (
                                          <small className="text-muted d-block">
                                            {option.dimensiones.largo}×{option.dimensiones.ancho}×{option.dimensiones.alto} cm
                                          </small>
                                        )}
                                        <small className="text-success fw-bold">
                                          ${option.price.toLocaleString()}
                                        </small>
                                      </div>
                                    </label>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={cancelVariantSelection}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={confirmVariantSelection}
                      disabled={Object.keys(selectedVariants).length === 0}
                    >
                      <i className="bi bi-check-circle me-1"></i>
                      Agregar con Variante
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Overlay del modal */}
          {selectedProductForVariants && (
            <div className="modal-backdrop fade show"></div>
          )}
        </div>
      </main>

    </div>
  );
};

export default AdminProductTestPage;
