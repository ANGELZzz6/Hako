import React, { useState } from 'react';
import { Form, Button, Card, Row, Col, Badge, Alert } from 'react-bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css';

interface VariantOption {
  value: string;
  price: number;
  stock: number;
  isActive: boolean;
  dimensiones?: {
    largo: number;
    ancho: number;
    alto: number;
    peso: number;
  };
}

interface VariantAttribute {
  name: string;
  required: boolean;
  options: VariantOption[];
  definesDimensions?: boolean; // Added for new functionality
}

interface ProductVariants {
  enabled: boolean;
  attributes: VariantAttribute[];
}

interface ProductVariantManagerProps {
  variants: ProductVariants;
  onChange: (variants: ProductVariants) => void;
}

const ProductVariantManager: React.FC<ProductVariantManagerProps> = ({
  variants,
  onChange
}) => {
  const [newAttributeName, setNewAttributeName] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');
  const [newOptionPrice, setNewOptionPrice] = useState(0);
  const [newOptionStock, setNewOptionStock] = useState(0);
  const [newOptionPeso, setNewOptionPeso] = useState(0);
  const [newOptionLargo, setNewOptionLargo] = useState(0);
  const [newOptionAncho, setNewOptionAncho] = useState(0);
  const [newOptionAlto, setNewOptionAlto] = useState(0);

  const handleToggleVariants = () => {
    onChange({
      ...variants,
      enabled: !variants.enabled
    });
  };

  const addAttribute = () => {
    if (!newAttributeName.trim()) return;

    const newAttribute: VariantAttribute = {
      name: newAttributeName.trim(),
      required: true,
      options: [],
      definesDimensions: false // Default to false
    };

    onChange({
      ...variants,
      attributes: [...variants.attributes, newAttribute]
    });

    setNewAttributeName('');
  };

  const removeAttribute = (index: number) => {
    const newAttributes = variants.attributes.filter((_, i) => i !== index);
    onChange({
      ...variants,
      attributes: newAttributes
    });
  };

  const toggleAttributeRequired = (index: number) => {
    const newAttributes = [...variants.attributes];
    newAttributes[index].required = !newAttributes[index].required;
    onChange({
      ...variants,
      attributes: newAttributes
    });
  };

  const handleSetDefinesDimensions = (attributeIndex: number) => {
    console.log(`🔧 [ProductVariantManager] Cambiando definesDimensions para atributo ${attributeIndex}:`, {
      attributeName: variants.attributes[attributeIndex].name,
      currentState: variants.attributes[attributeIndex].definesDimensions,
      newState: true
    });
    
    const newAttributes = variants.attributes.map((attr, idx) => ({
      ...attr,
      definesDimensions: idx === attributeIndex
    }));
    onChange({
      ...variants,
      attributes: newAttributes
    });
  };

  const addOption = (attributeIndex: number) => {
    if (!newOptionValue.trim()) return;

    const newAttribute = variants.attributes[attributeIndex];
    const newOption: VariantOption = {
      value: newOptionValue.trim(),
      price: newOptionPrice,
      stock: newOptionStock,
      isActive: true,
      dimensiones: newAttribute.definesDimensions ? {
        largo: newOptionLargo || 0,
        ancho: newOptionAncho || 0,
        alto: newOptionAlto || 0,
        peso: newOptionPeso || 0
      } : undefined
    };

    console.log(`🔧 [ProductVariantManager] Agregando opción:`, {
      attributeName: newAttribute.name,
      definesDimensions: newAttribute.definesDimensions,
      optionValue: newOptionValue.trim(),
      dimensiones: newOption.dimensiones
    });

    const newAttributes = [...variants.attributes];
    newAttributes[attributeIndex].options.push(newOption);

    onChange({
      ...variants,
      attributes: newAttributes
    });

    setNewOptionValue('');
    setNewOptionPrice(0);
    setNewOptionStock(0);
    setNewOptionPeso(0);
    setNewOptionLargo(0);
    setNewOptionAncho(0);
    setNewOptionAlto(0);
  };

  const removeOption = (attributeIndex: number, optionIndex: number) => {
    const newAttributes = [...variants.attributes];
    newAttributes[attributeIndex].options.splice(optionIndex, 1);
    onChange({
      ...variants,
      attributes: newAttributes
    });
  };

  const toggleOptionActive = (attributeIndex: number, optionIndex: number) => {
    const newAttributes = [...variants.attributes];
    newAttributes[attributeIndex].options[optionIndex].isActive = 
      !newAttributes[attributeIndex].options[optionIndex].isActive;
    onChange({
      ...variants,
      attributes: newAttributes
    });
  };

  const updateOptionValue = (attributeIndex: number, optionIndex: number, value: string) => {
    const newAttributes = [...variants.attributes];
    newAttributes[attributeIndex].options[optionIndex].value = value;
    onChange({
      ...variants,
      attributes: newAttributes
    });
  };

  const updateOptionPrice = (attributeIndex: number, optionIndex: number, price: number) => {
    const newAttributes = [...variants.attributes];
    newAttributes[attributeIndex].options[optionIndex].price = price;
    onChange({
      ...variants,
      attributes: newAttributes
    });
  };

  const updateOptionStock = (attributeIndex: number, optionIndex: number, stock: number) => {
    const newAttributes = [...variants.attributes];
    newAttributes[attributeIndex].options[optionIndex].stock = stock;
    onChange({
      ...variants,
      attributes: newAttributes
    });
  };

  const updateOptionDimension = (attributeIndex: number, optionIndex: number, dimension: 'largo' | 'ancho' | 'alto' | 'peso', value: number) => {
    const newAttributes = [...variants.attributes];
    const option = newAttributes[attributeIndex].options[optionIndex];
    option.dimensiones = {
      largo: option.dimensiones?.largo ?? 0,
      ancho: option.dimensiones?.ancho ?? 0,
      alto: option.dimensiones?.alto ?? 0,
      peso: option.dimensiones?.peso ?? 0,
      [dimension]: value || 0
    };
    
    console.log(`📏 [ProductVariantManager] Actualizando dimensión:`, {
      attributeName: newAttributes[attributeIndex].name,
      optionValue: option.value,
      dimension,
      value,
      dimensionesCompletas: option.dimensiones
    });
    
    onChange({
      ...variants,
      attributes: newAttributes
    });
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-gear me-2"></i>
            Variantes del Producto
          </h5>
          <Form.Check
            type="switch"
            id="variants-switch"
            label="Habilitar variantes"
            checked={variants.enabled}
            onChange={handleToggleVariants}
          />
        </div>
      </Card.Header>
      
      <Card.Body>
        {!variants.enabled ? (
          <Alert variant="info">
            <i className="bi bi-info-circle me-2"></i>
            Las variantes están deshabilitadas. Habilítalas para configurar opciones como talla, color, etc.
          </Alert>
        ) : (
          <div>
            {/* Agregar nuevo atributo */}
            <div className="mb-4 p-3 border rounded">
              <h6>Agregar Nuevo Atributo</h6>
              <Row>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Nombre del atributo</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Ej: Talla, Color, Tela"
                      value={newAttributeName}
                      onChange={(e) => setNewAttributeName(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={6} className="d-flex align-items-end">
                  <Button 
                    variant="primary" 
                    onClick={addAttribute}
                    disabled={!newAttributeName.trim()}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Agregar Atributo
                  </Button>
                </Col>
              </Row>
            </div>

            {/* Lista de atributos */}
            {variants.attributes.map((attribute, index) => (
              <Card key={index} className="mb-3">
                <Card.Header>
                  <div className="d-flex flex-wrap flex-md-nowrap justify-content-between align-items-center variant-attribute-header">
                    <div className="flex-grow-1 mb-2 mb-md-0">
                      <h6 className="mb-0">
                        {attribute.name}
                        {attribute.required && (
                          <Badge bg="danger" className="ms-2">Obligatorio</Badge>
                        )}
                      </h6>
                    </div>
                    <div className="d-flex gap-2 flex-wrap">
                      <Form.Check
                        type="radio"
                        id={`defines-dimensions-${index}`}
                        label="Este atributo define dimensiones"
                        checked={attribute.definesDimensions || false}
                        onChange={() => handleSetDefinesDimensions(index)}
                        name="definesDimensionsGroup"
                        className="mb-2"
                      />
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => toggleAttributeRequired(index)}
                        className="me-2"
                      >
                        {attribute.required ? 'Opcional' : 'Obligatorio'}
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => removeAttribute(index)}
                      >
                        <i className="bi bi-trash"></i>
                      </Button>
                    </div>
                  </div>
                </Card.Header>
                
                <Card.Body>
                  {/* Agregar nueva opción */}
                  <div className="mb-3 p-3 border rounded variant-option-row">
                    <h6>Agregar Nueva Opción</h6>
                    <Row className="align-items-end g-2">
                      <Col md={3}>
                        <Form.Group>
                          <Form.Label>Valor</Form.Label>
                          <Form.Control
                            type="text"
                            placeholder="Ej: XL, Rojo, Algodón"
                            value={newOptionValue}
                            onChange={(e) => setNewOptionValue(e.target.value)}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={2}>
                        <Form.Group>
                          <Form.Label>Precio adicional</Form.Label>
                          <Form.Control
                            type="number"
                            placeholder="0"
                            value={newOptionPrice}
                            onChange={(e) => setNewOptionPrice(Number(e.target.value))}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={2}>
                        <Form.Group>
                          <Form.Label>Stock</Form.Label>
                          <Form.Control
                            type="number"
                            placeholder="0"
                            value={newOptionStock}
                            onChange={(e) => setNewOptionStock(Number(e.target.value))}
                          />
                        </Form.Group>
                      </Col>
                      {/* Inputs para dimensiones en el formulario de nueva opción */}
                      {attribute.definesDimensions && (
                        <Col md={2}>
                          <Form.Group as={Row} className="mb-2">
                            <Form.Label column sm={4}>Largo (cm)</Form.Label>
                            <Col sm={8}>
                              <Form.Control type="number" value={newOptionLargo} min={0} step={0.1} onChange={e => setNewOptionLargo(parseFloat(e.target.value) || 0)} />
                            </Col>
                          </Form.Group>
                          <Form.Group as={Row} className="mb-2">
                            <Form.Label column sm={4}>Ancho (cm)</Form.Label>
                            <Col sm={8}>
                              <Form.Control type="number" value={newOptionAncho} min={0} step={0.1} onChange={e => setNewOptionAncho(parseFloat(e.target.value) || 0)} />
                            </Col>
                          </Form.Group>
                          <Form.Group as={Row} className="mb-2">
                            <Form.Label column sm={4}>Alto (cm)</Form.Label>
                            <Col sm={8}>
                              <Form.Control type="number" value={newOptionAlto} min={0} step={0.1} onChange={e => setNewOptionAlto(parseFloat(e.target.value) || 0)} />
                            </Col>
                          </Form.Group>
                          <Form.Group as={Row} className="mb-2">
                            <Form.Label column sm={4}>Peso (kg)</Form.Label>
                            <Col sm={8}>
                              <Form.Control type="number" value={newOptionPeso} min={0} step={0.1} onChange={e => setNewOptionPeso(parseFloat(e.target.value) || 0)} />
                            </Col>
                          </Form.Group>
                        </Col>
                      )}
                      <Col md={3} className="d-flex align-items-end justify-content-end">
                        <Button 
                          variant="success" 
                          onClick={() => addOption(index)}
                          disabled={!newOptionValue.trim()}
                        >
                          <i className="bi bi-plus me-2"></i>
                          Agregar Opción
                        </Button>
                      </Col>
                    </Row>
                  </div>

                  {/* Lista de opciones */}
                  <div>
                    <h6>Opciones ({attribute.options.length})</h6>
                    {attribute.options.length === 0 ? (
                      <p className="text-muted">No hay opciones configuradas</p>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th>Valor</th>
                              <th>Precio Adicional</th>
                              <th>Stock</th>
                              <th>Estado</th>
                              <th>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attribute.options.map((option, optionIndex) => (
                              <tr key={optionIndex}>
                                <td>
                                  <Form.Control
                                    type="text"
                                    value={option.value}
                                    onChange={(e) => updateOptionValue(index, optionIndex, e.target.value)}
                                    size="sm"
                                  />
                                </td>
                                <td>
                                  <Form.Control
                                    type="number"
                                    value={option.price}
                                    onChange={(e) => updateOptionPrice(index, optionIndex, Number(e.target.value))}
                                    size="sm"
                                  />
                                </td>
                                <td>
                                  <Form.Control
                                    type="number"
                                    value={option.stock}
                                    onChange={(e) => updateOptionStock(index, optionIndex, Number(e.target.value))}
                                    size="sm"
                                  />
                                </td>
                                <td>
                                  <Badge bg={option.isActive ? 'success' : 'secondary'}>
                                    {option.isActive ? 'Activo' : 'Inactivo'}
                                  </Badge>
                                </td>
                                <td>
                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => toggleOptionActive(index, optionIndex)}
                                    className="me-1"
                                  >
                                    {option.isActive ? 'Desactivar' : 'Activar'}
                                  </Button>
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => removeOption(index, optionIndex)}
                                  >
                                    <i className="bi bi-trash"></i>
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </Card.Body>
              </Card>
            ))}

            {variants.attributes.length === 0 && (
              <Alert variant="warning">
                <i className="bi bi-exclamation-triangle me-2"></i>
                No hay atributos configurados. Agrega al menos un atributo para configurar las variantes.
              </Alert>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default ProductVariantManager; 