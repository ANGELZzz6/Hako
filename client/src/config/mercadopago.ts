// Configuración de Mercado Pago para el frontend

// IMPORTANTE: Reemplaza con tu Public Key real de Mercado Pago
// Obtén tu Public Key en: https://www.mercadopago.com.co/developers/panel/credentials
export const MERCADOPAGO_CONFIG = {
  // Public Key de prueba (debe empezar con TEST-)
  // IMPORTANTE: Obtén tu Public Key real en: https://www.mercadopago.com.co/developers/panel/credentials
  PUBLIC_KEY: 'TEST-6c5eb3a1-e6be-46ef-a350-afa2bf222252',
  
  // Configuración del SDK
  SDK_CONFIG: {
    locale: 'es-CO',
    advancedFraudPrevention: false
  },
  
  // URLs de retorno
  BACK_URLS: {
    success: `${window.location.origin}/payment-success`,
    failure: `${window.location.origin}/payment-failure`,
    pending: `${window.location.origin}/payment-pending`
  }
};

// Función para inicializar el SDK de Mercado Pago
export const initMercadoPago = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Verificar si ya está cargado
    if ((window as any).MercadoPago) {
      console.log('✅ SDK de Mercado Pago ya cargado');
      resolve();
      return;
    }

    // Cargar SDK dinámicamente
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.onload = () => {
      console.log('✅ SDK de Mercado Pago cargado exitosamente');
      resolve();
    };
    script.onerror = () => {
      console.error('❌ Error cargando SDK de Mercado Pago');
      reject(new Error('No se pudo cargar el SDK de Mercado Pago'));
    };
    document.body.appendChild(script);
  });
};

// Función para crear instancia de Mercado Pago
export const createMercadoPagoInstance = () => {
  if (!(window as any).MercadoPago) {
    throw new Error('SDK de Mercado Pago no está cargado');
  }

  return new (window as any).MercadoPago(
    MERCADOPAGO_CONFIG.PUBLIC_KEY,
    MERCADOPAGO_CONFIG.SDK_CONFIG
  );
};

// Función para validar configuración
export const validateMercadoPagoConfig = () => {
  const config = MERCADOPAGO_CONFIG;
  
  if (!config.PUBLIC_KEY) {
    throw new Error('Public Key de Mercado Pago no configurada');
  }
  
  if (!config.PUBLIC_KEY.startsWith('TEST-') && !config.PUBLIC_KEY.startsWith('APP-')) {
    console.warn('⚠️  Public Key no parece ser válida. Debe empezar con TEST- o APP-');
  }
  
  console.log('✅ Configuración de Mercado Pago válida');
  console.log('   Public Key:', config.PUBLIC_KEY.substring(0, 20) + '...');
  console.log('   Entorno:', config.PUBLIC_KEY.startsWith('TEST-') ? 'PRUEBAS' : 'PRODUCCIÓN');
  
  return true;
};

export default MERCADOPAGO_CONFIG; 