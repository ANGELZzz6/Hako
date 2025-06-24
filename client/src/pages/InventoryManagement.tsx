import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './InventoryManagement.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import SearchBar from '../components/SearchBar';
import ProductTable from '../components/ProductTable';
import EditProductModal from '../components/EditProductModal';
import productService, { type Product, type UpdateProductData } from '../services/productService';

const InventoryManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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

  // Filtrar productos por término de búsqueda
  const filteredProducts = products.filter(product =>
    product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="inventory-management">
      <header className="inventory-header-bar">
        <div className="header-content">
          <div className="header-left">
            <i className="bi bi-box-seam header-icon"></i>
            <span className="header-title">Inventory</span>
          </div>
          <div className="header-center">
            <h1 className="inventory-header">
              <span className="logo-japanese">箱</span>
              <span className="brand-text">hako</span>
              <span className="develop-text">Develop</span>
            </h1>
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
            <SearchBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              placeholder="Buscar productos..."
            />
            <button 
              className="btn btn-primary add-product-btn"
              onClick={handleAddProduct}
            >
              <i className="bi bi-plus-circle"></i>
              Agregar Producto
            </button>
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
                    <span className="stat-number">{products.length}</span>
                    <span className="stat-label">Total Productos</span>
                  </div>
                </div>
                <div className="stat-card">
                  <i className="bi bi-check-circle"></i>
                  <div className="stat-info">
                    <span className="stat-number">
                      {products.filter(p => p.isActive).length}
                    </span>
                    <span className="stat-label">Activos</span>
                  </div>
                </div>
                <div className="stat-card">
                  <i className="bi bi-x-circle"></i>
                  <div className="stat-info">
                    <span className="stat-number">
                      {products.filter(p => !p.isActive).length}
                    </span>
                    <span className="stat-label">Inactivos</span>
                  </div>
                </div>
                <div className="stat-card">
                  <i className="bi bi-exclamation-triangle"></i>
                  <div className="stat-info">
                    <span className="stat-number">
                      {products.filter(p => p.stock === 0).length}
                    </span>
                    <span className="stat-label">Sin Stock</span>
                  </div>
                </div>
              </div>

              <ProductTable 
                products={filteredProducts}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
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