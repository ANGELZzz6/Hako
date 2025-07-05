const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Obtener el carrito del usuario
const getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    
    let cart = await Cart.findOne({ id_usuario: userId })
      .populate('items.id_producto', 'nombre precio imagen_url descripcion')
      .exec();
    
    if (!cart) {
      // Crear un carrito vacío si no existe
      cart = new Cart({
        id_usuario: userId,
        items: [],
        total: 0
      });
      await cart.save();
    }
    
    res.json(cart);
  } catch (error) {
    console.error('Error al obtener carrito:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Agregar producto al carrito
const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1, variants = {} } = req.body;
    
    // Validar que el producto existe
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    
    // Validar variantes si el producto las tiene habilitadas
    let finalPrice = product.precio;
    let variantDescription = '';
    
    if (product.variants && product.variants.enabled) {
      // Verificar que se proporcionaron todas las variantes requeridas
      for (const attribute of product.variants.attributes) {
        if (attribute.required && !variants[attribute.name]) {
          return res.status(400).json({ 
            message: `La variante '${attribute.name}' es obligatoria` 
          });
        }
        
        if (variants[attribute.name]) {
          // Buscar la opción seleccionada
          const selectedOption = attribute.options.find(opt => opt.value === variants[attribute.name]);
          if (!selectedOption) {
            return res.status(400).json({ 
              message: `Opción '${variants[attribute.name]}' no válida para '${attribute.name}'` 
            });
          }
          
          if (!selectedOption.isActive) {
            return res.status(400).json({ 
              message: `La opción '${variants[attribute.name]}' no está disponible` 
            });
          }
          
          // Verificar stock
          if (selectedOption.stock < quantity) {
            return res.status(400).json({ 
              message: `Stock insuficiente para la variante '${variants[attribute.name]}'` 
            });
          }
          
          // Agregar precio adicional
          finalPrice += selectedOption.price;
          variantDescription += `${attribute.name}: ${variants[attribute.name]}, `;
        }
      }
      
      // Remover la última coma y espacio
      if (variantDescription) {
        variantDescription = variantDescription.slice(0, -2);
      }
    } else {
      // Para productos sin variantes, verificar stock general
      if (product.stock < quantity) {
        return res.status(400).json({ message: 'Stock insuficiente' });
      }
    }
    
    // Buscar o crear carrito
    let cart = await Cart.findOne({ id_usuario: userId });
    if (!cart) {
      cart = new Cart({
        id_usuario: userId,
        items: [],
        total: 0
      });
    }
    
    // Crear un identificador único para el item (producto + variantes)
    const itemKey = productId + (variantDescription ? `_${variantDescription}` : '');
    
    // Verificar si el producto ya está en el carrito
    const existingItemIndex = cart.items.findIndex(
      item => {
        const itemVariantDesc = item.variants ? Object.entries(item.variants)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ') : '';
        const currentItemKey = item.id_producto.toString() + (itemVariantDesc ? `_${itemVariantDesc}` : '');
        return currentItemKey === itemKey;
      }
    );
    
    if (existingItemIndex > -1) {
      // Actualizar cantidad si ya existe
      cart.items[existingItemIndex].cantidad += quantity;
    } else {
      // Agregar nuevo item
      cart.items.push({
        id_producto: productId,
        cantidad: quantity,
        precio_unitario: finalPrice,
        nombre_producto: product.nombre,
        imagen_producto: product.imagen_url,
        variants: Object.keys(variants).length > 0 ? variants : undefined
      });
    }
    
    await cart.save();
    
    // Poblar los datos del producto para la respuesta
    await cart.populate('items.id_producto', 'nombre precio imagen_url descripcion');
    
    res.json(cart);
  } catch (error) {
    console.error('Error al agregar al carrito:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Actualizar cantidad de un item
const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    const { quantity } = req.body;
    
    if (quantity < 1) {
      return res.status(400).json({ message: 'La cantidad debe ser mayor a 0' });
    }
    
    const cart = await Cart.findOne({ id_usuario: userId });
    if (!cart) {
      return res.status(404).json({ message: 'Carrito no encontrado' });
    }
    
    const itemIndex = cart.items.findIndex(
      item => item.id_producto.toString() === productId
    );
    
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Producto no encontrado en el carrito' });
    }
    
    cart.items[itemIndex].cantidad = quantity;
    await cart.save();
    
    await cart.populate('items.id_producto', 'nombre precio imagen_url descripcion');
    
    res.json(cart);
  } catch (error) {
    console.error('Error al actualizar item del carrito:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Remover item del carrito
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    
    const cart = await Cart.findOne({ id_usuario: userId });
    if (!cart) {
      return res.status(404).json({ message: 'Carrito no encontrado' });
    }
    
    cart.items = cart.items.filter(
      item => item.id_producto.toString() !== productId
    );
    
    await cart.save();
    
    await cart.populate('items.id_producto', 'nombre precio imagen_url descripcion');
    
    res.json(cart);
  } catch (error) {
    console.error('Error al remover item del carrito:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Remover múltiples items del carrito
const removeMultipleItems = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productIds } = req.body;
    
    if (!Array.isArray(productIds)) {
      return res.status(400).json({ message: 'productIds debe ser un array' });
    }
    
    const cart = await Cart.findOne({ id_usuario: userId });
    if (!cart) {
      return res.status(404).json({ message: 'Carrito no encontrado' });
    }
    
    // Filtrar los items que NO están en la lista de productIds a eliminar
    cart.items = cart.items.filter(
      item => !productIds.includes(item.id_producto.toString())
    );
    
    await cart.save();
    
    await cart.populate('items.id_producto', 'nombre precio imagen_url descripcion');
    
    res.json(cart);
  } catch (error) {
    console.error('Error al remover múltiples items del carrito:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Vaciar carrito
const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const cart = await Cart.findOne({ id_usuario: userId });
    if (!cart) {
      return res.status(404).json({ message: 'Carrito no encontrado' });
    }
    
    cart.items = [];
    await cart.save();
    
    res.json(cart);
  } catch (error) {
    console.error('Error al vaciar carrito:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener todos los carritos (para admin)
const getAllCarts = async (req, res) => {
  try {
    const carts = await Cart.find()
      .populate('id_usuario', 'nombre email')
      .populate('items.id_producto', 'nombre precio imagen_url')
      .sort({ creado_en: -1 })
      .exec();
    
    res.json(carts);
  } catch (error) {
    console.error('Error al obtener todos los carritos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener estadísticas de carritos (para admin)
const getCartStats = async (req, res) => {
  try {
    const totalCarts = await Cart.countDocuments();
    const activeCarts = await Cart.countDocuments({ 'items.0': { $exists: true } });
    const totalItems = await Cart.aggregate([
      { $unwind: '$items' },
      { $group: { _id: null, total: { $sum: '$items.cantidad' } } }
    ]);
    
    const totalValue = await Cart.aggregate([
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    res.json({
      totalCarts,
      activeCarts,
      totalItems: totalItems[0]?.total || 0,
      totalValue: totalValue[0]?.total || 0
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  removeMultipleItems,
  clearCart,
  getAllCarts,
  getCartStats
}; 