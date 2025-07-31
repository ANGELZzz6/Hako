const Order = require('../models/Order');
const IndividualProduct = require('../models/IndividualProduct');
const binPackingService = require('../services/binPackingService');

// Obtener el pedido activo del usuario (solo uno por usuario)
exports.getMyOrders = async (req, res) => {
  try {
    // Buscar solo el pedido activo (no recogido) del usuario
    const activeOrder = await Order.findOne({ 
      user: req.user.id,
      status: { $nin: ['picked_up', 'cancelled'] }
    })
    .populate('items.product')
    .sort({ createdAt: -1 });

    // Si no hay pedido activo, devolver array vacío
    if (!activeOrder) {
      return res.json([]);
    }

    res.json([activeOrder]); // Devolver como array para mantener compatibilidad
  } catch (error) {
    console.error('Error al obtener pedido activo:', error);
    res.status(500).json({ error: 'Error al obtener tu pedido' });
  }
};

// Obtener todos los pedidos del usuario (historial)
exports.getMyOrderHistory = async (req, res) => {
  try {
    // Solo pedidos que ya terminaron su flujo (recogidos o cancelados)
    const orders = await Order.find({ 
      user: req.user.id,
      status: { $in: ['picked_up', 'cancelled'] }
    })
      .populate('items.product')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Error al obtener historial de pedidos:', error);
    res.status(500).json({ error: 'Error al obtener tu historial de pedidos' });
  }
};

// Obtener productos comprados por el usuario
exports.getMyPurchasedProducts = async (req, res) => {
  try {
    console.log('🔍 Buscando productos individuales para usuario:', req.user.id);
    
    // Obtener todos los productos individuales del usuario
    const individualProducts = await IndividualProduct.find({ 
      user: req.user.id,
      status: { $in: ['available', 'reserved', 'claimed'] }
    }).populate('product order');

    console.log(`📊 Productos individuales encontrados: ${individualProducts.length}`);

    // Transformar los productos individuales al formato esperado
    const allItems = individualProducts.map(individualProduct => {
      try {
        const product = individualProduct.product;
        
        // Verificar que el producto existe
        if (!product) {
          console.log('⚠️ Producto no encontrado para individualProduct:', individualProduct._id);
          return null;
        }
        
        // Usar los métodos del IndividualProduct para dimensiones y volumen
        const tieneDimensiones = individualProduct.tieneDimensiones();
        const volumen = individualProduct.getVolumen();
        
        // Obtener dimensiones considerando variantes si existen
        let dimensiones = individualProduct.dimensiones;
        console.log('🔍 Procesando producto individual:', individualProduct._id);
        console.log('   - Variants:', individualProduct.variants);
        console.log('   - Dimensiones base:', individualProduct.dimensiones);
        
        if (individualProduct.variants && individualProduct.variants.size > 0) {
          console.log('   - Tiene variantes, calculando dimensiones de variante...');
          const variantDimensiones = individualProduct.getVariantOrProductDimensions();
          console.log('   - Dimensiones de variante calculadas:', variantDimensiones);
          if (variantDimensiones) {
            dimensiones = variantDimensiones;
            console.log('   - Usando dimensiones de variante:', dimensiones);
          } else {
            console.log('   - No se encontraron dimensiones de variante, usando base');
          }
        } else {
          console.log('   - No tiene variantes, usando dimensiones base');
        }
        
        // Agregar los campos calculados al producto
        product.tieneDimensiones = tieneDimensiones;
        product.volumen = volumen;
        
        return {
          _id: individualProduct._id,
          product: product,
          orderId: individualProduct.order?._id,
          orderCreatedAt: individualProduct.order?.createdAt,
          quantity: 1, // Cada producto individual tiene cantidad 1
          remaining_quantity: individualProduct.status === 'available' ? 1 : 0,
          isClaimed: individualProduct.status === 'claimed',
          isReserved: individualProduct.status === 'reserved',
          originalItemId: individualProduct._id, // ID del producto individual
          individualIndex: individualProduct.individualIndex,
          totalInOrder: 1, // Cada producto individual es único
          assigned_locker: individualProduct.assignedLocker,
          unit_price: individualProduct.unitPrice,
          variants: individualProduct.variants ? Object.fromEntries(individualProduct.variants) : undefined,
          dimensiones: dimensiones
        };
      } catch (itemError) {
        console.error('❌ Error procesando producto individual:', individualProduct._id, itemError);
        return null;
      }
    }).filter(item => item !== null); // Filtrar items nulos

    console.log(`✅ Productos transformados exitosamente: ${allItems.length}`);
    res.json(allItems);
  } catch (error) {
    console.error('❌ Error al obtener productos comprados:', error);
    res.status(500).json({ error: 'Error al obtener tus productos comprados' });
  }
};

// Reclamar productos desde inventario (función original)
exports.claimProductsFromInventory = async (req, res) => {
  try {
    const { selectedItems } = req.body; // Array de { itemIndex, quantity, lockerNumber, orderId }

    // Validar que los items seleccionados son válidos
    const validationErrors = [];
    const lockerAssignments = new Map(); // locker -> volumen total

    for (const selection of selectedItems) {
      const { itemIndex, quantity, lockerNumber, orderId } = selection;
      
      // Obtener el pedido y validar
      const order = await Order.findOne({ 
        _id: orderId, 
        user: req.user.id,
        status: { $in: ['paid', 'ready_for_pickup'] }
      }).populate('items.product');

      if (!order) {
        validationErrors.push(`Pedido no encontrado o no disponible`);
        continue;
      }

      if (itemIndex < 0 || itemIndex >= order.items.length) {
        validationErrors.push(`Índice de item inválido: ${itemIndex}`);
        continue;
      }

      const item = order.items[itemIndex];
      const remainingQuantity = item.quantity - (item.claimed_quantity || 0);
      
      if (quantity > remainingQuantity) {
        validationErrors.push(`Cantidad solicitada (${quantity}) excede la cantidad disponible (${remainingQuantity}) para ${item.product.nombre}`);
        continue;
      }

      if (quantity <= 0) {
        validationErrors.push(`Cantidad debe ser mayor a 0 para ${item.product.nombre}`);
        continue;
      }

      // Validar dimensiones del producto (los métodos se pierden en populate)
      const product = item.product;
      const tieneDimensiones = product.dimensiones && 
                               product.dimensiones.largo && 
                               product.dimensiones.ancho && 
                               product.dimensiones.alto;
      
      if (!tieneDimensiones) {
        validationErrors.push(`El producto ${product.nombre} no tiene dimensiones configuradas`);
        continue;
      }

      // Calcular volumen total para este locker
      const itemVolume = product.dimensiones.largo * product.dimensiones.ancho * product.dimensiones.alto * quantity;
      const currentLockerVolume = lockerAssignments.get(lockerNumber) || 0;
      const newTotalVolume = currentLockerVolume + itemVolume;

      // Verificar que el locker no exceda el límite (asumiendo 50x50x50 cm = 125,000 cm³)
      const LOCKER_MAX_VOLUME = 125000; // 50x50x50 cm
      
      if (newTotalVolume > LOCKER_MAX_VOLUME) {
        validationErrors.push(`Los productos seleccionados para el casillero ${lockerNumber} exceden el espacio disponible`);
        continue;
      }

      lockerAssignments.set(lockerNumber, newTotalVolume);
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Errores de validación', 
        details: validationErrors 
      });
    }

    // Verificar que los lockers no estén ocupados por otros pedidos
    const usedLockers = Array.from(lockerAssignments.keys());
    const existingOrders = await Order.find({
      'items.assigned_locker': { $in: usedLockers },
      status: { $nin: ['picked_up', 'cancelled'] }
    });

    const occupiedLockers = existingOrders.reduce((acc, existingOrder) => {
      existingOrder.items.forEach(item => {
        if (item.assigned_locker && usedLockers.includes(item.assigned_locker)) {
          acc.push(item.assigned_locker);
        }
      });
      return acc;
    }, []);

    if (occupiedLockers.length > 0) {
      return res.status(400).json({ 
        error: 'Los siguientes casilleros están ocupados', 
        occupiedLockers: [...new Set(occupiedLockers)]
      });
    }

    // Aplicar las reclamaciones
    for (const selection of selectedItems) {
      const { itemIndex, quantity, lockerNumber, orderId } = selection;
      
      const order = await Order.findById(orderId);
      if (!order) continue;

      const item = order.items[itemIndex];
      item.claimed_quantity = (item.claimed_quantity || 0) + quantity;
      item.assigned_locker = lockerNumber;

      await order.save();
    }

    res.json({
      message: 'Productos reclamados exitosamente',
      lockerAssignments: Array.from(lockerAssignments.entries()).map(([locker, volume]) => ({
        locker: locker,
        volume: volume,
        volumePercentage: Math.round((volume / 125000) * 100)
      }))
    });

  } catch (error) {
    console.error('Error al reclamar productos desde inventario:', error);
    res.status(500).json({ error: 'Error al reclamar productos' });
  }
};

// Reclamar productos individuales
exports.claimIndividualProducts = async (req, res) => {
  try {
    const { selectedItems } = req.body; // Array de { individualProductId, lockerNumber }

    // Validar que los items seleccionados son válidos
    const validationErrors = [];
    const lockerAssignments = new Map(); // locker -> volumen total

    for (const selection of selectedItems) {
      const { individualProductId, lockerNumber } = selection;
      
      // Obtener el producto individual y validar
      const individualProduct = await IndividualProduct.findOne({ 
        _id: individualProductId, 
        user: req.user.id,
        status: 'available'
      }).populate('product');

      if (!individualProduct) {
        validationErrors.push(`Producto individual no encontrado o no disponible`);
        continue;
      }

      // Validar dimensiones del producto usando los métodos del IndividualProduct
      if (!individualProduct.tieneDimensiones()) {
        validationErrors.push(`El producto ${individualProduct.product.nombre} no tiene dimensiones configuradas`);
        continue;
      }

      // Calcular volumen para este locker (solo 1 producto)
      const itemVolume = individualProduct.getVolumen();
      const currentLockerVolume = lockerAssignments.get(lockerNumber) || 0;
      const newTotalVolume = currentLockerVolume + itemVolume;

      // Verificar que el locker no exceda el límite (asumiendo 50x50x50 cm = 125,000 cm³)
      const LOCKER_MAX_VOLUME = 125000; // 50x50x50 cm
      
      if (newTotalVolume > LOCKER_MAX_VOLUME) {
        validationErrors.push(`Los productos seleccionados para el casillero ${lockerNumber} exceden el espacio disponible`);
        continue;
      }

      lockerAssignments.set(lockerNumber, newTotalVolume);
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Errores de validación', 
        details: validationErrors 
      });
    }

    // Verificar que los lockers no estén ocupados por otros usuarios
    const usedLockers = Array.from(lockerAssignments.keys());
    const occupiedProducts = await IndividualProduct.find({
      assignedLocker: { $in: usedLockers },
      status: { $in: ['reserved', 'claimed'] },
      user: { $ne: req.user.id }
    });

    const occupiedLockers = occupiedProducts.map(product => product.assignedLocker);

    if (occupiedLockers.length > 0) {
      return res.status(400).json({ 
        error: 'Los siguientes casilleros están ocupados por otros usuarios', 
        occupiedLockers: [...new Set(occupiedLockers)]
      });
    }

    // Aplicar las reclamaciones
    for (const selection of selectedItems) {
      const { individualProductId, lockerNumber } = selection;
      
      const individualProduct = await IndividualProduct.findById(individualProductId);
      if (!individualProduct) continue;

      individualProduct.status = 'claimed';
      individualProduct.assignedLocker = lockerNumber;
      individualProduct.claimedAt = new Date();

      await individualProduct.save();
    }

    res.json({
      message: 'Productos reclamados exitosamente',
      lockerAssignments: Array.from(lockerAssignments.entries()).map(([locker, volume]) => ({
        locker: locker,
        volume: volume,
        volumePercentage: Math.round((volume / 125000) * 100)
      }))
    });

  } catch (error) {
    console.error('Error al reclamar productos individuales:', error);
    res.status(500).json({ error: 'Error al reclamar productos' });
  }
};

// Seleccionar casillero para el pedido
exports.selectLocker = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { lockerNumber } = req.body;

    // Validar número de casillero
    if (!lockerNumber || lockerNumber < 1 || lockerNumber > 12) {
      return res.status(400).json({ error: 'Número de casillero inválido. Debe ser entre 1 y 12.' });
    }

    // Verificar que el pedido pertenece al usuario
    const order = await Order.findOne({ 
      _id: orderId, 
      user: req.user.id,
      status: { $nin: ['picked_up', 'cancelled'] }
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado o no disponible' });
    }

    // Verificar que el casillero no esté ocupado por otro pedido activo
    const existingOrder = await Order.findOne({
      'locker.number': lockerNumber,
      status: { $nin: ['picked_up', 'cancelled'] },
      'locker.number': { $ne: null, $exists: true },
      _id: { $ne: orderId }
    });

    if (existingOrder) {
      return res.status(400).json({ error: 'Este casillero ya está ocupado. Por favor selecciona otro.' });
    }

    // Actualizar el pedido con el casillero seleccionado
    order.locker.number = lockerNumber;
    order.locker.selected_at = new Date();
    order.status = 'ready_for_pickup';
    await order.save();

    res.json(order);
  } catch (error) {
    console.error('Error al seleccionar casillero:', error);
    res.status(500).json({ error: 'Error al seleccionar casillero' });
  }
};

// Marcar pedido como recogido
exports.markAsPickedUp = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Verificar que el pedido pertenece al usuario
    const order = await Order.findOne({ 
      _id: orderId, 
      user: req.user.id,
      status: 'ready_for_pickup'
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado o no está listo para recoger' });
    }

    // Marcar como recogido y limpiar el casillero
    order.status = 'picked_up';
    order.locker.picked_up_at = new Date();
    order.locker.number = null; // Liberar el casillero
    await order.save();

    console.log('✅ Pedido marcado como recogido y casillero liberado:', orderId);

    res.json(order);
  } catch (error) {
    console.error('Error al marcar como recogido:', error);
    res.status(500).json({ error: 'Error al marcar como recogido' });
  }
};

// Obtener un pedido por ID (solo si es del usuario o admin)
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.product user');
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el pedido' });
  }
};

// Cambiar el estado de un pedido (solo admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo admin puede cambiar el estado' });
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('items.product user');
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el estado del pedido' });
  }
};

// Obtener todos los pedidos (solo admin)
exports.getAllOrders = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo admin puede ver todos los pedidos' });
    const orders = await Order.find().populate('items.product user').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los pedidos' });
  }
};

// Obtener casilleros disponibles (para admin)
exports.getAvailableLockers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo admin puede ver casilleros' });
    
    // Obtener todos los casilleros ocupados (solo los que tienen número asignado y no están recogidos)
    const occupiedLockers = await Order.find({
      status: { $nin: ['picked_up', 'cancelled'] },
      'locker.number': { $ne: null, $exists: true }
    }).select('locker.number');

    const occupiedNumbers = occupiedLockers.map(order => order.locker.number);
    
    // Generar lista de todos los casilleros (1-12)
    const allLockers = Array.from({ length: 12 }, (_, i) => i + 1);
    const availableLockers = allLockers.filter(num => !occupiedNumbers.includes(num));

    res.json({
      total: 12,
      occupied: occupiedNumbers,
      available: availableLockers
    });
  } catch (error) {
    console.error('Error al obtener casilleros:', error);
    res.status(500).json({ error: 'Error al obtener casilleros' });
  }
};

// Obtener productos disponibles para reclamar de un pedido
exports.getAvailableProducts = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Verificar que el pedido pertenece al usuario
    const order = await Order.findOne({ 
      _id: orderId, 
      user: req.user.id,
      status: { $in: ['paid', 'ready_for_pickup'] }
    }).populate('items.product');

    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado o no disponible para reclamar' });
    }

    // Obtener productos no reclamados
    const availableItems = order.items.filter(item => item.claimed_quantity < item.quantity);
    
    // Calcular información adicional para cada item
    const itemsWithInfo = availableItems.map(item => ({
      ...item.toObject(),
      remaining_quantity: item.quantity - item.claimed_quantity,
      product: {
        ...item.product.toObject(),
        volumen: item.product.getVolumen(),
        tieneDimensiones: item.product.tieneDimensiones()
      }
    }));

    res.json({
      orderId: order._id,
      items: itemsWithInfo,
      total_unclaimed: order.getTotalUnclaimedQuantity()
    });
  } catch (error) {
    console.error('Error al obtener productos disponibles:', error);
    res.status(500).json({ error: 'Error al obtener productos disponibles' });
  }
};

// Reclamar productos específicos de un pedido
exports.claimProducts = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { selectedItems } = req.body; // Array de { itemIndex, quantity, lockerNumber }

    // Verificar que el pedido pertenece al usuario
    const order = await Order.findOne({ 
      _id: orderId, 
      user: req.user.id,
      status: { $in: ['paid', 'ready_for_pickup'] }
    }).populate('items.product');

    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado o no disponible para reclamar' });
    }

    // Validar que los items seleccionados son válidos
    const validationErrors = [];
    const lockerAssignments = new Map(); // locker -> volumen total

    for (const selection of selectedItems) {
      const { itemIndex, quantity, lockerNumber } = selection;
      
      if (itemIndex < 0 || itemIndex >= order.items.length) {
        validationErrors.push(`Índice de item inválido: ${itemIndex}`);
        continue;
      }

      const item = order.items[itemIndex];
      const remainingQuantity = item.quantity - item.claimed_quantity;
      
      if (quantity > remainingQuantity) {
        validationErrors.push(`Cantidad solicitada (${quantity}) excede la cantidad disponible (${remainingQuantity}) para ${item.product.nombre}`);
        continue;
      }

      if (quantity <= 0) {
        validationErrors.push(`Cantidad debe ser mayor a 0 para ${item.product.nombre}`);
        continue;
      }

      // Validar dimensiones del producto
      if (!item.product.tieneDimensiones()) {
        validationErrors.push(`El producto ${item.product.nombre} no tiene dimensiones configuradas`);
        continue;
      }

      // Calcular volumen total para este locker
      const itemVolume = item.product.getVolumen() * quantity;
      const currentLockerVolume = lockerAssignments.get(lockerNumber) || 0;
      const newTotalVolume = currentLockerVolume + itemVolume;

      // Verificar que el locker no exceda el límite (asumiendo 50x50x50 cm = 125,000 cm³)
      const LOCKER_MAX_VOLUME = 125000; // 50x50x50 cm
      
      if (newTotalVolume > LOCKER_MAX_VOLUME) {
        validationErrors.push(`Los productos seleccionados para el casillero ${lockerNumber} exceden el espacio disponible`);
        continue;
      }

      lockerAssignments.set(lockerNumber, newTotalVolume);
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Errores de validación', 
        details: validationErrors 
      });
    }

    // Verificar que los lockers no estén ocupados por otros pedidos
    const usedLockers = Array.from(lockerAssignments.keys());
    const existingOrders = await Order.find({
      'items.assigned_locker': { $in: usedLockers },
      status: { $nin: ['picked_up', 'cancelled'] },
      _id: { $ne: orderId }
    });

    const occupiedLockers = existingOrders.reduce((acc, existingOrder) => {
      existingOrder.items.forEach(item => {
        if (item.assigned_locker && usedLockers.includes(item.assigned_locker)) {
          acc.push(item.assigned_locker);
        }
      });
      return acc;
    }, []);

    if (occupiedLockers.length > 0) {
      return res.status(400).json({ 
        error: 'Los siguientes casilleros están ocupados', 
        occupiedLockers: [...new Set(occupiedLockers)]
      });
    }

    // Aplicar las reclamaciones
    for (const selection of selectedItems) {
      const { itemIndex, quantity, lockerNumber } = selection;
      const item = order.items[itemIndex];
      
      item.claimed_quantity += quantity;
      item.assigned_locker = lockerNumber;
    }

    // Si todos los productos han sido reclamados, cambiar el estado
    if (order.allItemsClaimed()) {
      order.status = 'ready_for_pickup';
    }

    await order.save();

    res.json({
      message: 'Productos reclamados exitosamente',
      order: order,
      lockerAssignments: Array.from(lockerAssignments.entries()).map(([locker, volume]) => ({
        locker: locker,
        volume: volume,
        volumePercentage: Math.round((volume / 125000) * 100)
      }))
    });

  } catch (error) {
    console.error('Error al reclamar productos:', error);
    res.status(500).json({ error: 'Error al reclamar productos' });
  }
};

// Obtener estado detallado de casilleros (para admin)
exports.getLockerStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo admin puede ver estado de casilleros' });
    
    // Obtener todos los pedidos activos con casilleros asignados
    const activeOrders = await Order.find({
      status: { $nin: ['picked_up', 'cancelled'] },
      'locker.number': { $ne: null, $exists: true }
    }).populate('user', 'nombre email').select('locker.number status user createdAt');

    // Crear mapa de estado de casilleros
    const lockerStatus = Array.from({ length: 12 }, (_, i) => {
      const lockerNumber = i + 1;
      const order = activeOrders.find(o => o.locker.number === lockerNumber);
      
      return {
        number: lockerNumber,
        status: order ? 'occupied' : 'available',
        order: order ? {
          id: order._id,
          status: order.status,
          user: order.user,
          createdAt: order.createdAt
        } : null
      };
    });

    res.json({
      total: 12,
      lockers: lockerStatus,
      summary: {
        available: lockerStatus.filter(l => l.status === 'available').length,
        occupied: lockerStatus.filter(l => l.status === 'occupied').length
      }
    });
  } catch (error) {
    console.error('Error al obtener estado de casilleros:', error);
    res.status(500).json({ error: 'Error al obtener estado de casilleros' });
  }
};

// Liberar casillero manualmente (para admin)
exports.releaseLocker = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo admin puede liberar casilleros' });
    
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    if (order.status === 'picked_up') {
      return res.status(400).json({ error: 'El pedido ya está marcado como recogido' });
    }

    // Marcar como recogido y liberar casillero
    order.status = 'picked_up';
    order.locker.picked_up_at = new Date();
    order.locker.number = null;
    await order.save();

    console.log('✅ Casillero liberado manualmente por admin:', orderId);

    res.json({ 
      message: 'Casillero liberado exitosamente',
      order 
    });
  } catch (error) {
    console.error('Error al liberar casillero:', error);
    res.status(500).json({ error: 'Error al liberar casillero' });
  }
};

// Borrar pedido (solo admin)
exports.deleteOrder = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo admin puede borrar pedidos' });
    
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Si el pedido tiene casillero asignado, liberarlo
    if (order.locker && order.locker.number) {
      console.log('🔓 Liberando casillero antes de borrar pedido:', order.locker.number);
    }

    await Order.findByIdAndDelete(id);

    console.log('✅ Pedido borrado por admin:', id);

    res.json({ 
      message: 'Pedido borrado exitosamente',
      deletedOrderId: id
    });
  } catch (error) {
    console.error('Error al borrar pedido:', error);
    res.status(500).json({ error: 'Error al borrar pedido' });
  }
}; 

// Validar si un casillero puede recibir más productos usando Bin Packing 3D
exports.validateLockerCapacity = async (req, res) => {
  try {
    const { lockerNumber, product } = req.body;
    
    if (!lockerNumber || !product) {
      return res.status(400).json({ 
        error: 'Se requiere número de casillero y producto' 
      });
    }

    // Obtener todos los productos en el casillero
    const orders = await Order.find({
      'items.assigned_locker': lockerNumber,
      status: { $nin: ['picked_up', 'cancelled'] }
    }).populate('items.product');

    // Usar Bin Packing para verificar si cabe el producto
    const result = binPackingService.canFitProduct(lockerNumber, orders, product);
    
    // Obtener estadísticas del casillero
    const lockerStatus = binPackingService.calculateLockerStatus(lockerNumber, orders);
    
    res.json({
      lockerNumber,
      currentVolume: lockerStatus.usedVolume,
      maxVolume: lockerStatus.maxVolume,
      usagePercentage: lockerStatus.usagePercentage,
      canFit: result.canFit,
      position: result.position,
      orientation: result.orientation,
      remainingSpace: lockerStatus.maxVolume - lockerStatus.usedVolume,
      reason: result.canFit ? null : `El casillero ${lockerNumber} no tiene espacio físico disponible para este producto.`,
      binPackingResult: result
    });

  } catch (error) {
    console.error('Error validando capacidad del casillero:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener estadísticas de casilleros usando Bin Packing 3D
exports.getSimpleLockerStats = async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $nin: ['picked_up', 'cancelled'] }
    }).populate('items.product');

    // Usar Bin Packing para calcular estadísticas reales
    const stats = binPackingService.getAllLockersStatus(orders);

    res.json(stats);

  } catch (error) {
    console.error('Error obteniendo estadísticas de casilleros:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Encontrar el mejor casillero para un producto usando Bin Packing 3D
exports.findBestLocker = async (req, res) => {
  try {
    const { product } = req.body;
    
    if (!product) {
      return res.status(400).json({ 
        error: 'Se requiere el producto' 
      });
    }

    const orders = await Order.find({
      status: { $nin: ['picked_up', 'cancelled'] }
    }).populate('items.product');

    // Usar Bin Packing para encontrar el mejor casillero
    const result = binPackingService.findBestLockerForProduct(orders, product);

    res.json(result);

  } catch (error) {
    console.error('Error encontrando mejor casillero:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

 