// db.js
// Configuración de conexión a la base de datos MongoDB

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Verificar que la URI existe
if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI no está definida en las variables de entorno');
    process.exit(1);
}

const uri = process.env.MONGODB_URI;

const connectDB = async () => {
    try {
        await mongoose.connect(uri, { dbName: 'HAKO' });
        console.log("¡Conexión exitosa a la base de datos HAKO con Mongoose!");
    } catch (error) {
        console.error("Error de conexión a MongoDB con Mongoose:", error);
        process.exit(1);
    }
};

module.exports = { connectDB };
