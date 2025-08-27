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
  definesStock?: boolean; // New: which attribute controls stock
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
  const [newOptionPrice, setNewOptionPrice] = useState('');
  const [newOptionStock, setNewOptionStock] = useState('');
  const [newOptionPeso, setNewOptionPeso] = useState('');
  const [newOptionLargo, setNewOptionLargo] = useState('');
  const [newOptionAncho, setNewOptionAncho] = useState('');
  const [newOptionAlto, setNewOptionAlto] = useState('');
  const isAddAttributeDisabled = newAttributeName.trim() === '';
  
  // Estados para edición de variantes
  const [editingOption, setEditingOption] = useState<{attributeIndex: number, optionIndex: number} | null>(null);
  const [editOptionValue, setEditOptionValue] = useState('');
  const [editOptionPrice, setEditOptionPrice] = useState('');
  const [editOptionStock, setEditOptionStock] = useState('');
  const [editOptionLargo, setEditOptionLargo] = useState('');
  const [editOptionAncho, setEditOptionAncho] = useState('');
  const [editOptionAlto, setEditOptionAlto] = useState('');
  const [editOptionPeso, setEditOptionPeso] = useState('');

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

  const handleSetDefinesStock = (attributeIndex: number) => {
    const newAttributes = variants.attributes.map((attr, idx) => ({
      ...attr,
      definesStock: idx === attributeIndex
    }));
    onChange({
      ...variants,
      attributes: newAttributes
    });
  };

  const addOption = (attributeIndex: number) => {
    if (!newOptionValue.trim()) return;

    const newAttribute = variants.attributes[attributeIndex];
    const hasStockDriver = variants.attributes.some(a => a.definesStock);
    const newOption: VariantOption = {
      value: newOptionValue.trim(),
      price: parseFloat(newOptionPrice) || 0,
      stock: hasStockDriver && !newAttribute.definesStock ? 0 : (parseFloat(newOptionStock) || 0),
      isActive: true,
      dimensiones: newAttribute.definesDimensions ? {
        largo: parseFloat(newOptionLargo) || 0,
        ancho: parseFloat(newOptionAncho) || 0,
        alto: parseFloat(newOptionAlto) || 0,
        peso: parseFloat(newOptionPeso) || 0
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
    setNewOptionPrice('');
    setNewOptionStock('');
    setNewOptionPeso('');
    setNewOptionLargo('');
    setNewOptionAncho('');
    setNewOptionAlto('');
  };

  const removeOption = (attributeIndex: number, optionIndex: number) => {
    const newAttributes = [...variants.attributes];
    newAttributes[attributeIndex].options.splice(optionIndex, 1);
    onChange({
      ...variants,
      attributes: newAttributes
    });
  };

  // Función para iniciar edición de una opción
  const startEditOption = (attributeIndex: number, optionIndex: number) => {
    const option = variants.attributes[attributeIndex].options[optionIndex];
    setEditingOption({ attributeIndex, optionIndex });
    setEditOptionValue(option.value);
    setEditOptionPrice(option.price.toString());
    setEditOptionStock(option.stock.toString());
    setEditOptionLargo(option.dimensiones?.largo?.toString() || '');
    setEditOptionAncho(option.dimensiones?.ancho?.toString() || '');
    setEditOptionAlto(option.dimensiones?.alto?.toString() || '');
    setEditOptionPeso(option.dimensiones?.peso?.toString() || '');
  };

  // Función para cancelar edición
  const cancelEditOption = () => {
    setEditingOption(null);
    setEditOptionValue('');
    setEditOptionPrice('');
    setEditOptionStock('');
    setEditOptionLargo('');
    setEditOptionAncho('');
    setEditOptionAlto('');
    setEditOptionPeso('');
  };

  // Función para guardar cambios de edición
  const saveEditOption = () => {
    if (!editingOption) return;

    const { attributeIndex, optionIndex } = editingOption;
    const newAttributes = [...variants.attributes];
    const option = newAttributes[attributeIndex].options[optionIndex];

    option.value = editOptionValue;
    option.price = parseFloat(editOptionPrice) || 0;
    option.stock = parseFloat(editOptionStock) || 0;

    if (newAttributes[attributeIndex].definesDimensions) {
      option.dimensiones = {
        largo: parseFloat(editOptionLargo) || 0,
        ancho: parseFloat(editOptionAncho) || 0,
        alto: parseFloat(editOptionAlto) || 0,
        peso: parseFloat(editOptionPeso) || 0
      };
    }

    onChange({
      ...variants,
      attributes: newAttributes
    });

    cancelEditOption();
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
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={addAttribute}
                    disabled={isAddAttributeDisabled}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Agregar Atributo
                  </button>
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
                      <div className="form-check mb-2">
                        <input
                          className="form-check-input"
                          type="radio"
                          id={`defines-dimensions-${index}`}
                          name="definesDimensionsGroup"
                          checked={attribute.definesDimensions || false}
                          onChange={() => handleSetDefinesDimensions(index)}
                        />
                        <label className="form-check-label" htmlFor={`defines-dimensions-${index}`}>
                          Este atributo define dimensiones
                        </label>
                      </div>
                      <div className="form-check mb-2">
                        <input
                          className="form-check-input"
                          type="radio"
                          id={`defines-stock-${index}`}
                          name="definesStockGroup"
                          checked={attribute.definesStock || false}
                          onChange={() => handleSetDefinesStock(index)}
                        />
                        <label className="form-check-label" htmlFor={`defines-stock-${index}`}>
                          Este atributo controla el stock
                        </label>
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm me-2"
                        onClick={() => toggleAttributeRequired(index)}
                      >
                        {attribute.required ? 'Opcional' : 'Obligatorio'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => removeAttribute(index)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
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
                            onChange={(e) => setNewOptionPrice(e.target.value)}
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
                            onChange={(e) => setNewOptionStock(e.target.value)}
                            disabled={variants.attributes.some(a => a.definesStock) && !attribute.definesStock}
                          />
                          {variants.attributes.some(a => a.definesStock) && !attribute.definesStock && (
                            <Form.Text muted>El stock solo se edita en el atributo marcado como controlador de stock.</Form.Text>
                          )}
                        </Form.Group>
                      </Col>
                      {/* Inputs para dimensiones en el formulario de nueva opción */}
                      {attribute.definesDimensions && (
                        <Col md={2}>
                          <Row className="mb-2">
                            <Form.Group>
                              <Form.Label column sm={4}>Largo (cm)</Form.Label>
                              <Col sm={8}>
                                <Form.Control type="number" value={newOptionLargo} min={0} step={0.1} onChange={e => setNewOptionLargo(e.target.value)} />
                              </Col>
                            </Form.Group>
                          </Row>
                          <Row className="mb-2">
                            <Form.Group>
                              <Form.Label column sm={4}>Ancho (cm)</Form.Label>
                              <Col sm={8}>
                                <Form.Control type="number" value={newOptionAncho} min={0} step={0.1} onChange={e => setNewOptionAncho(e.target.value)} />
                              </Col>
                            </Form.Group>
                          </Row>
                          <Row className="mb-2">
                            <Form.Group>
                              <Form.Label column sm={4}>Alto (cm)</Form.Label>
                              <Col sm={8}>
                                <Form.Control type="number" value={newOptionAlto} min={0} step={0.1} onChange={e => setNewOptionAlto(e.target.value)} />
                              </Col>
                            </Form.Group>
                          </Row>
                          <Row className="mb-2">
                            <Form.Group>
                              <Form.Label column sm={4}>Peso (kg)</Form.Label>
                              <Col sm={8}>
                                <Form.Control type="number" value={newOptionPeso} min={0} step={0.1} onChange={e => setNewOptionPeso(e.target.value)} />
                              </Col>
                            </Form.Group>
                          </Row>
                        </Col>
                      )}
                      <div className="col-md-3 d-flex align-items-end justify-content-end">
                        <button
                          type="button"
                          className="btn btn-success"
                          onClick={() => addOption(index)}
                          disabled={!newOptionValue.trim()}
                        >
                          <i className="bi bi-plus me-2"></i>
                          Agregar Opción
                        </button>
                      </div>
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
                              <React.Fragment key={optionIndex}>
                                <tr>
                                  {editingOption?.attributeIndex === index && editingOption?.optionIndex === optionIndex ? (
                                    // Modo de edición
                                    <>
                                      <td>
                                        <Form.Control
                                          type="text"
                                          value={editOptionValue}
                                          onChange={(e) => setEditOptionValue(e.target.value)}
                                          size="sm"
                                        />
                                      </td>
                                      <td>
                                        <Form.Control
                                          type="number"
                                          value={editOptionPrice}
                                          onChange={(e) => setEditOptionPrice(e.target.value)}
                                          size="sm"
                                        />
                                      </td>
                                      <td>
                                        <Form.Control
                                          type="number"
                                          value={editOptionStock}
                                          onChange={(e) => setEditOptionStock(e.target.value)}
                                          disabled={variants.attributes.some(a => a.definesStock) && !attribute.definesStock}
                                          size="sm"
                                        />
                                      </td>
                                      <td>
                                        <Badge bg={option.isActive ? 'success' : 'secondary'}>
                                          {option.isActive ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                      </td>
                                      <td>
                                        <button
                                          type="button"
                                          className="btn btn-outline-success btn-sm me-1"
                                          onClick={saveEditOption}
                                        >
                                          <i className="bi bi-check"></i>
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-outline-secondary btn-sm"
                                          onClick={cancelEditOption}
                                        >
                                          <i className="bi bi-x"></i>
                                        </button>
                                      </td>
                                    </>
                                  ) : (
                                    // Modo de visualización
                                    <>
                                      <td>{option.value}</td>
                                      <td>{option.price}</td>
                                      <td>{option.stock}</td>
                                      <td>
                                        <Badge bg={option.isActive ? 'success' : 'secondary'}>
                                          {option.isActive ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                      </td>
                                      <td>
                                        <button
                                          type="button"
                                          className="btn btn-outline-primary btn-sm me-1"
                                          onClick={() => startEditOption(index, optionIndex)}
                                          title="Editar opción"
                                        >
                                          <i className="bi bi-pencil"></i>
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-outline-secondary btn-sm me-1"
                                          onClick={() => toggleOptionActive(index, optionIndex)}
                                        >
                                          {option.isActive ? 'Desactivar' : 'Activar'}
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-outline-danger btn-sm"
                                          onClick={() => removeOption(index, optionIndex)}
                                        >
                                          <i className="bi bi-trash"></i>
                                        </button>
                                      </td>
                                    </>
                                  )}
                                </tr>
                                {/* Fila adicional para dimensiones en modo de edición */}
                                {editingOption?.attributeIndex === index && editingOption?.optionIndex === optionIndex && attribute.definesDimensions && (
                                  <tr>
                                    <td colSpan={5}>
                                      <div className="row g-2">
                                        <div className="col-md-3">
                                          <Form.Label size="sm">Largo (cm)</Form.Label>
                                          <Form.Control
                                            type="number"
                                            value={editOptionLargo}
                                            onChange={(e) => setEditOptionLargo(e.target.value)}
                                            size="sm"
                                            min="0"
                                            step="0.1"
                                          />
                                        </div>
                                        <div className="col-md-3">
                                          <Form.Label size="sm">Ancho (cm)</Form.Label>
                                          <Form.Control
                                            type="number"
                                            value={editOptionAncho}
                                            onChange={(e) => setEditOptionAncho(e.target.value)}
                                            size="sm"
                                            min="0"
                                            step="0.1"
                                          />
                                        </div>
                                        <div className="col-md-3">
                                          <Form.Label size="sm">Alto (cm)</Form.Label>
                                          <Form.Control
                                            type="number"
                                            value={editOptionAlto}
                                            onChange={(e) => setEditOptionAlto(e.target.value)}
                                            size="sm"
                                            min="0"
                                            step="0.1"
                                          />
                                        </div>
                                        <div className="col-md-3">
                                          <Form.Label size="sm">Peso (kg)</Form.Label>
                                          <Form.Control
                                            type="number"
                                            value={editOptionPeso}
                                            onChange={(e) => setEditOptionPeso(e.target.value)}
                                            size="sm"
                                            min="0"
                                            step="0.1"
                                          />
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
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