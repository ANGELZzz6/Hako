# Configuración de Mercado Pago - Checkout Pro

## Tokens de Acceso

### 🔴 Token de Producción (Vendedor)
```
APP_USR-7141205000973179-070320-5e2fcea86869ce7063884eb151f62d92-2531494471
```

### 🟡 Token de Pruebas (Opcional)
```
TEST-3997869409987199-070320-5f0b936cb84305d1e5215b576d609165-544117534
```

## Configuración del Servidor

### Variables de Entorno (.env)
```env
# Token de acceso del vendedor (producción)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-7141205000973179-070320-5e2fcea86869ce7063884eb151f62d92-2531494471

# URL del frontend
FRONTEND_URL=http://localhost:5173

# Configuración de la base de datos
MONGODB_URI=mongodb://localhost:27017/hako

# Configuración del servidor
PORT=5000
NODE_ENV=development
```

## Cuentas de Prueba

### Para Probar Pagos

#### Tarjetas de Crédito
- **Visa**: 4509 9535 6623 3704
- **Mastercard**: 5031 4332 1540 6351
- **American Express**: 3711 8030 3257 522

#### Datos de Prueba
- **CVV**: 123
- **Fecha de vencimiento**: 11/25
- **Nombre**: APRO (para pagos aprobados)
- **Nombre**: OTHE (para otros errores)
- **Nombre**: CONT (para pagos pendientes)
- **Nombre**: CALL (para pagos rechazados)
- **Nombre**: FUND (para fondos insuficientes)
- **Nombre**: SECU (para código de seguridad inválido)
- **Nombre**: EXPI (para tarjeta vencida)
- **Nombre**: FORM (para errores de formulario)

#### PSE (Pagos Seguros en Línea)
- **Tipo de persona**: Natural
- **Tipo de documento**: CC
- **Número de documento**: 12345678
- **Banco**: Cualquier banco disponible

## Configuración de Webhooks

### URL de Webhook
```
https://tu-dominio.com/api/payment/webhook
```

### Eventos que se procesan
- `payment.created` - Pago creado
- `payment.updated` - Pago actualizado
- `payment.pending` - Pago pendiente
- `payment.approved` - Pago aprobado
- `payment.rejected` - Pago rechazado

## URLs de Retorno

### Desarrollo
- **Success**: `http://localhost:5173/payment-result`
- **Failure**: `http://localhost:5173/payment-result`
- **Pending**: `http://localhost:5173/payment-result`

### Producción
- **Success**: `https://tu-dominio.com/payment-result`
- **Failure**: `https://tu-dominio.com/payment-result`
- **Pending**: `https://tu-dominio.com/payment-result`

## Pruebas

### Endpoint de Prueba
```
GET http://localhost:5000/api/payment/test-config
```

### Crear Preferencia de Prueba
```
POST http://localhost:5000/api/payment/create_preference
{
  "items": [
    {
      "title": "Producto de prueba",
      "unit_price": 1000,
      "quantity": 1
    }
  ],
  "payer": {
    "email": "test@test.com",
    "name": "Usuario Test",
    "identification": {
      "type": "CC",
      "number": "12345678"
    }
  }
}
```

## Notas Importantes

1. **Token de Producción**: El token que proporcionaste es de producción, por lo que los pagos serán reales
2. **PSE en Producción**: Funcionará con bancos reales de Colombia
3. **Webhooks**: Necesitas configurar una URL pública para recibir notificaciones
4. **SSL**: En producción, necesitas HTTPS para los webhooks

## Seguridad

- ✅ **Nunca compartas** el token de acceso
- ✅ **Usa variables de entorno** para el token
- ✅ **Configura webhooks** para notificaciones seguras
- ✅ **Valida las respuestas** de Mercado Pago 