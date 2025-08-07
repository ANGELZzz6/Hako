# 📚 Documentación Completa del Proyecto Hako

## 🎯 Índice

1. [Configuración de Mercado Pago](#configuración-de-mercado-pago)
2. [Implementación de Pagos](#implementación-de-pagos)
3. [Solución de Problemas](#solución-de-problemas)
4. [Configuración de Cuentas de Prueba](#configuración-de-cuentas-de-prueba)
5. [Webhooks y Notificaciones](#webhooks-y-notificaciones)
6. [Redirecciones y UX](#redirecciones-y-ux)
7. [Gestión de Productos y Variantes](#gestión-de-productos-y-variantes)
8. [Carrito y Checkout](#carrito-y-checkout)
9. [Visualización 3D](#visualización-3d)
10. [Scripts y Herramientas](#scripts-y-herramientas)

---

## 🔧 Configuración de Mercado Pago

### Tokens de Acceso

#### 🔴 Token de Producción (Vendedor)
```
APP_USR-7141205000973179-070320-5e2fcea86869ce7063884eb151f62d92-2531494471
```

#### 🟡 Token de Pruebas (Opcional)
```
TEST-3997869409987199-070320-5f0b936cb84305d1e5215b576d609165-544117534
```

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

### Tipos de Credenciales

#### **1. Access Token (Backend)**
- **Formato**: `APP_USR-XXXXX-XXXXX-XXXXX-XXXXX`
- **Uso**: Solo en el servidor/backend
- **Ubicación**: `server/.env`
- **Ejemplo**: `APP_USR-7141205000973179-070320-5e2fcea86869ce7063884eb151f62d92-2531494471`

#### **2. Public Key (Frontend)**
- **Formato**: `TEST-XXXXX-XXXXX-XXXXX-XXXXX` o `APP-XXXXX-XXXXX-XXXXX-XXXXX`
- **Uso**: Solo en el cliente/frontend
- **Ubicación**: `client/src/config/mercadopago.ts`
- **Ejemplo**: `TEST-6c5eb3a1-e6be-46ef-a350-afa2bf222252`

### Cómo Obtener las Credenciales Correctas

#### **Paso 1: Ir al Panel de Desarrollador**
1. Ve a [Mercado Pago Developers](https://www.mercadopago.com.co/developers/panel)
2. Inicia sesión con tu cuenta
3. Selecciona tu aplicación

#### **Paso 2: Obtener Access Token (Backend)**
1. Ve a **"Credenciales"**
2. Busca **"Credenciales de producción"** o **"Credenciales de prueba"**
3. Copia el **Access Token** (empieza con `APP_USR-`)
4. Pégalo en `server/.env`:
   ```env
   MERCADOPAGO_ACCESS_TOKEN=APP_USR-TU-ACCESS-TOKEN-AQUI
   ```

#### **Paso 3: Obtener Public Key (Frontend)**
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

---

## 💳 Implementación de Pagos

### Checkout Pro - Nueva Implementación

Se ha migrado exitosamente de **Checkout API** a **Checkout Pro** de Mercado Pago para simplificar la implementación y mejorar la confiabilidad del sistema de pagos.

#### Ventajas de Checkout Pro

##### ✅ Simplicidad
- **Menos código** - No necesitas manejar formularios complejos
- **Menos errores** - Mercado Pago maneja toda la UI
- **Mantenimiento fácil** - Menos código que mantener

##### ✅ Confiabilidad
- **PSE funciona mejor** - Optimizado para métodos como PSE
- **Métodos automáticos** - Mercado Pago decide qué mostrar
- **Responsive automático** - Se adapta a móviles

##### ✅ Experiencia de Usuario
- **Interfaz familiar** - Los usuarios conocen Mercado Pago
- **Métodos disponibles** - Todos los métodos de pago de Colombia
- **Seguridad** - Procesamiento seguro en servidores de MP

#### Flujo de Pago

1. **Usuario selecciona productos** → Carrito
2. **Usuario va a checkout** → Resumen de compra
3. **Usuario hace clic en "Proceder al Pago"** → Se crea preferencia
4. **Usuario es redirigido** → Página de Mercado Pago
5. **Usuario selecciona método** → PSE, tarjetas, efectivo, etc.
6. **Usuario completa pago** → Procesamiento por Mercado Pago
7. **Usuario regresa** → Página de resultado

#### Métodos de Pago Disponibles

Con Checkout Pro, Mercado Pago automáticamente muestra todos los métodos disponibles para Colombia:

- ✅ **PSE** - Pagos Seguros en Línea
- ✅ **Tarjetas de Crédito/Débito** - Visa, Mastercard, etc.
- ✅ **Efectivo** - Efecty, Baloto, etc.
- ✅ **Transferencias** - Bancolombia, Daviplata, etc.

---

## 🔧 Solución de Problemas

### Error: "Una de las partes con la que intentas hacer el pago es de prueba"

**Causa**: Mezcla de cuentas reales y de prueba

**Solución**:
1. Verifica que uses credenciales de prueba (`TEST-`)
2. Usa solo cuentas de prueba para pagar
3. No uses tu cuenta real de Mercado Pago

### Error: "Access Token inválido"

**Causa**: Token expirado o incorrecto

**Solución**:
1. Genera un nuevo token de prueba
2. Actualiza la variable de entorno
3. Reinicia el servidor

### Error: "No se pueden procesar pagos"

**Causa**: Configuración incorrecta

**Solución**:
1. Verifica que ambas cuentas sean del mismo país
2. Asegúrate de que la cuenta comprador tenga saldo
3. Usa métodos de pago válidos para Colombia

### Error PSE: "internal_error" (500)

**Causa**: Mercado Pago requiere URLs de callback y notification para PSE

**Solución Implementada**: Se han agregado las URLs requeridas:
- `callback_url: 'https://httpbin.org/status/200'` (URL pública para desarrollo)
- `notification_url: 'https://webhook.site/your-unique-url'` (Obligatoria según documentación oficial)

#### Requisitos Específicos de PSE

##### Montos Permitidos
- **Mínimo**: $1,600 pesos colombianos
- **Máximo**: $340,000,000 pesos colombianos

##### Campos Obligatorios
- `payer.address.zip_code` (exactamente 5 posiciones)
- `payer.address.street_name` (1-18 posiciones)
- `payer.address.street_number` (1-5 posiciones)
- `payer.address.neighborhood` (1-18 posiciones)
- `payer.address.city` (1-18 posiciones)
- `payer.phone.area_code` (exactamente 3 posiciones)
- `payer.phone.number` (1-7 posiciones, solo números)
- `payer.first_name` (1-32 posiciones)
- `payer.last_name` (1-32 posiciones)
- `payer.identification.number` (1-15 posiciones, numérico excepto pasaporte)

---

## 🧪 Configuración de Cuentas de Prueba

### Paso 1: Crear Cuentas de Prueba

#### 1.1 Ir al Panel de Desarrollador
1. Ve a [Mercado Pago Developers](https://www.mercadopago.com.co/developers/panel)
2. Inicia sesión con tu cuenta principal de Mercado Pago
3. Ve a tu aplicación

#### 1.2 Crear Cuenta Vendedor de Prueba
1. Busca la sección "Cuentas de prueba"
2. Haz clic en "+ Crear cuenta de prueba"
3. Configuración:
   - **Descripción**: "Vendedor Prueba"
   - **País**: Colombia
   - **Saldo**: $0 (no es necesario para vendedor)
4. Guarda el usuario y contraseña generados

#### 1.3 Crear Cuenta Comprador de Prueba
1. Haz clic en "+ Crear cuenta de prueba" nuevamente
2. Configuración:
   - **Descripción**: "Comprador Prueba"
   - **País**: Colombia (debe ser el mismo que el vendedor)
   - **Saldo**: $1,000,000 (mayor al valor de tus productos)
4. Guarda el usuario y contraseña generados

### Paso 2: Obtener Credenciales de Prueba

#### 2.1 Abrir Ventana de Incógnito
1. Abre una ventana de incógnito en tu navegador
2. Ve a [Mercado Pago Developers](https://www.mercadopago.com.co/developers/panel)

#### 2.2 Iniciar Sesión con Cuenta Vendedor
1. **Inicia sesión con tu cuenta de prueba vendedor** (no tu cuenta principal)
2. Usa las credenciales que guardaste en el Paso 1.2

#### 2.3 Crear Aplicación de Prueba
1. Haz clic en "Crear aplicación"
2. Sigue los pasos para crear una aplicación de prueba
3. Una vez creada, ve a "Credenciales"
4. **Copia las credenciales de prueba** (deben empezar con `TEST-`)

### Paso 3: Configurar Credenciales en el Proyecto

#### 3.1 Actualizar Variables de Entorno
Crea o actualiza el archivo `.env` en la carpeta `server`:

```env
MERCADOPAGO_ACCESS_TOKEN=TEST-TU-TOKEN-DE-PRUEBA-AQUI
FRONTEND_URL=http://localhost:5173
```

### Paso 4: Probar el Pago

#### 4.1 Usar Cuenta Comprador de Prueba
1. Inicia tu aplicación
2. Agrega productos al carrito
3. Ve al checkout
4. Cuando seas redirigido a Mercado Pago:
   - **NO uses tu cuenta real**
   - **Inicia sesión con tu cuenta de prueba comprador**
   - Usa las credenciales del Paso 1.3

#### 4.2 Métodos de Pago de Prueba

##### Tarjetas de Prueba
- **Visa**: 4509 9535 6623 3704
- **Mastercard**: 5031 4332 1540 6351
- **American Express**: 3711 8030 3257 522
- **CVV**: 123
- **Fecha**: Cualquier fecha futura
- **Nombre**: Cualquier nombre

##### PSE de Prueba
- **Banco**: Cualquier banco disponible
- **Tipo de documento**: CC
- **Número de documento**: 12345678
- **Nombre**: Cualquier nombre

##### Efectivo de Prueba
- **Efecty**: Usar cualquier código de referencia

### Datos de Prueba para Tarjetas

#### Tarjetas que Funcionan (aprobadas):
- **Visa:** 4509 9535 6623 3704
- **Mastercard:** 5031 4332 1540 6351
- **American Express:** 3711 8030 3257 522

#### Tarjetas que Fallan (rechazadas):
- **Visa:** 4000 0000 0000 0002
- **Mastercard:** 5031 1111 1111 6351

#### Datos de prueba:
- **CVV:** Cualquier número de 3-4 dígitos
- **Fecha:** Cualquier fecha futura
- **Nombre:** Cualquier nombre

---

## 🔔 Webhooks y Notificaciones

### Configuración de Webhooks

#### URL de Webhook
```
https://tu-dominio.com/api/payment/webhook
```

#### Eventos que se procesan
- `payment.created` - Pago creado
- `payment.updated` - Pago actualizado
- `payment.pending` - Pago pendiente
- `payment.approved` - Pago aprobado
- `payment.rejected` - Pago rechazado

### URLs de Retorno

#### Desarrollo
- **Success**: `http://localhost:5173/payment-result`
- **Failure**: `http://localhost:5173/payment-result`
- **Pending**: `http://localhost:5173/payment-result`

#### Producción
- **Success**: `https://tu-dominio.com/payment-result`
- **Failure**: `https://tu-dominio.com/payment-result`
- **Pending**: `https://tu-dominio.com/payment-result`

### Solución Completa: Webhook de Mercado Pago

#### 🔍 **Problema Identificado**

1. **Error 401**: `Authorization: Bearer undefined` - Variable de entorno incorrecta
2. **Error 502**: ngrok configurado para puerto 3001 pero backend en puerto 5000
3. **Falta validación**: No se validaba la configuración del access token

#### 🛠️ **Solución Implementada**

##### **1. Configuración de ngrok**
```bash
# Detener ngrok anterior (Ctrl+C)
# Ejecutar con puerto correcto
ngrok http 5000
```

**URL pública actual:**
```
https://e6c7-190-24-30-135.ngrok-free.app
```

##### **2. Configuración del Webhook en Mercado Pago**

**URL del webhook:**
```
https://e6c7-190-24-30-135.ngrok-free.app/api/payment/webhook/mercadopago
```

**Clave secreta:**
```
59e47f91f713216ea4aebf571ac7bb5ad308513bc7991a141d1815f014505efe
```

##### **3. Variables de Entorno**

Asegúrate de tener en tu archivo `.env`:
```env
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxxxxxxxxxxxxxxxxx
```

##### **4. Controlador Mejorado**

El controlador ahora incluye:
- ✅ **Validación del access token**
- ✅ **Logs detallados** para depuración
- ✅ **Manejo de errores** específicos
- ✅ **Información completa** del pago

#### 🧪 **Cómo Probar**

##### **Paso 1: Verificar Configuración**
```bash
cd server
node test-webhook-config.js
```

##### **Paso 2: Probar Endpoint Manualmente**
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

##### **Paso 3: Probar desde Mercado Pago**
1. Ve al panel de Mercado Pago
2. Configura la URL del webhook
3. Haz la prueba de simulación
4. Verifica los logs en tu backend

#### 📊 **Logs Esperados**

##### **Webhook Recibido:**
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

---

## 🔄 Redirecciones y UX

### Solución: Redirección Automática Después del Pago

#### 🔍 **Problema Identificado**

El usuario se quedaba en la página de Mercado Pago después del pago exitoso en lugar de regresar automáticamente a la aplicación.

#### 🛠️ **Solución Implementada**

##### **1. Corrección de URLs de Redirección**

**Problema:** Las URLs de redirección estaban apuntando a páginas separadas (`/payment-success`, `/payment-failure`, `/payment-pending`) que no estaban manejando correctamente los parámetros de Mercado Pago.

**Solución:** Unificar todas las URLs de redirección para que apunten a `/payment-result`, que es la página que maneja todos los estados de pago, y agregar `auto_return: 'approved'` para redirección automática.

```javascript
// ANTES (problemático)
back_urls: {
  success: 'http://localhost:5173/payment-success',
  failure: 'http://localhost:5173/payment-failure',
  pending: 'http://localhost:5173/payment-pending'
}

// DESPUÉS (corregido)
back_urls: {
  success: 'http://localhost:5173/payment-result',
  failure: 'http://localhost:5173/payment-result',
  pending: 'http://localhost:5173/payment-result'
},
auto_return: 'approved'
```

##### **2. Configuración de Redirección Automática**

**Problema:** Faltaba el atributo `auto_return` que es esencial para que Mercado Pago redirija automáticamente al usuario.

**Solución:** Agregar `auto_return: 'approved'` a la preferencia de pago.

```javascript
// Configuración completa de redirección
back_urls: {
  success: 'http://localhost:5173/payment-result',
  failure: 'http://localhost:5173/payment-result',
  pending: 'http://localhost:5173/payment-result'
},
auto_return: 'approved'  // ← Esto es crucial para redirección automática
```

**¿Qué hace `auto_return: 'approved'`?**
- Redirige automáticamente al usuario cuando el pago es aprobado
- Sin este atributo, el usuario se queda en la página de Mercado Pago
- Es la configuración recomendada por el soporte de Mercado Pago

### Solución: Botón Único de Mercado Pago

#### 🔍 Problema Identificado

El SDK de Mercado Pago estaba creando su propio botón además del botón personalizado, resultando en dos botones en la interfaz.

#### 🛠️ Cambios Realizados

##### **1. Eliminación del contenedor del SDK**
```typescript
// ANTES
<div className="cho-container"></div>

// DESPUÉS
// Eliminado completamente
```

##### **2. Modificación de la función de checkout**
```typescript
// ANTES
mp.checkout({
  preference: { id: preferenceId },
  render: {
    container: '.cho-container',
    label: 'Pagar con Mercado Pago'
  },
  theme: {
    elementsColor: '#007bff',
    headerColor: '#007bff'
  }
});

// DESPUÉS
mp.checkout({
  preference: { id: preferenceId }
});
```

##### **3. Agregado estado de loading**
```typescript
const [redirecting, setRedirecting] = useState(false);

// En el botón
disabled={redirecting}
{redirecting ? (
  <>
    <span className="spinner-border spinner-border-sm me-2"></span>
    Redirigiendo...
  </>
) : (
  <>
    <i className="bi bi-credit-card me-2"></i>
    Pagar con Mercado Pago
  </>
)}
```

#### 🎯 Resultado Final

##### **Interfaz Limpia**
- ✅ **Un solo botón** personalizado
- ✅ **Estilo consistente** con tu diseño
- ✅ **Estado de loading** durante la redirección
- ✅ **Manejo de errores** visible

##### **Funcionalidad Completa**
- ✅ **Redirección directa** a Checkout Pro
- ✅ **Preferencia creada** automáticamente
- ✅ **Métodos de pago** disponibles
- ✅ **Experiencia de usuario** mejorada

---

## 📦 Gestión de Productos y Variantes

### Solución: Dimensiones de Variantes de Productos

#### Problema Identificado

El sistema tenía varios problemas con el manejo de dimensiones en variantes de productos:

1. **Falta de campos en el modelo del servidor**: El modelo `Product.js` no tenía los campos `definesDimensions` y `dimensiones` en las opciones de variantes.
2. **Falta de campo `variants` en productos individuales**: Los productos individuales no guardaban las variantes seleccionadas.
3. **Función `getVariantOrProductDimensions` limitada**: Solo tomaba el primer atributo que definía dimensiones.
4. **Variantes no se pasaban en el flujo de checkout**: Las variantes seleccionadas no se incluían en los metadatos del pago.

#### Solución Implementada

##### **1. Actualización del Modelo Product (servidor)**

**Archivo**: `server/models/Product.js`

- ✅ Agregado campo `definesDimensions` en atributos de variantes
- ✅ Agregado campo `dimensiones` en opciones de variantes
- ✅ Agregados métodos `getVariantOrProductDimensions()` y `getVariantOrProductVolume()`

##### **2. Actualización del Modelo IndividualProduct (servidor)**

**Archivo**: `server/models/IndividualProduct.js`

- ✅ Agregado campo `variants` para guardar variantes seleccionadas
- ✅ Agregados métodos `getVariantOrProductDimensions()` y `getVariantOrProductVolume()`

##### **3. Actualización del Flujo de Checkout**

**Archivos modificados**:
- `server/controllers/paymentController.js`
- `server/controllers/cartController.js`
- `client/src/pages/CartPage.tsx`

- ✅ Las variantes se incluyen en los metadatos del pago
- ✅ Las dimensiones se calculan correctamente basándose en las variantes
- ✅ Los productos individuales se crean con las variantes y dimensiones correctas

##### **4. Actualización del Frontend**

**Archivos modificados**:
- `client/src/services/productService.ts`
- `client/src/pages/OrdersPage.tsx`
- `client/src/types/order.ts`

- ✅ Función `getVariantOrProductDimensions` mejorada para manejar múltiples atributos
- ✅ Tipos TypeScript actualizados para incluir variantes
- ✅ Página de órdenes usa dimensiones correctas de variantes

#### Cómo Funciona Ahora

##### **1. Configuración de Variantes**

1. En el admin, al crear/editar un producto con variantes:
   - Marcar qué atributo define dimensiones (ej: "Talla")
   - Configurar dimensiones específicas para cada opción (ej: XL = 25×20×5 cm)

##### **2. Flujo de Compra**

1. Usuario selecciona variantes en el producto
2. Las variantes se guardan en el carrito
3. Al hacer checkout, las variantes se incluyen en los metadatos del pago
4. Se crean productos individuales con las variantes y dimensiones correctas

##### **3. Visualización en "Mis Pedidos"**

1. El sistema obtiene las dimensiones correctas basándose en las variantes
2. Se muestran las dimensiones específicas de la variante seleccionada
3. El cálculo de volumen y optimización de casilleros usa las dimensiones correctas

#### Ejemplo de Uso

##### Producto: Camisa
- **Atributo**: Talla (define dimensiones)
  - **S**: 20×15×2 cm, 200g
  - **M**: 22×16×2 cm, 220g
  - **L**: 24×17×2 cm, 240g
  - **XL**: 26×18×2 cm, 260g

##### Flujo:
1. Usuario compra camisa talla XL
2. Sistema guarda variante: `{ "Talla": "XL" }`
3. Producto individual se crea con dimensiones: 26×18×2 cm, 260g
4. En "Mis Pedidos" se muestran las dimensiones correctas de XL

---

## 🛒 Carrito y Checkout

### Solución al Error "No hay productos en el carrito"

#### 🔍 Problema Identificado

El error "No hay productos en el carrito" se debe a un problema en la lógica de validación del carrito en el archivo `CheckoutPage.tsx`. 

##### ❌ Código Problemático (Antes)
```typescript
const cartItems = await cartService.getCart();

if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
  setError('No hay productos en el carrito');
  return;
}
```

##### ✅ Código Corregido (Después)
```typescript
const cartData = await cartService.getCart();

if (!cartData || !cartData.items || !Array.isArray(cartData.items) || cartData.items.length === 0) {
  setError('No hay productos en el carrito');
  return;
}
```

#### 🛠️ Cambios Realizados

##### **1. Corrección en CheckoutPage.tsx**
- **Línea 25**: Cambié `cartItems` por `cartData` para mayor claridad
- **Línea 27**: Corregí la validación para verificar `cartData.items` en lugar de `cartItems`
- **Línea 33**: Actualicé el mapeo para usar `cartData.items`
- **Líneas 35-37**: Corregí los nombres de las propiedades:
  - `item.name` → `item.nombre_producto`
  - `item.price` → `item.precio_unitario`
  - `item.quantity` → `item.cantidad`

##### **2. Logs de Depuración Agregados**
Se agregaron logs detallados para facilitar la depuración:

###### En CheckoutPage.tsx:
```typescript
console.log('=== CARGANDO DATOS DEL CHECKOUT ===');
console.log('Datos del carrito recibidos:', cartData);
console.log('✅ Carrito válido con', cartData.items.length, 'productos');
console.log('Items del carrito:', cartData.items);
```

###### En cartService.ts:
```typescript
console.log('🛒 Obteniendo carrito desde:', ENDPOINTS.CART);
console.log('Headers:', this.getHeaders());
console.log('Respuesta del servidor:', response.status, response.statusText);
```

#### 📋 Estructura Correcta del Carrito

El servicio `cartService.getCart()` devuelve un objeto con esta estructura:

```typescript
{
  _id: string,
  id_usuario: string,
  items: [
    {
      id_producto: {
        _id: string,
        nombre: string,
        precio: number,
        imagen_url: string
      },
      cantidad: number,
      precio_unitario: number,
      nombre_producto: string,
      imagen_producto: string
    }
  ],
  total: number,
  creado_en: string,
  actualizado_en: string
}
```

---

## 🎨 Visualización 3D

### Solución: Visualización 3D de Variantes en Reservas Activas

#### Problema
La visualización 3D de las reservas activas no estaba mostrando las dimensiones correctas de las variantes de productos. En lugar de mostrar las dimensiones específicas de cada variante, mostraba las dimensiones del producto padre.

#### Ejemplo del Problema
Para productos como "Camisa Blanca" con variantes:
- **Variante 1**: 20×20×20 cm (talla XL, color rojo)
- **Variante 2**: 30×10×20 cm (talla L, color rojo)

La visualización 3D de las reservas activas mostraba las dimensiones del producto padre en lugar de las dimensiones específicas de cada variante.

#### Causa Raíz
El problema tenía múltiples capas:

1. **Estructura de datos incorrecta en el modelo `Appointment`**: El campo `itemsToPickup.product` referenciaba `Product` en lugar de `IndividualProduct`, causando que el backend no pudiera identificar correctamente qué `IndividualProduct` específico correspondía a cada item en la reserva.

2. **Lógica de fallback incorrecta en `IndividualProduct.getVariantOrProductDimensions`**: El método usaba `this.dimensiones` (copia estática) en lugar de `this.product.dimensiones` (dinámica del producto base poblado).

3. **Lógica de búsqueda inadecuada en `appointmentController`**: Usaba `IndividualProduct.find` y tomaba `individualProducts[0]`, lo que siempre seleccionaba el mismo `IndividualProduct` para múltiples instancias del mismo producto base.

4. **Asignación incorrecta de `IndividualProduct` en reservas existentes**: Las reservas existentes tenían múltiples items del mismo producto base pero todos apuntaban al mismo `IndividualProduct`, causando que se mostraran las mismas dimensiones para variantes diferentes.

#### Solución Implementada

##### **1. Modificación del Modelo `Appointment` (`server/models/Appointment.js`)**
```javascript
// Antes:
itemsToPickup: [{
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  // ...
}]

// Después:
itemsToPickup: [{
  individualProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IndividualProduct',
    required: true
  },
  originalProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  // ...
}]
```

##### **2. Actualización del Controlador `appointmentController` (`server/controllers/appointmentController.js`)**

###### Función `createAppointment`:
```javascript
// Antes:
validItems.push({
  product: individualProduct._id,
  // ...
});

// Después:
validItems.push({
  individualProduct: individualProduct._id,
  originalProduct: individualProduct.product._id,
  // ...
});
```

###### Funciones `getMyAppointments` y `getMyAppointment`:
```javascript
// Antes:
.populate('itemsToPickup.product', 'nombre imagen_url descripcion dimensiones variants')

// Después:
.populate('itemsToPickup.individualProduct')
.populate('itemsToPickup.originalProduct', 'nombre imagen_url descripcion dimensiones variants')
```

```javascript
// Antes: Búsqueda manual de IndividualProduct
const individualProducts = await IndividualProduct.find({
  product: item.product._id,
  user: req.user.id,
  status: { $in: ['reserved', 'claimed'] }
}).populate('product');

// Después: Uso directo del IndividualProduct ya poblado
const individualProduct = item.individualProduct;
```

##### **3. Corrección del Fallback en `IndividualProduct` (`server/models/IndividualProduct.js`)**
```javascript
// Antes:
return this.dimensiones; // Copia estática

// Después:
if (this.populated('product') && this.product.dimensiones) {
  return this.product.dimensiones; // Dinámica del producto base
}
return this.dimensiones; // Fallback a copia estática
```

##### **4. Migración de Reservas Existentes**
Se creó y ejecutó un script de migración para actualizar las reservas existentes:
- Cambió `itemsToPickup.product` por `itemsToPickup.individualProduct` y `itemsToPickup.originalProduct`
- Asignó correctamente los `IndividualProduct` específicos para cada item

##### **5. Corrección de Asignación de IndividualProduct**
Se corrigió la asignación de `IndividualProduct` en reservas que tenían múltiples items del mismo producto base:
- **Antes**: Ambos items "Camisa Blanca" usaban el mismo `IndividualProduct` (XL)
- **Después**: Cada item usa su `IndividualProduct` específico (XL y L respectivamente)

#### Verificación
Para verificar que la solución funciona correctamente:

1. **Crear una reserva con productos que tengan variantes con dimensiones diferentes**
2. **Verificar en la consola del navegador que los logs muestren:**
   - `🔍 Usando IndividualProduct ID: [ID único]` para cada item
   - `🔍 Dimensiones calculadas: {largo: X, ancho: Y, alto: Z}` con valores correctos
   - `✅ Usando dimensiones del backend` en el frontend

3. **Verificar que la visualización 3D muestre las dimensiones correctas para cada variante**

#### Estado Actual
✅ **Modelo `Appointment` actualizado** - Ahora referencia correctamente `IndividualProduct`
✅ **Controlador `appointmentController` actualizado** - Usa la nueva estructura de datos
✅ **Fallback en `IndividualProduct` corregido** - Usa dimensiones dinámicas del producto base
✅ **Reservas existentes migradas** - Estructura actualizada correctamente
✅ **Asignación de IndividualProduct corregida** - Cada item usa su variante específica
✅ **Logging extensivo agregado** - Para debugging y verificación

#### Resultado Final
La visualización 3D de las reservas activas ahora muestra correctamente:
- ✅ Dimensiones específicas de cada variante (20×20×20 cm para XL, 30×10×20 cm para L)
- ✅ Volumen calculado correctamente para cada variante
- ✅ Información de variantes disponible en el frontend
- ✅ Compatibilidad con la visualización previa a la reserva

---

## 🛠️ Scripts y Herramientas

### Scripts de Migración

#### 1. Migrar Productos con Variantes
```bash
node server/migrate-variants-dimensions.js
```
Este script agrega los campos faltantes a productos existentes con variantes.

#### 2. Actualizar Dimensiones de Productos Individuales
```bash
node server/update-individual-products-dimensions.js
```
Este script actualiza las dimensiones de productos individuales existentes basándose en sus variantes.

#### 3. Probar la Implementación
```bash
node server/test-variants-dimensions.js
```
Este script prueba que todo funciona correctamente.

### Scripts de Verificación

#### 1. Verificar Configuración General
```bash
cd server
node test-mercadopago-config.js
```

#### 2. Probar Bancos PSE Disponibles
```bash
cd server
node test-pse-banks.js
```

#### 3. Probar desde la Interfaz Web
1. Ve a http://localhost:5173/payment-test
2. Haz clic en "Probar Configuración PSE"
3. Revisa los resultados

### Scripts de Diagnóstico

#### 1. Probar Configuración General
```bash
cd server
node test-checkout-debug.js
```

#### 2. Probar Cuentas de Prueba
```bash
cd server
node test-mp-accounts.js
```

#### 3. Probar Endpoint del Carrito
```bash
cd server
node test-cart-debug.js
```

### Scripts de Limpieza

#### 1. Limpiar Productos Duplicados
```bash
node server/cleanup-duplicates.js
```

#### 2. Limpiar Productos Individuales Duplicados
```bash
node server/cleanup-duplicate-individual-products.js
```

#### 3. Limpiar Órdenes Duplicadas
```bash
node server/cleanup-order-duplicates.js
```

### Scripts de Verificación de Base de Datos

#### 1. Verificar Todas las Colecciones
```bash
node server/check-all-collections.js
```

#### 2. Verificar Productos
```bash
node server/check-products.js
```

#### 3. Verificar Órdenes
```bash
node server/check-orders.js
```

#### 4. Verificar Pagos
```bash
node server/check-payments.js
```

### Scripts de Configuración

#### 1. Agregar Dimensiones a Productos
```bash
node server/add-dimensions-to-products.js
```

#### 2. Crear Productos Individuales para Órdenes Existentes
```bash
node server/create-individual-products-for-existing-orders.js
```

#### 3. Crear Productos Individuales para Pagos Existentes
```bash
node server/create-individual-products-for-existing-payment.js
```

### Scripts de Monitoreo

#### 1. Monitorear Webhooks
```bash
node server/monitor-webhooks.js
```

#### 2. Explorar Base de Datos
```bash
node server/explore-db.js
```

#### 3. Debuggear Producto Específico
```bash
node server/debug-sapo-product.js
```

---

## 📋 Checklist de Verificación

### Configuración de Mercado Pago
- [ ] Cuenta vendedor de prueba creada
- [ ] Cuenta comprador de prueba creada
- [ ] Credenciales de prueba obtenidas
- [ ] Variables de entorno configuradas
- [ ] Servidor reiniciado
- [ ] Prueba con cuenta comprador de prueba
- [ ] Métodos de pago funcionando

### Webhooks
- [ ] ngrok configurado para puerto 5000
- [ ] URL del webhook configurada en Mercado Pago
- [ ] Access token configurado correctamente
- [ ] Endpoint respondiendo correctamente
- [ ] Logs funcionando para depuración

### Redirecciones
- [ ] URLs de redirección configuradas correctamente
- [ ] auto_return configurado como 'approved'
- [ ] Página de resultado manejando todos los estados
- [ ] Redirección automática funcionando

### Productos y Variantes
- [ ] Modelos actualizados con campos de dimensiones
- [ ] Scripts de migración ejecutados
- [ ] Variantes guardándose correctamente en el carrito
- [ ] Dimensiones calculándose correctamente
- [ ] Visualización 3D mostrando dimensiones correctas

### Carrito y Checkout
- [ ] Error "No hay productos en el carrito" corregido
- [ ] Estructura del carrito validada correctamente
- [ ] Logs de depuración funcionando
- [ ] Flujo de pago completo funcionando

---

## 🚀 Próximos Pasos

1. **Configurar las cuentas de prueba** siguiendo esta guía
2. **Probar el flujo completo** con la cuenta comprador de prueba
3. **Verificar todos los métodos de pago** (tarjetas, PSE, efectivo)
4. **Configurar webhooks** para notificaciones de pago
5. **Personalizar URLs** para producción
6. **Monitorear pagos** e implementar dashboard
7. **Optimizar la experiencia de usuario** según sea necesario

---

## 📞 Soporte

Si encuentras problemas:

1. **Revisa los logs** en la consola del navegador
2. **Ejecuta los scripts de prueba** para identificar el problema
3. **Verifica que las credenciales sean correctas**
4. **Asegúrate de usar solo cuentas de prueba**
5. **Revisa la documentación oficial de Mercado Pago**

¡El sistema ahora está completamente configurado y optimizado! 🎉 