const Product = require('../models/Product');
const validator = require('validator');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const Suggestion = require('../models/Suggestion');
const transporter = require('../config/nodemailer');
const User = require('../models/User');

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

    const product = await Product.findById(id).populate('reviews.user', 'nombre email');
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
    const { nombre, descripcion, precio, stock, imagen_url, variants, categoria, dimensiones } = req.body;

    console.log('=== [SERVER] CREANDO PRODUCTO ===');
    console.log('📦 Datos recibidos:', {
      nombre,
      precio,
      stock,
      categoria,
      dimensiones
    });
    
    console.log('🔧 Variantes recibidas:', {
      enabled: variants?.enabled,
      attributesCount: variants?.attributes?.length || 0
    });
    
    if (variants && variants.enabled && variants.attributes) {
      console.log('📋 Detalle de variantes recibidas:');
      variants.attributes.forEach((attr, attrIndex) => {
        console.log(`   Atributo ${attrIndex + 1}: ${attr.name}`);
        console.log(`     - Required: ${attr.required}`);
        console.log(`     - DefinesDimensions: ${attr.definesDimensions}`);
        console.log(`     - Opciones: ${attr.options?.length || 0}`);
        
        if (attr.options) {
          attr.options.forEach((option, optIndex) => {
            console.log(`       Opción ${optIndex + 1}: ${option.value}`);
            console.log(`         - Precio: ${option.price}`);
            console.log(`         - Stock: ${option.stock}`);
            console.log(`         - IsActive: ${option.isActive}`);
            console.log(`         - Dimensiones:`, option.dimensiones);
          });
        }
      });
    }

    // Validaciones
    if (!nombre || !descripcion || precio === undefined || stock === undefined || !imagen_url || !categoria) {
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

    // Validar variantes si se proporcionan
    if (variants && typeof variants === 'object') {
      if (typeof variants.enabled !== 'boolean') {
        return res.status(400).json({ error: 'El campo enabled de variantes debe ser un booleano' });
      }
      
      if (variants.enabled && (!Array.isArray(variants.attributes) || variants.attributes.length === 0)) {
        return res.status(400).json({ error: 'Si las variantes están habilitadas, debe haber al menos un atributo' });
      }
    }

    // Si hay variantes, validar que solo un atributo concentre el stock y calcular el stock total
    let computedStock = parseInt(stock);
    if (variants && variants.enabled && Array.isArray(variants.attributes)) {
      const totalsByAttribute = variants.attributes.map(attr => ({
        name: attr.name,
        total: Array.isArray(attr.options)
          ? attr.options.reduce((acc, opt) => (opt && opt.isActive && typeof opt.stock === 'number' && opt.stock > 0 ? acc + opt.stock : acc), 0)
          : 0
      }));
      const drivers = totalsByAttribute.filter(t => t.total > 0);
      if (drivers.length > 1) {
        return res.status(400).json({ error: 'Hay más de un atributo con stock definido. Solo uno debe controlar el stock total (ej: Talla).' });
      }
      computedStock = drivers.length === 1 ? drivers[0].total : 0;
    }

    const product = new Product({
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      precio: parseFloat(precio),
      stock: computedStock,
      imagen_url,
      categoria: categoria.trim(),
      variants: variants || { enabled: false, attributes: [] },
      dimensiones: dimensiones || null
    });

    await product.save();

    console.log('✅ [SERVER] Producto creado exitosamente');
    console.log('📦 Producto guardado:', {
      id: product._id,
      nombre: product.nombre,
      variantsEnabled: product.variants?.enabled,
      attributesCount: product.variants?.attributes?.length || 0
    });
    
    if (product.variants && product.variants.enabled) {
      console.log('🔧 Variantes guardadas en DB:');
      product.variants.attributes.forEach((attr, attrIndex) => {
        console.log(`   Atributo ${attrIndex + 1}: ${attr.name}`);
        console.log(`     - DefinesDimensions: ${attr.definesDimensions}`);
        console.log(`     - Opciones: ${attr.options?.length || 0}`);
        
        if (attr.options) {
          attr.options.forEach((option, optIndex) => {
            console.log(`       Opción ${optIndex + 1}: ${option.value}`);
            console.log(`         - Dimensiones guardadas:`, option.dimensiones);
          });
        }
      });
    }

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
    const { nombre, descripcion, precio, stock, imagen_url, isActive, adminRating, images, variants, categoria, dimensiones } = req.body;

    console.log('=== [SERVER] ACTUALIZANDO PRODUCTO ===');
    console.log('📦 Datos recibidos:', {
      id,
      nombre,
      precio,
      stock,
      categoria,
      dimensiones
    });
    
    console.log('🔧 Variantes recibidas:', {
      enabled: variants?.enabled,
      attributesCount: variants?.attributes?.length || 0
    });
    
    if (variants && variants.enabled && variants.attributes) {
      console.log('📋 Detalle de variantes recibidas:');
      variants.attributes.forEach((attr, attrIndex) => {
        console.log(`   Atributo ${attrIndex + 1}: ${attr.name}`);
        console.log(`     - DefinesDimensions: ${attr.definesDimensions}`);
        console.log(`     - Opciones: ${attr.options?.length || 0}`);
        
        if (attr.options) {
          attr.options.forEach((option, optIndex) => {
            console.log(`       Opción ${optIndex + 1}: ${option.value}`);
            console.log(`         - Dimensiones guardadas:`, option.dimensiones);
          });
        }
      });
    }

    // Validaciones
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

    // Validar adminRating si se proporciona
    if (adminRating !== undefined && (adminRating < 0 || adminRating > 5)) {
      return res.status(400).json({ error: 'La calificación de admin debe estar entre 0 y 5' });
    }

    // Validar images si se proporciona
    if (images && (!Array.isArray(images) || images.some((url) => typeof url !== 'string' || !/^https?:\/\/.+/.test(url)))) {
      return res.status(400).json({ error: 'Todas las imágenes deben ser URLs válidas' });
    }

    // Validar variantes si se proporcionan
    if (variants && typeof variants === 'object') {
      if (typeof variants.enabled !== 'boolean') {
        return res.status(400).json({ error: 'El campo enabled de variantes debe ser un booleano' });
      }
      
      if (variants.enabled && (!Array.isArray(variants.attributes) || variants.attributes.length === 0)) {
        return res.status(400).json({ error: 'Si las variantes están habilitadas, debe haber al menos un atributo' });
      }
    }

    // Validar dimensiones si se proporcionan
    if (dimensiones && typeof dimensiones === 'object') {
      const { largo, ancho, alto, peso } = dimensiones;
      if (largo !== undefined && (typeof largo !== 'number' || largo < 0)) {
        return res.status(400).json({ error: 'El largo debe ser un número mayor o igual a 0' });
      }
      if (ancho !== undefined && (typeof ancho !== 'number' || ancho < 0)) {
        return res.status(400).json({ error: 'El ancho debe ser un número mayor o igual a 0' });
      }
      if (alto !== undefined && (typeof alto !== 'number' || alto < 0)) {
        return res.status(400).json({ error: 'El alto debe ser un número mayor o igual a 0' });
      }
      if (peso !== undefined && (typeof peso !== 'number' || peso < 0)) {
        return res.status(400).json({ error: 'El peso debe ser un número mayor o igual a 0' });
      }
    }

    const updateData = {};
    if (nombre) updateData.nombre = nombre.trim();
    if (descripcion) updateData.descripcion = descripcion.trim();
    if (precio !== undefined) updateData.precio = parseFloat(precio);
    // Si se envían variantes habilitadas, recomputar el stock desde variantes
    if (variants && variants.enabled && Array.isArray(variants.attributes)) {
      const totalsByAttribute = variants.attributes.map(attr => ({
        name: attr.name,
        total: Array.isArray(attr.options)
          ? attr.options.reduce((acc, opt) => (opt && opt.isActive && typeof opt.stock === 'number' && opt.stock > 0 ? acc + opt.stock : acc), 0)
          : 0
      }));
      const drivers = totalsByAttribute.filter(t => t.total > 0);
      if (drivers.length > 1) {
        return res.status(400).json({ error: 'Hay más de un atributo con stock definido. Solo uno debe controlar el stock total (ej: Talla).' });
      }
      updateData.stock = drivers.length === 1 ? drivers[0].total : 0;
    } else if (stock !== undefined) {
      updateData.stock = parseInt(stock);
    }
    if (imagen_url) updateData.imagen_url = imagen_url;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (adminRating !== undefined) updateData.adminRating = adminRating;
    if (images) updateData.images = images;
    if (variants !== undefined) updateData.variants = variants;
    if (categoria) updateData.categoria = categoria.trim();
    if (dimensiones !== undefined) updateData.dimensiones = dimensiones;

    const product = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    console.log('✅ [SERVER] Producto actualizado exitosamente');
    console.log('📦 Producto guardado:', {
      id: product._id,
      nombre: product.nombre,
      variantsEnabled: product.variants?.enabled,
      attributesCount: product.variants?.attributes?.length || 0
    });
    
    if (product.variants && product.variants.enabled) {
      console.log('🔧 Variantes guardadas en DB:');
      product.variants.attributes.forEach((attr, attrIndex) => {
        console.log(`   Atributo ${attrIndex + 1}: ${attr.name}`);
        console.log(`     - DefinesDimensions: ${attr.definesDimensions}`);
        console.log(`     - Opciones: ${attr.options?.length || 0}`);
        
        if (attr.options) {
          attr.options.forEach((option, optIndex) => {
            console.log(`       Opción ${optIndex + 1}: ${option.value}`);
            console.log(`         - Dimensiones guardadas:`, option.dimensiones);
          });
        }
      });
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
    const { q } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Término de búsqueda requerido' });
    }

    const products = await Product.find({
      $and: [
        { isActive: true },
        {
          $or: [
            { nombre: { $regex: q.trim(), $options: 'i' } },
            { descripcion: { $regex: q.trim(), $options: 'i' } }
          ]
        }
      ]
    }).sort({ fecha_creacion: -1 });

    res.json(products);
  } catch (error) {
    console.error('Error buscando productos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener productos destacados
exports.getDestacados = async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    
    const products = await Product.find({
      isActive: true,
      isDestacado: true
    })
    .sort({ fecha_creacion: -1 })
    .limit(parseInt(limit));

    res.json(products);
  } catch (error) {
    console.error('Error obteniendo productos destacados:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener productos en oferta
exports.getOfertas = async (req, res) => {
  try {
    const { limit = 12 } = req.query;
    
    const products = await Product.find({
      isActive: true,
      isOferta: true
    })
    .sort({ fecha_creacion: -1 })
    .limit(parseInt(limit));

    res.json(products);
  } catch (error) {
    console.error('Error obteniendo productos en oferta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar estado de destacado
exports.toggleDestacado = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validator.isMongoId(id)) {
      return res.status(400).json({ error: 'ID de producto inválido' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    product.isDestacado = !product.isDestacado;
    await product.save();

    const statusText = product.isDestacado ? 'marcado como destacado' : 'removido de destacados';
    console.log(`Producto ${statusText}: ${product.nombre} por admin desde IP: ${req.ip}`);
    
    res.json({ 
      message: `Producto ${statusText} correctamente`, 
      product 
    });
  } catch (error) {
    console.error('Error cambiando estado de destacado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar estado de oferta
exports.toggleOferta = async (req, res) => {
  try {
    const { id } = req.params;
    const { precioOferta, porcentajeDescuento } = req.body;

    if (!validator.isMongoId(id)) {
      return res.status(400).json({ error: 'ID de producto inválido' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    product.isOferta = !product.isOferta;
    
    if (product.isOferta) {
      if (precioOferta !== undefined) {
        product.precioOferta = parseFloat(precioOferta);
      }
      if (porcentajeDescuento !== undefined) {
        product.porcentajeDescuento = parseFloat(porcentajeDescuento);
      }
    } else {
      // Si se desactiva la oferta, limpiar los campos
      product.precioOferta = undefined;
      product.porcentajeDescuento = undefined;
    }

    await product.save();

    const statusText = product.isOferta ? 'marcado como oferta' : 'removido de ofertas';
    console.log(`Producto ${statusText}: ${product.nombre} por admin desde IP: ${req.ip}`);
    
    res.json({ 
      message: `Producto ${statusText} correctamente`, 
      product 
    });
  } catch (error) {
    console.error('Error cambiando estado de oferta:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Agregar o editar reseña de usuario autenticado
exports.addOrEditReview = async (req, res) => {
  try {
    const { id } = req.params; // id del producto
    const userId = req.user.id;
    const { comentario, rating } = req.body;
    console.log('addOrEditReview: userId:', userId);
    console.log('addOrEditReview: productId:', id);
    if (!comentario || !rating) {
      return res.status(400).json({ error: 'Comentario y calificación requeridos' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'La calificación debe estar entre 1 y 5' });
    }
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    console.log('addOrEditReview: producto encontrado:', product.nombre);
    console.log('addOrEditReview: reseñas existentes:', product.reviews);
    // Buscar si ya existe reseña de este usuario
    const idx = product.reviews.findIndex(r => r.user.toString() === userId.toString());
    console.log('addOrEditReview: índice de reseña encontrada:', idx);
    if (req.method === 'POST') {
      if (idx !== -1) {
        return res.status(400).json({ error: 'Ya has dejado una reseña para este producto. Usa editar.' });
      }
      product.reviews.push({ user: userId, comentario, rating });
    } else if (req.method === 'PUT') {
      if (idx === -1) {
        return res.status(404).json({ error: 'No tienes reseña para este producto.' });
      }
      product.reviews[idx].comentario = comentario;
      product.reviews[idx].rating = rating;
      product.reviews[idx].fecha = new Date();
    }
    await product.save();
    res.json({ message: 'Reseña guardada correctamente' });
  } catch (error) {
    console.error('Error en reseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar reseña de usuario autenticado
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params; // id del producto
    const userId = req.user.id;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    const idx = product.reviews.findIndex(r => r.user.toString() === userId.toString());
    if (idx === -1) {
      return res.status(404).json({ error: 'No tienes reseña para este producto.' });
    }
    product.reviews.splice(idx, 1);
    await product.save();
    res.json({ message: 'Reseña eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando reseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Subir imagen de producto a Cloudinary
exports.uploadProductImage = [
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se envió ninguna imagen.' });
      }
      // Subir a Cloudinary
      const result = await cloudinary.uploader.upload_stream({
        folder: 'hako_productos',
        resource_type: 'image',
      }, (error, result) => {
        if (error) {
          console.error('Error subiendo a Cloudinary:', error);
          return res.status(500).json({ error: 'Error al subir la imagen.' });
        }
        return res.json({ url: result.secure_url });
      });
      // Escribir el buffer en el stream
      result.end(req.file.buffer);
    } catch (error) {
      console.error('Error en uploadProductImage:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
];

// Obtener todas las categorías distintas
exports.getAllCategories = async (req, res) => {
  try {
    const categorias = await Product.distinct('categoria');
    res.json(categorias);
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener productos por categoría
exports.getProductsByCategory = async (req, res) => {
  try {
    const { categoria } = req.params;
    if (!categoria) return res.status(400).json({ error: 'Categoría requerida' });
    const productos = await Product.find({ categoria });
    res.json(productos);
  } catch (error) {
    console.error('Error obteniendo productos por categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Recibir sugerencias de productos
exports.createSuggestion = async (req, res) => {
  try {
    let { urls } = req.body;
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'Debes enviar al menos una URL.' });
    }
    // Limitar la cantidad de URLs por sugerencia
    if (Array.isArray(urls) && urls.length > 5) {
      return res.status(400).json({ error: 'Solo puedes sugerir hasta 5 productos por envío.' });
    }
    // Filtrar y limpiar URLs válidas (soporta URLs pegadas)
    const urlRegex = /(https?:\/\/[\w\-\.\/?#&=;%:+,~@!$'*()\[\]]+)/g;
    let matches = [];
    for (const u of urls) {
      let m;
      while ((m = urlRegex.exec(u)) !== null) {
        matches.push(m[1].trim());
      }
    }
    matches = Array.from(new Set(matches));
    if (matches.length === 0) {
      return res.status(400).json({ error: 'No se detectaron URLs válidas.' });
    }
    const user = req.user;
    const suggestion = await Suggestion.create({
      urls: matches,
      userId: user.id,
      nombre: user.nombre,
      email: user.email
    });

    // Enviar correo de agradecimiento al usuario
    try {
      await transporter.sendMail({
        to: user.email,
        subject: '¡Gracias por tu sugerencia de producto! - Hako',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px 24px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <img src="https://i.imgur.com/0y0y0y0.png" alt="Hako Logo" style="height: 48px; margin-bottom: 8px;"/>
              <h2 style="color: #d32f2f; margin: 0;">¡Gracias por tu sugerencia!</h2>
            </div>
            <p style="font-size: 17px; color: #222;">Hola <b>${user.nombre}</b>,</p>
            <p style="font-size: 16px; color: #444;">Hemos recibido tu sugerencia de producto y la tendremos en cuenta para futuras incorporaciones en Hako.</p>
            <div style="background: #fff; border-radius: 8px; padding: 16px 20px; margin: 24px 0; border-left: 4px solid #d32f2f;">
              <p style="margin: 0 0 8px 0; font-size: 15px;"><b>Productos sugeridos:</b></p>
              <ul style="margin: 0; padding-left: 18px; color: #555;">
                ${matches.map(url => `<li>${url}</li>`).join('')}
              </ul>
            </div>
            <p style="font-size: 15px; color: #444;">¡Gracias por ayudarnos a mejorar Hako!</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px 0;"/>
            <footer style="font-size: 13px; color: #888; text-align: center;">
              <p>¿Tienes dudas? Contáctanos en <a href="mailto:soporte@hako.com" style="color: #d32f2f; text-decoration: none;">soporte@hako.com</a></p>
              <p>Equipo Hako &copy; ${new Date().getFullYear()}</p>
            </footer>
          </div>
        `
      });
    } catch (err) {
      console.error('Error enviando correo de agradecimiento de sugerencia:', err);
    }
    res.status(201).json({ message: 'Sugerencia enviada', suggestion });
  } catch (error) {
    console.error('Error creando sugerencia:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener todas las sugerencias (admin)
exports.getAllSuggestions = async (req, res) => {
  try {
    const sugerencias = await Suggestion.find().sort({ fecha: -1 });
    res.json(sugerencias);
  } catch (error) {
    console.error('Error obteniendo sugerencias:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar sugerencia por ID (admin)
exports.deleteSuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    await Suggestion.findByIdAndDelete(id);
    res.json({ message: 'Sugerencia eliminada' });
  } catch (error) {
    console.error('Error eliminando sugerencia:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}; 