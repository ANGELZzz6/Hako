const { MercadoPagoConfig } = require('mercadopago');

// Usar el access token de producción real para pruebas reales
const mp = new MercadoPagoConfig({
  accessToken: 'APP_USR-7977985098720195-070218-dfdd8e1c893af472765ef289644e8b30-544117534'
});

console.log('Mercado Pago configurado para entorno REAL (producción)');
console.log('¡ATENCIÓN! Las transacciones serán reales. Usa montos bajos para pruebas.');

module.exports = mp; 