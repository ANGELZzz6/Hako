# 🔧 Configurar Access Token de Mercado Pago

## ⚠️ PROBLEMA ACTUAL
El error `"Invalid users involved"` (código 2034) indica que el Access Token no es válido o ha expirado.

## 🛠️ SOLUCIÓN PASO A PASO

### Paso 1: Obtener Nuevo Access Token

1. **Ve a Mercado Pago Developers**: https://www.mercadopago.com/developers/panel
2. **Inicia sesión** con tu cuenta de Mercado Pago
3. **Ve a "Credenciales"** → "Credenciales de prueba"
4. **Copia el Access Token** (debe empezar con `TEST-`)

### Paso 2: Configurar el Token

**Opción A: Usar Variable de Entorno (Recomendado)**

1. Crea un archivo `.env` en la carpeta `server/`:
```bash
# server/.env
MERCADOPAGO_ACCESS_TOKEN=TEST-tu-token-aqui
```

2. Reemplaza `TEST-tu-token-aqui` con tu token real

**Opción B: Modificar Directamente el Archivo**

Edita `server/config/mercadopago.js`:
```javascript
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'TU-TOKEN-AQUI';
```

### Paso 3: Reiniciar el Servidor

```bash
cd server
npm run dev
```

### Paso 4: Verificar Configuración

El servidor mostrará en la consola:
- ✅ `Configuración válida - Preferencia de prueba creada: [ID]`
- ❌ Si hay error, mostrará instrucciones específicas

## 🧪 Tarjetas de Prueba

Una vez configurado, usa estas tarjetas:

### Tarjetas que Funcionan:
- **Visa**: `4509 9535 6623 3704` → Pago Aprobado
- **Mastercard**: `5031 4332 1540 6351` → Pago Aprobado

### Tarjetas que Fallan:
- **Visa**: `4000 0000 0000 0002` → Error General (OTHE)
- **Mastercard**: `5031 1111 1111 6351` → Fondos Insuficientes (FUND)
- **Visa**: `4000 0000 0000 0069` → CVV Inválido (SECU)

## 📋 Datos de Prueba
- **CVV**: Cualquier número de 3-4 dígitos
- **Fecha**: Cualquier fecha futura
- **Nombre**: Cualquier nombre
- **Email**: Cualquier email válido

## 🔍 Verificar que Funciona

1. Ve al carrito y agrega productos
2. Ve al checkout
3. Usa la tarjeta `4000 0000 0000 0002`
4. Deberías ver: "Pago Rechazado por un error general"

## ❗ Si el Problema Persiste

1. **Verifica que el token empiece con `TEST-`**
2. **Asegúrate de que sea de "Credenciales de prueba"**
3. **No uses credenciales de producción**
4. **Reinicia el servidor después de cambiar el token** 