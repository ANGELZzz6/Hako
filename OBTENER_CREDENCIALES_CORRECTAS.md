# Guía: Obtener Credenciales Correctas de Mercado Pago

## 🔍 Problema Identificado

El error 401 Unauthorized ocurre porque estás usando un **Access Token** como **Public Key** en el frontend.

### ❌ **Error Actual**
```
APP_USR-7141205000973179-070320-5e2fcea86869ce7063884eb151f62d92-2531494471
```
Este es un **Access Token** (empieza con `APP_USR-`)

### ✅ **Lo que Necesitas**
```
TEST-6c5eb3a1-e6be-46ef-a350-afa2bf222252
```
Esto es una **Public Key** (empieza con `TEST-`)

## 🔑 Tipos de Credenciales

### **1. Access Token (Backend)**
- **Formato**: `APP_USR-XXXXX-XXXXX-XXXXX-XXXXX`
- **Uso**: Solo en el servidor/backend
- **Ubicación**: `server/.env`
- **Ejemplo**: `APP_USR-7141205000973179-070320-5e2fcea86869ce7063884eb151f62d92-2531494471`

### **2. Public Key (Frontend)**
- **Formato**: `TEST-XXXXX-XXXXX-XXXXX-XXXXX` o `APP-XXXXX-XXXXX-XXXXX-XXXXX`
- **Uso**: Solo en el cliente/frontend
- **Ubicación**: `client/src/config/mercadopago.ts`
- **Ejemplo**: `TEST-6c5eb3a1-e6be-46ef-a350-afa2bf222252`

## 🚀 Cómo Obtener las Credenciales Correctas

### **Paso 1: Ir al Panel de Desarrollador**
1. Ve a [Mercado Pago Developers](https://www.mercadopago.com.co/developers/panel)
2. Inicia sesión con tu cuenta
3. Selecciona tu aplicación

### **Paso 2: Obtener Access Token (Backend)**
1. Ve a **"Credenciales"**
2. Busca **"Credenciales de producción"** o **"Credenciales de prueba"**
3. Copia el **Access Token** (empieza con `APP_USR-`)
4. Pégalo en `server/.env`:
   ```env
   MERCADOPAGO_ACCESS_TOKEN=APP_USR-TU-ACCESS-TOKEN-AQUI
   ```

### **Paso 3: Obtener Public Key (Frontend)**
1. En la misma sección de **"Credenciales"**
2. Busca **"Public Key"** (empieza con `TEST-` o `APP-`)
3. Copia la **Public Key**
4. Pégalo en `client/src/config/mercadopago.ts`:
   ```typescript
   export const MERCADOPAGO_CONFIG = {
     PUBLIC_KEY: 'TEST-TU-PUBLIC-KEY-AQUI',
     // ...
   };
   ```

## 📋 Configuración Completa

### **Backend (server/.env)**
```env
# Access Token para el servidor
MERCADOPAGO_ACCESS_TOKEN=APP_USR-7141205000973179-070320-5e2fcea86869ce7063884eb151f62d92-2531494471

# URL del frontend
FRONTEND_URL=http://localhost:5173
```

### **Frontend (client/src/config/mercadopago.ts)**
```typescript
export const MERCADOPAGO_CONFIG = {
  // Public Key para el cliente
  PUBLIC_KEY: 'TEST-6c5eb3a1-e6be-46ef-a350-afa2bf222252',
  
  // Configuración del SDK
  SDK_CONFIG: {
    locale: 'es-CO',
    advancedFraudPrevention: false
  },
  // ...
};
```

## 🧪 Verificar Configuración

### **Script de Verificación**
```bash
# Ejecuta este script para verificar que todo esté correcto
node test-mp-accounts.js
```

### **Verificación Manual**
1. **Backend**: Verifica que el Access Token sea válido
2. **Frontend**: Verifica que la Public Key empiece con `TEST-` o `APP-`
3. **Navegador**: Abre la consola y ejecuta `runSDKTest()`

## ⚠️ Puntos Importantes

### **1. Nunca Mezcles Credenciales**
- ❌ **NO uses Access Token en el frontend**
- ❌ **NO uses Public Key en el backend**
- ✅ **Access Token solo en servidor**
- ✅ **Public Key solo en cliente**

### **2. Entornos**
- **Desarrollo**: Usa credenciales de prueba (`TEST-`)
- **Producción**: Usa credenciales reales (`APP-`)

### **3. Seguridad**
- **Access Token**: Mantenlo seguro, nunca lo expongas
- **Public Key**: Es segura de usar en el frontend

## 🔧 Solución Rápida

Si quieres usar las credenciales que ya tienes:

1. **Verifica que tengas ambas credenciales**:
   - Access Token para el backend
   - Public Key para el frontend

2. **Actualiza los archivos**:
   - `server/.env` con el Access Token
   - `client/src/config/mercadopago.ts` con la Public Key

3. **Reinicia los servicios**:
   ```bash
   # Backend
   cd server && npm start
   
   # Frontend
   cd client && npm run dev
   ```

4. **Prueba el flujo**:
   - Agrega productos al carrito
   - Ve al checkout
   - Verifica que no haya errores 401

## ✅ Resultado Esperado

Después de corregir las credenciales:

- ✅ **No más errores 401 Unauthorized**
- ✅ **SDK de Mercado Pago funcionando**
- ✅ **Checkout Pro disponible**
- ✅ **Métodos de pago cargando correctamente**

## 📞 Si Sigues Teniendo Problemas

1. **Verifica que tengas ambas credenciales**
2. **Asegúrate de que sean del mismo entorno** (prueba o producción)
3. **Revisa que las credenciales no hayan expirado**
4. **Ejecuta los scripts de prueba para diagnosticar** 