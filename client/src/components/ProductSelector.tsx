import React, { useState } from 'react';
import { useCart } from '../contexts/CartContext';

interface ProductSelectorProps {
  onSelectionChange: (selectedItems: any[]) => void;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({ onSelectionChange }) => {
  const { cart } = useCart();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const handleItemToggle = (itemId: string) => {
    if (!cart) return;
    
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
    
    // Convertir a array de items seleccionados
    const selectedItemsArray = cart.items.filter(item => {
      const id = typeof item.id_producto === 'string' ? item.id_producto : item.id_producto?._id;
      return newSelection.has(id || '');
    });
    onSelectionChange(selectedItemsArray);
  };

  const selectAll = () => {
    if (!cart) return;
    
    const allIds = new Set(cart.items.map(item => {
      const id = typeof item.id_producto === 'string' ? item.id_producto : item.id_producto?._id;
      return id || '';
    }));
    setSelectedItems(allIds);
    onSelectionChange(cart.items);
  };

  const selectNone = () => {
    setSelectedItems(new Set());
    onSelectionChange([]);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(price);
  };

  const calculateSelectedTotal = () => {
    if (!cart) return 0;
    
    return cart.items
      .filter(item => {
        const id = typeof item.id_producto === 'string' ? item.id_producto : item.id_producto?._id;
        return selectedItems.has(id || '');
      })
      .reduce((total, item) => total + (item.precio_unitario * item.cantidad), 0);
  };

  if (!cart) {
    return <div className="alert alert-info">Cargando carrito...</div>;
  }

  return (
    <div className="product-selector">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Selecciona productos para comprar</h5>
        <div className="btn-group btn-group-sm">
          <button 
            className="btn btn-outline-primary" 
            onClick={selectAll}
          >
            Seleccionar Todo
          </button>
          <button 
            className="btn btn-outline-secondary" 
            onClick={selectNone}
          >
            Limpiar
          </button>
        </div>
      </div>

      {cart.items.length === 0 ? (
        <div className="alert alert-info">
          No hay productos en el carrito
        </div>
      ) : (
        <>
          <div className="selected-items mb-3">
            {cart.items.map((item) => {
              const itemId = typeof item.id_producto === 'string' ? item.id_producto : item.id_producto?._id || '';
              const isSelected = selectedItems.has(itemId);
              
              return (
                <div 
                  key={itemId} 
                  className={`card mb-2 ${isSelected ? 'border-primary' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleItemToggle(itemId)}
                >
                  <div className="card-body py-2">
                    <div className="row align-items-center">
                      <div className="col-auto">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={isSelected}
                          onChange={() => handleItemToggle(itemId)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="col-md-6">
                        <h6 className="mb-0">{item.nombre_producto}</h6>
                        <small className="text-muted">
                          Cantidad: {item.cantidad} | 
                          Precio: {formatPrice(item.precio_unitario)}
                        </small>
                      </div>
                      <div className="col-md-4 text-end">
                        <strong>{formatPrice(item.precio_unitario * item.cantidad)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedItems.size > 0 && (
            <div className="card bg-light">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <span>
                    <strong>{selectedItems.size}</strong> producto(s) seleccionado(s)
                  </span>
                  <span className="h5 mb-0 text-primary">
                    Total: {formatPrice(calculateSelectedTotal())}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProductSelector; 