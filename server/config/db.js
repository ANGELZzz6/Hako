// db.js
// Configuración de conexión a la base de datos MongoDB

const { MongoClient, ServerApiVersion } = require('mongodb');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Verificar que la URI existe
if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI no está definida en las variables de entorno');
    console.log('Directorio actual:', process.cwd());
    console.log('Ruta del archivo .env:', path.join(process.cwd(), '.env'));
    process.exit(1);
}

const uri = process.env.MONGODB_URI;
console.log('URI de conexión:', uri); // Para debug

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const connectDB = async () => {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("¡Conexión exitosa a MongoDB Atlas!");
    } catch (error) {
        console.error("Error de conexión a MongoDB Atlas:", error);
        process.exit(1);
    }
};

module.exports = { connectDB, client };
