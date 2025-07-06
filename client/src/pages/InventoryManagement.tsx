import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './InventoryManagement.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import SearchBar from '../components/SearchBar';
import ProductTable from '../components/ProductTable';
import EditProductModal from '../components/EditProductModal';
import productService, { type Product, type UpdateProductData } from '../services/productService';

type FilterType = 'all' | 'destacados' | 'ofertas' | 'destacados-ofertas';

const InventoryManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Cargar productos al montar el componente
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const productsData = await productService.getAllProducts();
      setProducts(productsData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar productos por término de búsqueda y filtro activo
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    switch (activeFilter) {
      case 'destacados':
        return product.isDestacado;
      case 'ofertas':
        return product.isOferta;
      case 'destacados-ofertas':
        return product.isDestacado && product.isOferta;
      default:
        return true;
    }
  });

  // Obtener estadísticas de productos filtrados
  const getFilteredStats = () => {
    const filtered = products.filter(product => {
      switch (activeFilter) {
        case 'destacados':
          return product.isDestacado;
        case 'ofertas':
          return product.isOferta;
        case 'destacados-ofertas':
          return product.isDestacado && product.isOferta;
        default:
          return true;
      }
    });

    return {
      total: filtered.length,
      activos: filtered.filter(p => p.isActive).length,
      inactivos: filtered.filter(p => !p.isActive).length,
      sinStock: filtered.filter(p => p.stock === 0).length
    };
  };

  // Manejar edición de producto
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsCreating(false);
    setIsModalOpen(true);
  };

  // Manejar guardado de producto
  const handleSave = async (productData: UpdateProductData) => {
    try {
      if (isCreating) {
        // Crear nuevo producto
        await productService.createProduct(productData as any);
      } else {
        // Actualizar producto existente
        if (!editingProduct?._id) {
          throw new Error('ID de producto no válido');
        }
        await productService.updateProduct(editingProduct._id, productData);
      }
      await loadProducts(); // Recargar productos
    } catch (err: any) {
      throw err; // El modal manejará el error
    }
  };

  // Manejar eliminación de producto
  const handleDelete = async (productId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await productService.deleteProduct(productId);
      await loadProducts(); // Recargar productos
    } catch (err: any) {
      setError(err.message || 'Error al eliminar producto');
    }
  };

  // Manejar cambio de estado de producto
  const handleToggleStatus = async (productId: string) => {
    try {
      await productService.toggleProductStatus(productId);
      await loadProducts(); // Recargar productos
    } catch (err: any) {
      setError(err.message || 'Error al cambiar estado del producto');
    }
  };

  // Manejar cambio de estado de destacado
  const handleToggleDestacado = async (productId: string) => {
    try {
      await productService.toggleDestacado(productId);
      await loadProducts(); // Recargar productos
    } catch (err: any) {
      setError(err.message || 'Error al cambiar estado de destacado');
    }
  };

  // Manejar cambio de estado de oferta
  const handleToggleOferta = async (productId: string) => {
    try {
      await productService.toggleOferta(productId);
      await loadProducts(); // Recargar productos
    } catch (err: any) {
      setError(err.message || 'Error al cambiar estado de oferta');
    }
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setIsCreating(false);
  };

  // Abrir modal para crear nuevo producto
  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsCreating(true);
    setIsModalOpen(true);
  };

  const filteredStats = getFilteredStats();

  return (
    <div className="inventory-management">
      <header className="inventory-header-bar">
        <div className="header-content">
          <div className="header-left">
            <i className="bi bi-box-seam header-icon"></i>
            <span className="header-title">Inventory</span>
          </div>
          <div className="header-center">
            <span className="logo-japanese">箱</span><span className="brand-text">hako</span>
          </div>
          <div className="header-right">
            <Link to="/admin" className="back-link">
              <i className="bi bi-arrow-left-circle header-icon"></i>
            </Link>
          </div>
        </div>
      </header>

      <main className="inventory-main-content">
        <div className="container">
          <div className="inventory-controls">
            <div className="search-section">
              <SearchBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                placeholder="Buscar productos..."
              />
            </div>
            <div className="add-section">
              <button 
                className="btn btn-primary add-product-btn"
                onClick={handleAddProduct}
              >
                <i className="bi bi-plus-circle"></i>
                Agregar Producto
              </button>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Cargando productos...</p>
            </div>
          ) : (
            <>
              <div className="inventory-stats">
                <div className="stat-card">
                  <i className="bi bi-box-seam"></i>
                  <div className="stat-info">
                    <span className="stat-number">{filteredStats.total}</span>
                    <span className="stat-label">
                      {activeFilter === 'all' ? 'Total Productos' : 
                       activeFilter === 'destacados' ? 'Destacados' :
                       activeFilter === 'ofertas' ? 'Ofertas' : 'Destacados + Ofertas'}
                    </span>
                  </div>
                </div>
                <div className="stat-card">
                  <i className="bi bi-check-circle"></i>
                  <div className="stat-info">
                    <span className="stat-number">{filteredStats.activos}</span>
                    <span className="stat-label">Activos</span>
                  </div>
                </div>
                <div className="stat-card">
                  <i className="bi bi-star-fill"></i>
                  <div className="stat-info">
                    <span className="stat-number">
                      {products.filter(p => p.isDestacado).length}
                    </span>
                    <span className="stat-label">Destacados</span>
                  </div>
                </div>
                <div className="stat-card">
                  <i className="bi bi-tag-fill"></i>
                  <div className="stat-info">
                    <span className="stat-number">
                      {products.filter(p => p.isOferta).length}
                    </span>
                    <span className="stat-label">Ofertas</span>
                  </div>
                </div>
                <div className="stat-card">
                  <i className="bi bi-x-circle"></i>
                  <div className="stat-info">
                    <span className="stat-number">{filteredStats.inactivos}</span>
                    <span className="stat-label">Inactivos</span>
                  </div>
                </div>
                <div className="stat-card">
                  <i className="bi bi-exclamation-triangle"></i>
                  <div className="stat-info">
                    <span className="stat-number">{filteredStats.sinStock}</span>
                    <span className="stat-label">Sin Stock</span>
                  </div>
                </div>
              </div>

              <ProductTable 
                products={filteredProducts}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
                onToggleDestacado={handleToggleDestacado}
                onToggleOferta={handleToggleOferta}
              />
            </>
          )}
        </div>
      </main>

      <EditProductModal
        product={editingProduct}
        isOpen={isModalOpen}
        isCreating={isCreating}
        onClose={handleCloseModal}
        onSave={handleSave}
      />
    </div>
  );
};

export default InventoryManagement; 