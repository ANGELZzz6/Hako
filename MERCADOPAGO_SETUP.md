# Configuración de Mercado Pago - Hako

## 🔧 Configuración Inicial

### 1. Crear cuenta en Mercado Pago Developers
1. Ve a [Mercado Pago Developers](https://www.mercadopago.com/developers)
2. Inicia sesión con tu cuenta de Mercado Pago
3. Ve a "Tus integraciones" → "Credenciales"

### 2. Obtener Access Token de Prueba
1. En la sección "Credenciales de prueba"
2. Copia el "Access Token" (debe empezar con `TEST-`)
3. Ejemplo: `TEST-3997869409987199-070320-5f0b936cb84305d1e5215b576d609165-544117534`

### 3. Configurar en el proyecto
**Opción A: Usar archivo .env**
```bash
# Crear archivo .env en la raíz del proyecto
MERCADOPAGO_ACCESS_TOKEN=TEST-tu-token-aqui
```

**Opción B: Modificar directamente**
Editar `server/config/mercadopago.js`:
```javascript
const mp = new MercadoPagoConfig({
  accessToken: 'TEST-tu-token-aqui'
});
```

## 🧪 Tarjetas de Prueba

### Tarjetas que funcionan (aprobadas):
- **Visa:** 4509 9535 6623 3704
- **Mastercard:** 5031 4332 1540 6351
- **American Express:** 3711 8030 3257 522

### Tarjetas que fallan (rechazadas):
- **Visa:** 4000 0000 0000 0002
- **Mastercard:** 5031 1111 1111 6351

### Datos de prueba:
- **CVV:** Cualquier número de 3-4 dígitos
- **Fecha:** Cualquier fecha futura
- **Nombre:** Cualquier nombre

## 🔍 Verificar Configuración

### 1. Reiniciar servidor
```bash
cd server
npm run dev
```

### 2. Probar configuración
Visitar: `http://localhost:5000/api/payment/test-config`

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Configuración de Mercado Pago correcta",
  "accessToken": "Válido para pruebas",
  "preferenceId": "123456789-abc123",
  "initPoint": "https://www.mercadopago.com/checkout/v1/redirect?pref_id=..."
}
```

**Respuesta con error:**
```json
{
  "success": false,
  "error": "Error en la configuración de Mercado Pago",
  "details": "Invalid users involved",
  "suggestion": "Verifica tu access token..."
}
```

## 🚨 Solución de Problemas

### Error: "Invalid users involved"
- **Causa:** Access token no válido o expirado
- **Solución:** Generar nuevo access token en Mercado Pago Developers

### Error: "404 Not Found"
- **Causa:** Servidor no corriendo o rutas no configuradas
- **Solución:** Verificar que el servidor esté corriendo en puerto 5000

### Error: "500 Internal Server Error"
- **Causa:** Error en la configuración o datos inválidos
- **Solución:** Revisar logs del servidor y verificar access token

## 📝 Notas Importantes

1. **NO usar webhooks en desarrollo local** - Mercado Pago no puede enviar notificaciones a localhost
2. **Solo usar access tokens de prueba** - Los tokens de producción no funcionan en desarrollo
3. **Verificar que el token empiece con TEST-** - Indica que es para pruebas
4. **Los pagos de prueba no generan dinero real** - Son simulaciones

## 🔗 Enlaces Útiles

- [Mercado Pago Developers](https://www.mercadopago.com/developers)
- [Documentación de la API](https://www.mercadopago.com/developers/es/docs)
- [Panel de Credenciales](https://www.mercadopago.com/developers/panel/credentials) 