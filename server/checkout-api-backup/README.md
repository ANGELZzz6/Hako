# Checkout API - Archivos de Respaldo

Esta carpeta contiene todos los archivos relacionados con la implementación de Checkout API de Mercado Pago que fueron reemplazados por Checkout Pro.

## Archivos incluidos:

### Controladores
- `paymentController-checkout-api.js` - Controlador principal con todas las funciones de Checkout API
- `paymentRoutes-checkout-api.js` - Rutas específicas para Checkout API

### Archivos de prueba
- `test-pse-availability.js` - Prueba de disponibilidad de PSE
- `test-pse-banks.js` - Prueba de bancos PSE
- `test-pse-endpoint.js` - Prueba de endpoints PSE
- `test-pse-preference.js` - Prueba de preferencias PSE
- `test-available-payment-methods.js` - Prueba de métodos de pago disponibles
- `test-mercadopago-config.js` - Prueba de configuración de Mercado Pago

## Funciones incluidas:

### Checkout API
- `createPSEPreference` - Crear preferencias PSE
- `createSimplePSEPreference` - Preferencias PSE simples
- `createForcedPSEPreference` - Preferencias PSE forzadas
- `processPayment` - Procesar pagos con tarjetas
- `getPaymentStatus` - Obtener estado de pagos
- `testPSEConfig` - Probar configuración PSE
- `testPSEAvailability` - Probar disponibilidad PSE
- `checkAvailablePaymentMethods` - Verificar métodos disponibles

### Rutas
- `/create_pse_preference` - Crear preferencia PSE
- `/create_simple_pse_preference` - Crear preferencia PSE simple
- `/create_forced_pse_preference` - Crear preferencia PSE forzada
- `/process_payment` - Procesar pago
- `/test-pse-config` - Probar configuración PSE
- `/test-pse-availability` - Probar disponibilidad PSE
- `/check_payment_methods` - Verificar métodos disponibles

## Nota:
Estos archivos se mantienen como respaldo en caso de que necesites volver a Checkout API en el futuro. La nueva implementación usa Checkout Pro que es más simple y confiable. 