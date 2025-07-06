# Checkout API Frontend - Archivos de Respaldo

Esta carpeta contiene todos los archivos del frontend relacionados con la implementación de Checkout API de Mercado Pago que fueron reemplazados por Checkout Pro.

## Archivos incluidos:

### Componentes
- `PSEPaymentForm.tsx` - Formulario específico para pagos PSE
- `PSEPaymentForm.css` - Estilos del formulario PSE

### Páginas
- `CheckoutPage-checkout-api.tsx` - Página de checkout con Checkout API
- `PaymentTestPage.tsx` - Página de pruebas de pagos

### Servicios
- `paymentService-checkout-api.ts` - Servicio de pagos con Checkout API

## Funcionalidades incluidas:

### Checkout API
- **Formularios de pago integrados** - Tarjetas, PSE, Efecty
- **SDK de Mercado Pago** - Carga y manejo del SDK
- **Procesamiento de pagos** - Manejo de tokens y respuestas
- **Formulario PSE personalizado** - Campos específicos para PSE
- **Página de pruebas** - Para probar diferentes métodos de pago

### Componentes específicos
- **PSEPaymentForm** - Formulario completo para PSE con validaciones
- **CheckoutPage** - Página principal con selección de métodos de pago
- **PaymentTestPage** - Página para probar configuraciones

### Servicios
- **paymentService** - Funciones para crear preferencias y procesar pagos
- **Manejo de SDK** - Carga y limpieza del SDK de Mercado Pago
- **Integración con backend** - Comunicación con las APIs del servidor

## Nota:
Estos archivos se mantienen como respaldo en caso de que necesites volver a Checkout API en el futuro. La nueva implementación usa Checkout Pro que es más simple y confiable. 