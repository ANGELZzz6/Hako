const mongoose = require('mongoose');
const Cart = require('./models/Cart');
require('dotenv').config();

async function fixCartTotals() {
  try {
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hako');
    console.log('✅ Conectado a MongoDB');

    // Ejecutar la corrección de totales
    await Cart.fixIncorrectTotals();
    
    console.log('✅ Corrección de totales completada');
    
    // Verificar que los totales estén correctos
    const carts = await Cart.find();
    let incorrectCarts = 0;
    
    for (const cart of carts) {
      const correctTotal = cart.items.reduce((sum, item) => {
        return sum + (item.precio_unitario * item.cantidad);
      }, 0);
      
      if (cart.total !== correctTotal) {
        incorrectCarts++;
        console.log(`❌ Cart ${cart._id} still has incorrect total: ${cart.total} should be ${correctTotal}`);
      }
    }
    
    if (incorrectCarts === 0) {
      console.log('✅ Todos los totales están correctos');
    } else {
      console.log(`❌ ${incorrectCarts} carritos aún tienen totales incorrectos`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script
fixCartTotals(); 