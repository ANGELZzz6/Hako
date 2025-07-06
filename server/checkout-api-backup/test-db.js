const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Cargar variables de entorno usando la misma ruta que el servidor principal
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const Producto = require('./models/productoModel');

const productosPrueba = [
  {
    name: "Box Premium",
    price: 99.99,
    description: "Box premium con productos seleccionados y exclusivos.",
    image: "https://via.placeholder.com/300x300?text=Box+Premium",
    category: "Box Premium",
    stock: 10
  },
  {
    name: "Box Gamer",
    price: 149.99,
    description: "Box especial para gamers con accesorios y coleccionables.",
    image: "https://via.placeholder.com/300x300?text=Box+Gamer",
    category: "Box Gamer",
    stock: 15
  },
  {
    name: "Box Anime",
    price: 199.99,
    description: "Box temático de anime con figuras y merchandising exclusivo.",
    image: "https://via.placeholder.com/300x300?text=Box+Anime",
    category: "Box Anime",
    stock: 20
  }
];

async function testDB() {
  try {
    // Conectar directamente con mongoose
    const uri = process.env.MONGODB_URI;
    console.log('Conectando a MongoDB...');
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('Conexión exitosa a la base de datos');

    // Limpiar productos existentes
    console.log('Eliminando productos existentes...');
    await Producto.deleteMany({});
    console.log('Productos existentes eliminados');

    // Insertar productos de prueba
    console.log('Insertando productos de prueba...');
    const productos = await Producto.insertMany(productosPrueba);
    console.log('Productos de prueba insertados:', productos);

    // Verificar que se pueden obtener los productos
    console.log('Verificando productos en la base de datos...');
    const todosLosProductos = await Producto.find({});
    console.log('Productos en la base de datos:', todosLosProductos);

    console.log('¡Prueba completada con éxito!');
  } catch (error) {
    console.error('Error durante la prueba:', error);
  } finally {
    // Cerrar la conexión de mongoose
    await mongoose.connection.close();
    console.log('Conexión cerrada');
  }
}

// Ejecutar la prueba
testDB().catch(console.error); 