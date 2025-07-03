import React, { useState } from 'react';
import productService from '../services/productService';

const CategoryManagerModal: React.FC = () => {
  const [show, setShow] = useState(false);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [productos, setProductos] = useState<any[]>([]);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Abrir modal y cargar categorías
  const openModal = async () => {
    setShow(true);
    setCategorias(await productService.getAllCategories());
    setSelectedCategoria('');
    setProductos([]);
    setNuevaCategoria('');
    setError('');
    setSuccess('');
  };

  // Cargar productos de la categoría seleccionada
  const handleSelectCategoria = async (cat: string) => {
    setSelectedCategoria(cat);
    setProductos(await productService.getProductsByCategory(cat));
    setNuevaCategoria('');
    setError('');
    setSuccess('');
  };

  // Reasignar productos y eliminar categoría
  const handleReasignarYEliminar = async () => {
    if (!nuevaCategoria || nuevaCategoria === selectedCategoria) {
      setError('Debes seleccionar o escribir una nueva categoría diferente.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Actualizar todos los productos
      await Promise.all(productos.map(prod => productService.updateProduct(prod._id, { categoria: nuevaCategoria })));
      setSuccess('Productos reasignados y categoría eliminada.');
      setShow(false);
    } catch (err: any) {
      setError('Error al reasignar productos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button type="button" className="btn btn-link p-0 mb-2" style={{ fontSize: '0.95rem', color: '#d32f2f', textDecoration: 'underline', minWidth: 0 }} onClick={openModal}>
        <i className="bi bi-gear me-1"></i> Gestionar categorías
      </button>
      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2>Eliminar/Reasignar Categoría</h2>
              <button className="modal-close" onClick={() => setShow(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label>Categoría a eliminar</label>
                <select className="form-select" value={selectedCategoria} onChange={e => handleSelectCategoria(e.target.value)}>
                  <option value="">Selecciona una categoría</option>
                  {categorias.map((cat, idx) => (
                    <option value={cat} key={idx}>{cat}</option>
                  ))}
                </select>
              </div>
              {productos.length > 0 && (
                <>
                  <div className="form-group">
                    <label>Productos afectados ({productos.length})</label>
                    <ul style={{ maxHeight: 120, overflowY: 'auto', fontSize: 14 }}>
                      {productos.map(p => <li key={p._id}>{p.nombre}</li>)}
                    </ul>
                  </div>
                  <div className="form-group">
                    <label>Nueva categoría para reasignar</label>
                    <input
                      className="form-control"
                      value={nuevaCategoria}
                      onChange={e => setNuevaCategoria(e.target.value)}
                      placeholder="Ej: Electrónica, Hogar..."
                    />
                  </div>
                  <button className="btn btn-danger" onClick={handleReasignarYEliminar} disabled={loading}>
                    {loading ? 'Reasignando...' : 'Reasignar y eliminar'}
                  </button>
                </>
              )}
              {error && <div className="alert alert-danger mt-2">{error}</div>}
              {success && <div className="alert alert-success mt-2">{success}</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CategoryManagerModal; 