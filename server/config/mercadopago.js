const { MercadoPagoConfig } = require('mercadopago');

// Configuración para entorno de pruebas
// IMPORTANTE: Usar un access token válido de tu cuenta de Mercado Pago
const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || 'TEST-3997869409987199-070320-5f0b936cb84305d1e5215b576d609165-544117534'
});

console.log('=== CONFIGURACIÓN MERCADO PAGO ===');
console.log('Access Token:', mp.accessToken ? mp.accessToken.substring(0, 20) + '...' : 'NO CONFIGURADO');
console.log('Entorno: PRUEBAS');
console.log('=====================================');

// Verificar que el access token sea válido
if (!mp.accessToken || !mp.accessToken.startsWith('TEST-')) {
  console.error('⚠️  ADVERTENCIA: Access Token no válido para pruebas');
  console.error('   Obtén un nuevo token en: https://www.mercadopago.com/developers/panel/credentials');
}

module.exports = mp; 