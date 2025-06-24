const Product = require('../models/Product');
const validator = require('validator');

// Obtener todos los productos
exports.getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', sortBy = 'fecha_creacion', sortOrder = 'desc' } = req.query;
    
    // Construir filtro de búsqueda
    const filter = { isActive: true };
    if (search) {
      filter.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { descripcion: { $regex: search, $options: 'i' } }
      ];
    }

    // Construir ordenamiento
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calcular paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(filter)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Product.countDocuments(filter);

    res.json({
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalProducts: total,
        hasNext: skip + products.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener todos los productos (para administrador)
exports.getAllProductsAdmin = async (req, res) => {
  try {
    const products = await Product.find({}).sort({ fecha_creacion: -1 });
    res.json(products);
  } catch (error) {
    console.error('Error obteniendo productos para admin:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener producto por ID
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validator.isMongoId(id)) {
      return res.status(400).json({ error: 'ID de producto inválido' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error obteniendo producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear nuevo producto
exports.createProduct = async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock, imagen_url } = req.body;

    // Validaciones
    if (!nombre || !descripcion || precio === undefined || stock === undefined || !imagen_url) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    if (!validator.isURL(imagen_url)) {
      return res.status(400).json({ error: 'URL de imagen inválida' });
    }

    if (precio < 0) {
      return res.status(400).json({ error: 'El precio no puede ser negativo' });
    }

    if (stock < 0) {
      return res.status(400).json({ error: 'El stock no puede ser negativo' });
    }

    const product = new Product({
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      precio: parseFloat(precio),
      stock: parseInt(stock),
      imagen_url
    });

    await product.save();

    console.log(`Nuevo producto creado: ${nombre} por admin desde IP: ${req.ip}`);
    res.status(201).json({ 
      message: 'Producto creado correctamente', 
      product 
    });
  } catch (error) {
    console.error('Error creando producto:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar producto
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, stock, imagen_url, isActive } = req.body;

    if (!validator.isMongoId(id)) {
      return res.status(400).json({ error: 'ID de producto inválido' });
    }

    // Validar URL de imagen si se proporciona
    if (imagen_url && !validator.isURL(imagen_url)) {
      return res.status(400).json({ error: 'URL de imagen inválida' });
    }

    // Validar precio si se proporciona
    if (precio !== undefined && precio < 0) {
      return res.status(400).json({ error: 'El precio no puede ser negativo' });
    }

    // Validar stock si se proporciona
    if (stock !== undefined && stock < 0) {
      return res.status(400).json({ error: 'El stock no puede ser negativo' });
    }

    const updateData = {};
    if (nombre) updateData.nombre = nombre.trim();
    if (descripcion) updateData.descripcion = descripcion.trim();
    if (precio !== undefined) updateData.precio = parseFloat(precio);
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (imagen_url) updateData.imagen_url = imagen_url;
    if (isActive !== undefined) updateData.isActive = isActive;

    const product = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    console.log(`Producto actualizado: ${product.nombre} por admin desde IP: ${req.ip}`);
    res.json({ message: 'Producto actualizado correctamente', product });
  } catch (error) {
    console.error('Error actualizando producto:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar producto
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validator.isMongoId(id)) {
      return res.status(400).json({ error: 'ID de producto inválido' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await Product.findByIdAndDelete(id);
    
    console.log(`Producto eliminado: ${product.nombre} por admin desde IP: ${req.ip}`);
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Cambiar estado de producto (activar/desactivar)
exports.toggleProductStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validator.isMongoId(id)) {
      return res.status(400).json({ error: 'ID de producto inválido' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    product.isActive = !product.isActive;
    await product.save();

    const statusText = product.isActive ? 'activado' : 'desactivado';
    console.log(`Producto ${statusText}: ${product.nombre} por admin desde IP: ${req.ip}`);
    
    res.json({ 
      message: `Producto ${statusText} correctamente`, 
      product 
    });
  } catch (error) {
    console.error('Error cambiando estado de producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Buscar productos
exports.searchProducts = async (req, res) => {
  try {
    const { q = '', limit = 10 } = req.query;

    if (!q.trim()) {
      return res.status(400).json({ error: 'Término de búsqueda requerido' });
    }

    const products = await Product.find({
      $and: [
        { isActive: true },
        {
          $or: [
            { nombre: { $regex: q, $options: 'i' } },
            { descripcion: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    })
    .limit(parseInt(limit))
    .sort({ fecha_creacion: -1 });

    res.json({ products, total: products.length });
  } catch (error) {
    console.error('Error buscando productos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}; 