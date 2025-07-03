const mp = require('../config/mercadopago');
const { Preference } = require('mercadopago');

const preferenceClient = new Preference(mp);

exports.createPreference = async (req, res) => {
  try {
    const { items, payer } = req.body; // items: [{title, quantity, unit_price, picture_url}]
    
    // Logs detallados para debugging
    console.log('=== DEBUG PAYMENT ===');
    console.log('Items recibidos:', JSON.stringify(items, null, 2));
    console.log('Payer recibido:', JSON.stringify(payer, null, 2));
    console.log('Email del comprador:', payer?.email);
    
    const preference = {
      items,
      payer: {
        ...payer,
        identification: {
          type: "CC",
          number: "12345678"
        }
      },
      payment_methods: {
        installments: 24,
        default_installments: 1
      },
      back_urls: {
        success: 'http://localhost:5173/',
        failure: 'http://localhost:5173/',
        pending: 'http://localhost:5173/'
      },
      notification_url: 'http://localhost:5000/api/payment/webhook',
      statement_descriptor: 'HAKO STORE',
      expires: true,
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };
    
    console.log('Preferencia completa a enviar a MP:', JSON.stringify(preference, null, 2));
    console.log('Access Token usado:', mp.accessToken ? mp.accessToken.substring(0, 20) + '...' : 'no definido');
    
    const response = await preferenceClient.create({ body: preference });
    console.log('Preferencia creada exitosamente:', response.id);
    console.log('Init point:', response.init_point);
    console.log('Métodos de pago disponibles:', JSON.stringify(response.payment_methods, null, 2));
    console.log('=== FIN DEBUG PAYMENT ===');
    
    res.json({ id: response.id, init_point: response.init_point });
  } catch (error) {
    console.error('Error en createPreference:', error);
    console.error('Detalles del error:', error.message, error.cause);
    res.status(500).json({ error: error.message });
  }
}; 