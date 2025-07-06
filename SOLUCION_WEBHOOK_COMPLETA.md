# Solución Completa: Webhook de Mercado Pago

## 🔍 **Problema Identificado**

1. **Error 401**: `Authorization: Bearer undefined` - Variable de entorno incorrecta
2. **Error 502**: ngrok configurado para puerto 3001 pero backend en puerto 5000
3. **Falta validación**: No se validaba la configuración del access token

## 🛠️ **Solución Implementada**

### **1. Configuración de ngrok**
```bash
# Detener ngrok anterior (Ctrl+C)
# Ejecutar con puerto correcto
ngrok http 5000
```

**URL pública actual:**
```
https://e6c7-190-24-30-135.ngrok-free.app
```

### **2. Configuración del Webhook en Mercado Pago**

**URL del webhook:**
```
https://e6c7-190-24-30-135.ngrok-free.app/api/payment/webhook/mercadopago
```

**Clave secreta:**
```
59e47f91f713216ea4aebf571ac7bb5ad308513bc7991a141d1815f014505efe
```

### **3. Variables de Entorno**

Asegúrate de tener en tu archivo `.env`:
```env
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxxxxxxxxxxxxxxxxx
```

### **4. Controlador Mejorado**

El controlador ahora incluye:
- ✅ **Validación del access token**
- ✅ **Logs detallados** para depuración
- ✅ **Manejo de errores** específicos
- ✅ **Información completa** del pago

## 🧪 **Cómo Probar**

### **Paso 1: Verificar Configuración**
```bash
cd server
node test-webhook-config.js
```

### **Paso 2: Probar Endpoint Manualmente**
```bash
curl -X POST https://e6c7-190-24-30-135.ngrok-free.app/api/payment/webhook/mercadopago \
  -H "Content-Type: application/json" \
  -d '{
    "action": "payment.updated",
    "api_version": "v1",
    "data": {"id":"123456"},
    "date_created": "2021-11-01T02:02:02Z",
    "id": "123456",
    "live_mode": false,
    "type": "payment",
    "user_id": 2531494471
  }'
```

### **Paso 3: Probar desde Mercado Pago**
1. Ve al panel de Mercado Pago
2. Configura la URL del webhook
3. Haz la prueba de simulación
4. Verifica los logs en tu backend

## 📊 **Logs Esperados**

### **Webhook Recibido:**
```
🔔 Webhook Mercado Pago recibido: { action: 'payment.updated', ... }
📋 Datos del webhook:
  - Payment ID: 123456
  - Topic: payment
  - Access Token: TEST-3997869409987...
🔍 Consultando pago en Mercado Pago: https://api.mercadopago.com/v1/payments/123456
💳 Estado del pago consultado: approved
💰 Información del pago: { id: 123456, status: 'approved', ... }
✅ Webhook procesado correctamente
```

### **En ngrok:**
```
Connections                   ttl     opn     rt1     rt5     p50     p90
1                            1       0       0.00    0.00    0.00    0.00
```

## 🔧 **Archivos Modificados**

1. **`server/controllers/paymentController.js`**
   - Corregida variable `MERCADOPAGO_ACCESS_TOKEN`
   - Agregada validación del token
   - Mejorados los logs de depuración

2. **`server/routes/paymentRoutes.js`**
   - Agregada ruta `/webhook/mercadopago`

3. **`server/test-webhook-config.js`** (nuevo)
   - Script para verificar configuración

## ✅ **Verificación Final**

1. ✅ **Backend corriendo** en puerto 5000
2. ✅ **ngrok configurado** para puerto 5000
3. ✅ **URL del webhook** configurada en Mercado Pago
4. ✅ **Access token** configurado correctamente
5. ✅ **Endpoint respondiendo** correctamente
6. ✅ **Logs funcionando** para depuración

## 🚀 **Próximos Pasos**

Una vez que el webhook funcione correctamente:

1. **Actualizar base de datos** según el estado del pago
2. **Enviar notificaciones** al usuario
3. **Actualizar inventario** si es necesario
4. **Registrar transacciones** en logs

¡El webhook ahora debería funcionar perfectamente! 