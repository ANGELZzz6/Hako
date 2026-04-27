# HAKO — AI Master Context Document
## El Cerebro del Sistema para Agentes de IA Colaboradores

> **Uso de este documento:** Este archivo es la fuente de verdad arquitectónica para cualquier agente de IA que colabore en el desarrollo de HAKO. Léelo completo antes de modificar cualquier archivo crítico. Cada sección está diseñada para prevenir la rotura de reglas de negocio inviolables.

**Versión:** 2.0 | **Última Auditoría Técnica:** 2026-04-10 | **Auditor:** Arquitecto Principal (IA Senior)

---

## 1. ESENCIA DEL SISTEMA

**HAKO** es una plataforma automatizada **retail-to-locker** que elimina la intervención humana en la entrega de productos físicos. Conecta una tienda e-commerce digital con una batería de **12 casilleros inteligentes** físicos.

### Filosofía de Diseño
- **Sin intervención humana en la ruta crítica.** El flujo Pago → Asignación de casillero → Generación de QR → Recogida es completamente automático.
- **El hardware manda.** Toda la lógica de software debe respetar las restricciones físicas del hardware (12 casilleros, 27 slots 3D por casillero).
- **Idempotencia sobre velocidad.** Es mejor rechazar una operación duplicada que crear datos inconsistentes.

---

## 2. GLOSARIO DEL DOMINIO (Diferencias Críticas)

### `Product` vs. `IndividualProduct` — La Distinción Más Importante del Sistema

```
Product                         IndividualProduct
──────────────────────────────  ──────────────────────────────────────────────
📋 Catálogo / Blueprint         📦 Unidad física pagada y existente
Existe siempre en la BD         Solo existe DESPUÉS de un pago APPROVED de Wompi
Define precio, variantes,       Copia las dimensiones del Product en el momento
dimensiones del producto base   del pago (inmutable desde entonces)
N productos en catálogo         1 IP = 1 unidad física asignable a 1 casillero
```

**Regla inviolable:** `IndividualProduct` **jamás** debe crearse fuera del webhook de Wompi (`paymentController.js → createIndividualProductsForPayment`). Nunca crear IPs manualmente en endpoints de testing sin pasar por el flujo de pago.

### Ciclo de Vida del `IndividualProduct`

```
[PAGO APROBADO POR WOMPI]
         ↓
    available  ←──────────────────── (si se cancela la cita)
         ↓   createAppointment()
    reserved   ←── IndividualProduct.status = 'reserved'
         ↓         IndividualProduct.assignedLocker = N
    claimed    ←── El usuario escanea el QR en el casillero físico
         ↓
    picked_up  ←── Confirmación de recogida. Estado terminal.
```

**El estado `returned` mencionado en versiones anteriores del sistema fue deprecado.** Los reembolsos actualizan el estado del `Payment` a `refunded` y la `Order` a `cancelled`, pero la IP puede quedar en `available` si aún no fue recogida.

### Ciclo de Vida del `Appointment`

```
scheduled  →  confirmed  →  completed  (flujo feliz)
    ↓              ↓
cancelled      cancelled    (por usuario o admin)
    ↓
 no_show                    (asignado por CRON o admin si el usuario no llegó)
```

### Ciclo de Vida del `Order`

```
pending → paid → ready_for_pickup → picked_up
   ↓                    ↓
cancelled           cancelled
```

---

## 3. EL MOTOR ESPACIAL 3D (Space Logic) — Explicación Matemática Completa

### 3.1 Modelo de Casillero

Cada casillero físico es una caja de **50cm × 50cm × 50cm**.
Se modela internamente como una **cuadrícula 3×3×3 de 27 slots**.
Cada slot mide **15cm × 15cm × 15cm** (`SLOT_SIZE = 15` en `lockerAssignmentService.js`).

```
Casillero (50×50×50 cm)
┌─────────────────┐
│  [1][2][3]      │ ← Fila X (largo)
│  [4][5][6]      │ ← Fila Y (ancho)
│  [7][8][9] ...  │ ← Fila Z (alto)
└─────────────────┘
27 slots de 15cm³ cada uno
Capacidad máxima: 27 slots
```

### 3.2 Cálculo de Slots por Producto

```js
// lockerAssignmentService.js → calculateSlots()
const SLOT_SIZE = 15; // cm

function calculateSlots(dimensions) {
  const slotsX = Math.ceil(dimensions.largo / SLOT_SIZE);  // largo
  const slotsY = Math.ceil(dimensions.ancho / SLOT_SIZE);  // ancho
  const slotsZ = Math.ceil(dimensions.alto / SLOT_SIZE);   // alto
  return slotsX * slotsY * slotsZ;
}

// Ejemplo: Producto 20×10×30 cm
// slotsX = ceil(20/15) = 2
// slotsY = ceil(10/15) = 1
// slotsZ = ceil(30/15) = 2
// Total = 2 × 1 × 2 = 4 slots
```

### 3.3 Empaquetado en Múltiples Casilleros (`splitProductsIntoLockers`)

Cuando una cita tiene productos que en total superan los 27 slots, el sistema los reparte en múltiples casilleros:

```
MAX_SLOTS = 27

Algoritmo First Fit Decreasing (implícito):
1. Iterar productos ordenados (mayor a menor por calculatedSlots)
2. Si el producto cabe en el casillero actual → agregarlo
3. Si no cabe → abrir un nuevo casillero
4. Si un producto por sí solo supera 27 slots → asignarle un casillero propio (cap en 27)
```

### 3.4 Jerarquía de Resolución de Dimensiones

Cuando se buscan las dimensiones de un `IndividualProduct`, el sistema sigue esta cadena de prioridad (en `lockerAssignmentService.calculateProductDimensions`):

```
1. item.dimensiones (dimensiones directas del item)
2. item.calculatedDimensiones (pre-calculadas en backend)
3. item.individualProductDimensions
4. item.originalProductDimensions
5. Variantes del producto (individualProduct.variants × Product.variants.attributes[].dimensiones)
6. item.product.dimensiones (producto base poblado)
7. item.individualProduct.dimensiones
8. item.originalProduct.dimensiones
──────────────────────────────────────────────
Fallback: { largo: 15, ancho: 15, alto: 15 } ← Equivale a exactamente 1 slot
```

> [!WARNING]
> El fallback de dimensiones `{ largo: 15, ancho: 15, alto: 15 }` silencia el error y registra el producto como "ocupa 1 slot". Si un producto real fuera mucho más grande, esto causaría **over-assignment silencioso**. Siempre verificar que los `Product` en catálogo tengan dimensiones válidas.

### 3.5 Motor Visual vs. Motor de Asignación (INCONSISTENCIA CONOCIDA)

Existen **dos implementaciones del motor espacial** que deben reconciliarse:

| | `binPackingService.js` | `lockerAssignmentService.js` |
|---|---|---|
| **Modelo** | Posicionamiento continuo 3D (x,y,z en cm) | Cuadrícula discreta de 27 slots |
| **Usado en** | Visualización `Locker3DCanvas.tsx` | Lógica de asignación real (`findBestLocker`, `syncFromAppointments`) |
| **Source of Truth** | ❌ Solo visual | ✅ Decisiones de negocio |

**Consecuencia para agentes IA:** Al calcular si un producto cabe en un casillero para lógica de negocio, **siempre usar el modelo de slots de `lockerAssignmentService`**. El `binPackingService` es para renderizar el estado visual al usuario.

---

## 4. FLUJO DE PAGO WOMPI — Detalles Críticos

### 4.1 Referencia de Transacción

Formato: **`HAKO-{Date.now()}-{userId}`**

```js
const reference = `HAKO-${Date.now()}-${user_id}`;
```

- `Date.now()` es el timestamp Unix en milisegundos.
- `userId` es el `_id` de MongoDB del usuario autenticado.
- Esta referencia es el `external_reference` y el `payment_id` en los modelos `Order` y `Payment`.
- **No cambiar este formato.** El webhook parsea el userId con `reference.split('-')[2]`.

### 4.2 Validación de Firma SHA-256

```js
// paymentController.js → validateWompiSignature()
const orderStr = tx.id + tx.status + tx.amount_in_cents + timestamp + WOMPI_EVENTS_SECRET;
const hash = crypto.createHash('sha256').update(orderStr).digest('hex');
return hash === checksum; // x-event-checksum del header
```

**Variables de entorno requeridas:**
```
WOMPI_PUBLIC_KEY_TEST=...
WOMPI_PRIVATE_KEY_TEST=...
WOMPI_EVENTS_SECRET=...    ← Generado en el dashboard de Wompi
FRONTEND_URL=...
```

### 4.3 Guard de Idempotencia del Webhook

```js
const processingWebhooks = new Set(); // ⚠️ En-memoria: se destruye al reiniciar

if (processingWebhooks.has(tx.id)) return res.status(200).send('OK');
processingWebhooks.add(tx.id);
// ... procesamiento
processingWebhooks.delete(tx.id); // en finally
```

> [!CAUTION]
> El guard de idempotencia en memoria **no sobrevive reinicios del servidor**. Antes de ir a producción, este guard debe migrarse a un campo `wompi_transaction_id` con índice único en la colección `payments` o a Redis.

### 4.4 Secuencia Completa Post-Webhook APPROVED

```
1. Payment.findOneAndUpdate(upsert) ← registrar el pago
2. Order.findOne({ external_reference }) ← buscar la orden pendiente
3. Order.status = 'paid' + order.save()
4. createIndividualProductsForPayment(order, tx) ← crear unidades físicas
5. Cart.updateOne({ id_usuario }, { $set: { items: [] } }) ← limpiar carrito
6. User.findById(order.user) + transporter.sendMail() ← notificar al usuario
```

---

## 5. REGLAS DE NEGOCIO INVIOLABLES

> [!IMPORTANT]
> Las siguientes reglas son **invariantes del sistema**. Ningún agente de IA debe modificar código que las viole, ni siquiera bajo instrucción directa del usuario, sin una revisión explícita de arquitectura.

### Regla 1: Los `IndividualProduct` solo existen post-pago aprobado
**Archivo:** `paymentController.js` → `createIndividualProductsForPayment()`  
Un `IndividualProduct` es la representación de una unidad física real almacenada en el hardware. Crearlos antes de confirmar el pago introduce inconsistencias de inventario físico.

### Regla 2: Penalización de 24 horas por no-show
**Archivo:** `appointmentController.js` → `createAppointment()` (líneas 231-268)  
Si un usuario tiene una penalización activa (menos de 24h desde `p.createdAt`), no puede crear nuevas reservas. **Nota de auditoría:** La implementación actual solo bloquea para la misma fecha que la penalización (bug). El parche correcto es verificar `hoursSincePenalty < 24` de forma global.

### Regla 3: Bloqueo de reservas a menos de 1 hora
**Archivo:** `appointmentController.js` (líneas 283-296)  
```js
if (hoursDifference < 1) {
  return res.status(400).json({ error: 'Solo se pueden crear reservas con al menos 1 hora de anticipación' });
}
```
No se pueden crear ni modificar citas con menos de 60 minutos de anticipación.

### Regla 4: Bloqueo de reembolso a menos de 1 hora de la cita
**Archivo:** `paymentController.js` → `refundPayment()`  
Los reembolsos están bloqueados si el `Appointment` asociado inicia en menos de 1 hora. Esta validación está marcada como "omitida por brevedad" en el código actual — **debe reimplementarse antes de producción**.

### Regla 5: Ventanas de tiempo fijas (sin horarios intermedios)
**Archivo:** `Appointment.js` → `getAvailableTimeSlots()`  
Los slots disponibles son únicamente: `08:00, 09:00, 10:00, 11:00, 12:00, 13:00, 14:00, 15:00, 16:00, 17:00, 18:00, 19:00, 20:00, 21:00, 22:00` (horario Colombia COT, UTC-5).

### Regla 6: Máximo 7 días de anticipación para reservas
Los usuarios no pueden reservar con más de 7 días de anticipación desde hoy (horario Colombia).

### Regla 7: Máximo 12 casilleros por instalación física
`findBestLocker()` itera del 1 al 12. `Appointment.getAvailableTimeSlots()` cuenta `totalLockers = 12`. **No cambiar estos valores sin reemplazar el hardware.**

### Regla 8: Un `IndividualProduct` → un casillero (no compartir)
Un `IndividualProduct` tiene exactamente un `assignedLocker`. No existe el concepto de "partir" un producto entre casilleros.

---

## 6. ARQUITECTURA Y CONVENCIONES DE CÓDIGO

### 6.1 Stack Tecnológico

| Capa | Tecnología | Versión | Notas |
|---|---|---|---|
| Frontend | React | 18 | Con TypeScript estricto |
| Build Tool | Vite | Latest | Dev server + HMR |
| Tipado | TypeScript | Latest | `strict: true` obligatorio |
| Estilos | **Vanilla CSS** | — | **CERO frameworks de utilidades (no Tailwind, no Bootstrap)** |
| Backend | Node.js + Express | Latest | CommonJS (no ESM) |
| Base de datos | MongoDB | Atlas | ODM: Mongoose |
| Automatización | node-cron | — | Para QR expiry y penalizaciones |
| Email | Nodemailer | — | Config en `server/config/nodemailer.js` |
| Pasarela de pago | Wompi | Sandbox/Prod | API Colombia (COP) |

### 6.2 Convenciones de Código — Frontend (React / TypeScript)

**Tipado estricto:**
```typescript
// ✅ CORRECTO: Interfaces explícitas para todos los datos de dominio
interface IndividualProduct {
  _id: string;
  status: 'available' | 'reserved' | 'claimed' | 'picked_up';
  assignedLocker?: number; // 1-12
  dimensiones?: { largo: number; ancho: number; alto: number; peso?: number };
  variants?: Record<string, string>;
}

// ❌ INCORRECTO: any implícito
const products = await fetch('/api/products').then(r => r.json()); // any sin tipado
```

**Nunca usar `any` en rutas críticas.** Definir interfaces en `client/src/types/` o localmente en el componente.

**Nomenclatura:**
- Componentes React: `PascalCase` (ej. `Locker3DCanvas.tsx`)
- Hooks: `use` prefix (ej. `useOrdersPage.ts`)
- Páginas: sufijo `Page` (ej. `CartPage.tsx`, `AdminAppointmentsPage.tsx`)
- Helpers/Utils: `camelCase`

### 6.3 Convenciones de Código — Frontend (Vanilla CSS)

**Sistema de Diseño HAKO — Filosofía Glassmorphism:**

```css
/* Variables CSS globales — SIEMPRE usar, NUNCA hardcodear colores */
:root {
  /* Paleta principal HSL (no hex planos) */
  --hako-primary: hsl(220, 90%, 60%);
  --hako-primary-dark: hsl(220, 90%, 45%);
  --hako-glass-bg: hsla(220, 20%, 15%, 0.6);
  --hako-glass-border: hsla(220, 30%, 60%, 0.2);
  --hako-glass-blur: blur(12px);

  /* Tipografía */
  --font-primary: 'Inter', 'Montserrat', sans-serif;

  /* Elevaciones */
  --shadow-glass: 0 8px 32px hsla(220, 20%, 5%, 0.4);
  --shadow-hover: 0 16px 48px hsla(220, 70%, 30%, 0.3);
}

/* Patrón Glassmorphism estándar HAKO */
.hako-card {
  background: var(--hako-glass-bg);
  backdrop-filter: var(--hako-glass-blur);
  -webkit-backdrop-filter: var(--hako-glass-blur);
  border: 1px solid var(--hako-glass-border);
  border-radius: 16px;
  box-shadow: var(--shadow-glass);
}
```

**Reglas absolutas:**
- ❌ **Nunca** usar colores de browser default (`red`, `blue`, `green`)
- ❌ **Nunca** usar Tailwind CSS u otro framework de utilidades
- ✅ **Siempre** usar variables CSS `--hako-*` para colores
- ✅ **Siempre** incluir micro-animaciones en elementos interactivos (`transition: all 0.2s ease`)
- ✅ **Siempre** usar `Inter` o `Montserrat` como tipografía (Google Fonts)

### 6.4 Convenciones de Código — Backend (Node.js / Express)

**Módulos:** CommonJS (`require`/`module.exports`). No usar `import`/`export` en el servidor.

**Estructura de controladores:**
```js
// Patrón estándar HAKO
exports.myAction = async (req, res) => {
  try {
    // 1. Validar inputs
    // 2. Lógica de negocio
    // 3. Respuesta exitosa
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error myAction:', error.message);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};
```

**Logging en desarrollo:**
```js
const isDev = process.env.NODE_ENV === 'development';
if (isDev) console.log('🔍 Debug info...');
```

**Prefijos de emoji para logging (convención HAKO):**
- `🔍` — Debug / investigación de flujo
- `✅` — Operación exitosa
- `❌` — Error crítico
- `⚠️` — Warning no-bloqueante
- `🔄` — Sincronización / update en progreso
- `📅` — Operaciones de fechas/citas
- `📦` — Operaciones de productos
- `💳` — Operaciones de pago

---

## 7. ARCHIVOS CLAVE (Mapa de Navegación para IA)

### Backend
| Archivo | Responsabilidad |
|---|---|
| `server/controllers/paymentController.js` | Motor financiero: Wompi, Webhooks, Reembolsos, creación de IndividualProducts |
| `server/controllers/appointmentController.js` | Motor logístico: creación de citas, validaciones de negocio, penalizaciones |
| `server/services/lockerAssignmentService.js` | Motor espacial 3D: cálculo de slots, búsqueda de casillero óptimo, sincronización |
| `server/services/binPackingService.js` | Motor visual 3D: posicionamiento para renderizado en `Locker3DCanvas` |
| `server/models/IndividualProduct.js` | Schema de unidades físicas pagadas + métodos `getVariantOrProductDimensions()` |
| `server/models/LockerAssignment.js` | Schema de asignaciones de casillero (source of truth del estado del hardware) |
| `server/models/Appointment.js` | Schema de citas + statics `checkLockerAvailability`, `getAvailableTimeSlots` |
| `server/scheduledTasks.js` | CRON: vencimiento de QRs (cada hora), limpieza de QRs antiguos (02:00 AM) |

### Frontend
| Archivo | Responsabilidad |
|---|---|
| `client/src/App.tsx` | Routing global, estado Auth, estado Cart |
| `client/src/components/WompiCheckout.tsx` | Componente gateway de pago |
| `client/src/components/Locker3DCanvas.tsx` | Visualización 3D del casillero (usa `binPackingService` data) |
| `client/src/components/AppointmentScheduler.tsx` | UI de selección de fecha/hora para citas |
| `client/src/pages/CartPage.tsx` | Carrito + flujo de inicio de pago |
| `client/src/pages/OrdersPage/` | Listado de órdenes y estado de IPs |
| `client/src/pages/AdminAppointmentsPage.tsx` | Vista admin del calendario de citas |

---

## 8. CÓMO COLABORAR COMO AGENTE IA — Protocolo Obligatorio

### Antes de modificar cualquier archivo crítico:

1. **Trazabilidad de estado:** Cuando modifiques una `Order`, verifica si debes actualizar también `IndividualProduct` y `Appointment` relacionados.

2. **Respetar la cadena de motores:** No llamar a `binPackingService` para tomar decisiones de asignación de casillero; es solo para visualización. La autoridad es `lockerAssignmentService`.

3. **No romper la idempotencia:** Cualquier endpoint que pueda ser llamado múltiples veces (webhooks, retries de red) debe tener guards de idempotencia basados en DB, no en memoria.

4. **Mantener AESTHETICS:** Nunca introducir colores browser-default, nunca usar Tailwind/Bootstrap, siempre encapsular en `--hako-*` CSS variables.

5. **Sin TODOs en rutas críticas:** No dejar `// TODO` en código de pago, asignación de casilleros, o generación de QR. Implementar o lanzar excepción explícita.

6. **TypeScript strict:** No usar `any` en interfaces de dominio. Si el tipo no está definido, crearlo en `client/src/types/`.

7. **Zona horaria Colombia:** El servidor corre en UTC. Toda lógica de fechas visibles al usuario usa **COT (UTC-5)**. El offset es constante: `COLOMBIA_OFFSET_MS = 5 * 60 * 60 * 1000`. No usar `new Date().toLocaleDateString()` en el servidor.

### Vulnerabilidades conocidas pendientes de parche

| ID | Severidad | Descripción | Parche |
|---|---|---|---|
| HAKO-SEC-01 | 🔴 Crítico | Race condition en asignación de casillero (TOCTOU) | Usar transacciones MongoDB + upsert atómico |
| HAKO-SEC-02 | 🔴 Crítico | Idempotencia de webhook rompe al reiniciar servidor | Migrar guard a índice único en DB |
| HAKO-SEC-03 | 🟠 Alto | Validación de firma Wompi sin guard de estructura | Validar estructura del body antes de extraer campos |
| HAKO-SEC-04 | 🟠 Alto | Dos motores 3D incompatibles (binPacking vs slots) | Consolidar en un solo motor |
| HAKO-SEC-05 | 🟡 Medio | Penalización 24h bypasseable cambiando la fecha | Cambiar verificación a window global de 24h |

---

## 9. VARIABLES DE ENTORNO REQUERIDAS

```
# Servidor
NODE_ENV=development|production
PORT=5000

# Base de datos
MONGODB_URI=mongodb+srv://...

# JWT
JWT_SECRET=...

# Wompi (Pasarela de pagos)
WOMPI_PUBLIC_KEY_TEST=pub_test_...
WOMPI_PRIVATE_KEY_TEST=prv_test_...
WOMPI_EVENTS_SECRET=...

# Frontend (para redirects de Wompi)
FRONTEND_URL=http://localhost:5173

# Email (Nodemailer)
GMAIL_USER=...@gmail.com
GMAIL_APP_PASSWORD=...  # App password de Google, NO la contraseña normal
```

---

*Última actualización: 2026-04-10 — Auditoría Integral v2.0*
*Próxima revisión recomendada: Al implementar cualquiera de los parches HAKO-SEC-01 a HAKO-SEC-05*
