const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/HAKO')
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

const Product = require('./models/Product');
const IndividualProduct = require('./models/IndividualProduct');

async function debugSapoProduct() {
  try {
    console.log('🔍 Debuggeando producto "sapo"...');
    
    // Buscar el producto sapo directamente
    const sapoProduct = await Product.findOne({ nombre: 'sapo' });
    
    if (!sapoProduct) {
      console.log('❌ Producto "sapo" no encontrado');
      return;
    }
    
    console.log('✅ Producto "sapo" encontrado:', {
      id: sapoProduct._id,
      nombre: sapoProduct.nombre,
      dimensiones: sapoProduct.dimensiones
    });
    
    // Verificar si tiene dimensiones
    console.log('📏 Verificando dimensiones...');
    console.log('  - dimensiones object:', sapoProduct.dimensiones);
    console.log('  - largo:', sapoProduct.dimensiones?.largo);
    console.log('  - ancho:', sapoProduct.dimensiones?.ancho);
    console.log('  - alto:', sapoProduct.dimensiones?.alto);
    
    // Probar los métodos
    console.log('🧪 Probando métodos...');
    
    if (typeof sapoProduct.tieneDimensiones === 'function') {
      const tieneDimensiones = sapoProduct.tieneDimensiones();
      console.log('  - tieneDimensiones():', tieneDimensiones);
    } else {
      console.log('  - ❌ Método tieneDimensiones no existe');
    }
    
    if (typeof sapoProduct.getVolumen === 'function') {
      const volumen = sapoProduct.getVolumen();
      console.log('  - getVolumen():', volumen);
    } else {
      console.log('  - ❌ Método getVolumen no existe');
    }
    
    // Ahora buscar productos individuales del sapo
    console.log('\n🔍 Buscando productos individuales del sapo...');
    const individualProducts = await IndividualProduct.find({
      product: sapoProduct._id
    }).populate('product');
    
    console.log(`📊 Productos individuales encontrados: ${individualProducts.length}`);
    
    if (individualProducts.length > 0) {
      const firstIndividual = individualProducts[0];
      console.log('📦 Primer producto individual:', {
        id: firstIndividual._id,
        status: firstIndividual.status,
        productId: firstIndividual.product?._id
      });
      
      const populatedProduct = firstIndividual.product;
      if (populatedProduct) {
        console.log('✅ Producto populado encontrado:', {
          id: populatedProduct._id,
          nombre: populatedProduct.nombre,
          dimensiones: populatedProduct.dimensiones
        });
        
        // Verificar métodos en el producto populado
        console.log('🧪 Probando métodos en producto populado...');
        
        if (typeof populatedProduct.tieneDimensiones === 'function') {
          const tieneDimensiones = populatedProduct.tieneDimensiones();
          console.log('  - tieneDimensiones():', tieneDimensiones);
        } else {
          console.log('  - ❌ Método tieneDimensiones no existe en producto populado');
        }
        
        if (typeof populatedProduct.getVolumen === 'function') {
          const volumen = populatedProduct.getVolumen();
          console.log('  - getVolumen():', volumen);
        } else {
          console.log('  - ❌ Método getVolumen no existe en producto populado');
        }
        
        // Intentar agregar los métodos manualmente
        console.log('🔧 Agregando métodos manualmente...');
        populatedProduct.tieneDimensiones = function() {
          return this.dimensiones && 
                 this.dimensiones.largo && 
                 this.dimensiones.ancho && 
                 this.dimensiones.alto;
        };
        
        populatedProduct.getVolumen = function() {
          if (this.dimensiones && this.dimensiones.largo && this.dimensiones.ancho && this.dimensiones.alto) {
            return this.dimensiones.largo * this.dimensiones.ancho * this.dimensiones.alto;
          }
          return 0;
        };
        
        // Probar nuevamente
        console.log('🧪 Probando métodos agregados manualmente...');
        const tieneDimensionesManual = populatedProduct.tieneDimensiones();
        const volumenManual = populatedProduct.getVolumen();
        console.log('  - tieneDimensiones() manual:', tieneDimensionesManual);
        console.log('  - getVolumen() manual:', volumenManual);
      } else {
        console.log('❌ Producto no encontrado en populate');
      }
    }
    
  } catch (error) {
    console.error('❌ Error en debug:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

debugSapoProduct(); 