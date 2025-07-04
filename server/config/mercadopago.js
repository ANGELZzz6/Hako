const { MercadoPagoConfig } = require('mercadopago');

// Usar el access token de la app creada en la cuenta de prueba vendedor para pruebas
const mp = new MercadoPagoConfig({
  accessToken: 'TEST-3997869409987199-070320-5f0b936cb84305d1e5215b576d609165-544117534'
});

console.log('Mercado Pago configurado para entorno de pruebas con credenciales de la cuenta de testeo.');
console.log('¡Puedes usar cuentas y tarjetas de prueba para simular pagos!');

module.exports = mp; 