const mongoose = require('mongoose');
const Product = require('./models/Product');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function checkProducts() {
  try {
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener todos los productos
    const allProducts = await Product.find();
    console.log(`📦 Total de productos en la base de datos: ${allProducts.length}`);

    // Mostrar detalles de cada producto
    for (const product of allProducts) {
      console.log(`\n🔄 Producto ID: ${product._id}`);
      console.log(`   Nombre: ${product.nombre}`);
      console.log(`   Precio: $${product.precio}`);
      console.log(`   Descripción: ${product.descripcion || 'Sin descripción'}`);
      console.log(`   Tiene dimensiones: ${product.tieneDimensiones()}`);
      console.log(`   Volumen: ${product.getVolumen()} cm³`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script
checkProducts(); 