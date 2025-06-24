const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const sampleProducts = [
  {
    nombre: "Camisa Blanca",
    descripcion: "Camisa de algodón premium, talla M, perfecta para ocasiones formales",
    precio: 79.99,
    stock: 30,
    imagen_url: "https://cdn.hako.com/img/camisa_blanca.jpg",
    isActive: true
  },
  {
    nombre: "Laptop Gaming Pro",
    descripcion: "Laptop de alto rendimiento para gaming y trabajo profesional",
    precio: 1299.99,
    stock: 15,
    imagen_url: "https://cdn.hako.com/img/laptop_gaming.jpg",
    isActive: true
  },
  {
    nombre: "Auriculares Inalámbricos",
    descripcion: "Auriculares bluetooth con cancelación de ruido activa",
    precio: 149.99,
    stock: 50,
    imagen_url: "https://cdn.hako.com/img/auriculares.jpg",
    isActive: true
  },
  {
    nombre: "Smartphone Galaxy S23",
    descripcion: "Teléfono inteligente con cámara de 108MP y procesador de última generación",
    precio: 899.99,
    stock: 25,
    imagen_url: "https://cdn.hako.com/img/smartphone.jpg",
    isActive: true
  },
  {
    nombre: "Cafetera Express",
    descripcion: "Cafetera automática para preparar el mejor café en casa",
    precio: 299.99,
    stock: 0,
    imagen_url: "https://cdn.hako.com/img/cafetera.jpg",
    isActive: false
  },
  {
    nombre: "Zapatillas Running",
    descripcion: "Zapatillas deportivas ideales para correr y entrenar",
    precio: 89.99,
    stock: 40,
    imagen_url: "https://cdn.hako.com/img/zapatillas.jpg",
    isActive: true
  },
  {
    nombre: "Libro de Programación",
    descripcion: "Guía completa de JavaScript moderno para desarrolladores",
    precio: 39.99,
    stock: 100,
    imagen_url: "https://cdn.hako.com/img/libro.jpg",
    isActive: true
  },
  {
    nombre: "Monitor 4K",
    descripcion: "Monitor de 27 pulgadas con resolución 4K para trabajo y gaming",
    precio: 449.99,
    stock: 20,
    imagen_url: "https://cdn.hako.com/img/monitor.jpg",
    isActive: true
  }
];

async function seedProducts() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hako');
    console.log('Conectado a MongoDB');

    // Limpiar productos existentes
    await Product.deleteMany({});
    console.log('Productos existentes eliminados');

    // Insertar productos de ejemplo
    const insertedProducts = await Product.insertMany(sampleProducts);
    console.log(`${insertedProducts.length} productos insertados exitosamente`);

    // Mostrar productos insertados
    console.log('\nProductos insertados:');
    insertedProducts.forEach(product => {
      console.log(`- ${product.nombre}: $${product.precio} (Stock: ${product.stock})`);
    });

    console.log('\n¡Base de datos poblada exitosamente!');
  } catch (error) {
    console.error('Error al poblar la base de datos:', error);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('Conexión a MongoDB cerrada');
    process.exit(0);
  }
}

// Ejecutar el script
seedProducts(); 