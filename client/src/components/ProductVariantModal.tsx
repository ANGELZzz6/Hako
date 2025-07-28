import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Badge } from 'react-bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css';

interface VariantOption {
  value: string;
  price: number;
  stock: number;
  isActive: boolean;
}

interface VariantAttribute {
  name: string;
  required: boolean;
  options: VariantOption[];
}

interface ProductVariant {
  enabled: boolean;
  attributes: VariantAttribute[];
}

interface ProductVariantModalProps {
  show: boolean;
  onHide: () => void;
  product: {
    _id: string;
    nombre: string;
    precio: number;
    imagen_url: string;
    descripcion?: string;
    stock?: number;
    variants?: ProductVariant;
  };
  onAddToCart: (selectedVariants: Record<string, string>, quantity: number) => void;
}

const ProductVariantModal: React.FC<ProductVariantModalProps> = ({
  show,
  onHide,
  product,
  onAddToCart
}) => {
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      setSelectedVariants({});
      setQuantity(1);
    }
  }, [show]);

  const handleVariantChange = (attributeName: string, value: string) => {
    setSelectedVariants(prev => ({
      ...prev,
      [attributeName]: value
    }));
  };

  const calculateTotalPrice = () => {
    if (!product.variants?.enabled) {
      return product.precio * quantity;
    }

    let basePrice = product.precio;
    
    Object.entries(selectedVariants).forEach(([attributeName, selectedValue]) => {
      const attribute = product.variants?.attributes?.find(attr => attr.name === attributeName);
      if (attribute) {
        const option = attribute.options.find(opt => opt.value === selectedValue);
        if (option) {
          basePrice += option.price;
        }
      }
    });

    return basePrice * quantity;
  };

  const isFormValid = () => {
    if (!product.variants?.enabled) return true;
    
    const attributes = product.variants?.attributes || [];
    return attributes.every(attribute => {
      if (!attribute.required) return true;
      return selectedVariants[attribute.name] && selectedVariants[attribute.name].trim() !== '';
    });
  };

  const handleAddToCart = async () => {
    setLoading(true);
    try {
      await onAddToCart(selectedVariants, quantity);
      onHide();
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableStock = () => {
    if (!product.variants?.enabled) {
      return product.stock || 999;
    }

    let minStock = 999;
    Object.entries(selectedVariants).forEach(([attributeName, selectedValue]) => {
      const attribute = product.variants?.attributes?.find(attr => attr.name === attributeName);
      if (attribute) {
        const option = attribute.options.find(opt => opt.value === selectedValue);
        if (option && option.stock < minStock) {
          minStock = option.stock;
        }
      }
    });

    return minStock;
  };

  const availableStock = getAvailableStock();
  const hasVariants = product.variants?.enabled && product.variants?.attributes?.length > 0;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <div className="d-flex align-items-center">
            <img 
              src={product.imagen_url} 
              alt={product.nombre}
              style={{ width: '50px', height: '50px', objectFit: 'cover', marginRight: '15px' }}
            />
            <div>
              <h5 className="mb-0">{product.nombre}</h5>
              <small className="text-muted">Selecciona las opciones</small>
            </div>
          </div>
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {hasVariants ? (
          <div>
            {product.variants?.attributes?.map((attribute, index) => (
              <div key={index} className="mb-4">
                <Form.Label className="fw-bold">
                  {attribute.name}
                  {attribute.required && <span className="text-danger ms-1">*</span>}
                </Form.Label>
                <div className="d-flex flex-wrap gap-2">
                  {attribute.options
                    .filter(option => option.isActive)
                    .map((option, optionIndex) => (
                      <Button
                        key={optionIndex}
                        variant={selectedVariants[attribute.name] === option.value ? 'primary' : 'outline-secondary'}
                        size="sm"
                        onClick={() => handleVariantChange(attribute.name, option.value)}
                        disabled={option.stock === 0}
                        className="position-relative"
                      >
                        {option.value}
                        {option.stock === 0 && (
                          <Badge bg="danger" className="ms-1">
                            Sin stock
                          </Badge>
                        )}
                      </Button>
                    ))}
                </div>
                {selectedVariants[attribute.name] && (
                  <small className="text-muted">
                    Seleccionado: {selectedVariants[attribute.name]}
                  </small>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="mb-3">
              <img 
                src={product.imagen_url} 
                alt={product.nombre}
                style={{ 
                  width: '120px', 
                  height: '120px', 
                  objectFit: 'cover', 
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
            </div>
            <h5 className="mb-2">{product.nombre}</h5>
            <p className="text-muted mb-3">{product.descripcion}</p>
            <div className="bg-light p-3 rounded">
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-bold">Precio:</span>
                <span className="h5 text-primary mb-0">${product.precio.toLocaleString('es-CO')}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mt-2">
                <span className="fw-bold">Stock disponible:</span>
                <span className="text-success">{product.stock || 999}</span>
              </div>
            </div>
          </div>
        )}

        <hr />

        <div className="row">
          <div className="col-md-6">
            <Form.Label className="fw-bold">Cantidad</Form.Label>
            <div className="d-flex align-items-center">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1 || (hasVariants && !isFormValid())}
              >
                <i className="bi bi-dash"></i>
              </Button>
              <span className="mx-3 fw-bold">{quantity}</span>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                disabled={quantity >= availableStock || (hasVariants && !isFormValid())}
              >
                <i className="bi bi-plus"></i>
              </Button>
            </div>
            <small className="text-muted">
              Stock disponible: {availableStock}
            </small>
          </div>
          <div className="col-md-6 text-end">
            <div className="h4 mb-0 text-primary">
              ${calculateTotalPrice().toLocaleString('es-CO')}
            </div>
            <small className="text-muted">
              Precio por unidad: ${(calculateTotalPrice() / quantity).toLocaleString('es-CO')}
            </small>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleAddToCart}
          disabled={!isFormValid() || loading || availableStock === 0}
          style={{ backgroundColor: '#d32f2f', borderColor: '#d32f2f' }}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
              Agregando...
            </>
          ) : (
            <>
              <i className="bi bi-cart-plus me-2"></i>
              Agregar al carrito
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ProductVariantModal; 