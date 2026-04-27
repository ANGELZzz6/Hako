# Hako — Smart Locker & 3D Bin Packing System

Hako (箱) es una plataforma avanzada de gestión de casilleros inteligentes que combina una experiencia de compra e-commerce con una logística de retiro físico automatizada. El sistema utiliza un motor de empaquetado 3D (3D Bin Packing) para optimizar el espacio de los casilleros y una visualización en tiempo real para el usuario.

## 🚀 Propuesta de Valor

Hako automatiza el ciclo de vida completo de un producto físico: desde la compra segura en línea hasta la asignación inteligente de un espacio físico en un casillero y su posterior retiro mediante tecnología QR.

**Diferenciadores Clave:**
*   **Motor 3D Real:** Visualización interactiva del casillero usando Three.js.
*   **Optimización de Espacio:** Algoritmo de Bin Packing que calcula la disposición óptima de productos según dimensiones reales (cm).
*   **Seguridad Transaccional:** Integración robusta con Wompi (Colombia) y validación de firmas SHA-256.

## 🛠️ Stack Tecnológico

*   **Frontend:** React 18, TypeScript, Vite, Three.js (Locker3DCanvas), Vanilla CSS.
*   **Backend:** Node.js, Express.js.
*   **Base de Datos:** MongoDB + Mongoose (Modelos complejos de asignación de espacio).
*   **Pagos:** Wompi API (Tarjetas, PSE, Nequi).
*   **Autenticación:** JWT + Google OAuth 2.0.
*   **Comunicaciones:** Nodemailer para envío de QRs de acceso.

## 📦 Características Principales

### Flujo del Usuario
1.  **Compra:** Selección de productos físicos con dimensiones específicas.
2.  **Pago:** Checkout seguro vía Wompi con estados en tiempo real (Webhooks).
3.  **Agendamiento:** Selección de slots de tiempo y asignación automática del mejor casillero disponible.
4.  **Retiro:** Recepción de un QR único que permite el acceso físico al casillero asignado.

### Panel Administrativo
*   **Monitoreo de Casilleros:** Vista en tiempo real del estado de ocupación (1-12 casilleros).
*   **Gestión de Inventario:** Control de productos individuales y sus dimensiones (Largo/Ancho/Alto).
*   **Auditoría de Pagos:** Control de transacciones, estados de Wompi y gestión de reembolsos.
*   **Sistema de Penalizaciones:** Bloqueo automático de usuarios por incumplimiento en retiros (24h).
*   **Editor de Contenido:** Personalizar la página principal directamente desde el panel, sin tocar código.
*   **Sistema de Soporte:** Gestión de tickets y sugerencias de clientes.

## 🔧 Instalación y Configuración

1. **Clonar el repositorio:** `git clone <repo-url>`
2. **Instalar dependencias:** `npm install` en root, `client/` y `server/`.
3. **Variables de Entorno (`.env` en raíz):**
   * `MONGODB_URI`: Conexión a la base de datos.
   * `WOMPI_PUBLIC_KEY_TEST` / `WOMPI_PRIVATE_KEY_TEST`: Credenciales de la pasarela.
   * `WOMPI_EVENTS_SECRET`: Secret para validación de webhooks.
   * `WEBHOOK_URL`: URL pública para recibir notificaciones de pago.
   * `JWT_SECRET`: Llave para sesiones de usuario.
   * `GOOGLE_CLIENT_ID`: Para autenticación con Google.
4. **Levantar en desarrollo:**
   ```bash
   # Terminal 1 — Backend
   npm run dev       # → http://localhost:5000

   # Terminal 2 — Frontend
   cd client
   npm run dev       # → http://localhost:5173
   ```
5. **Resetear DB para pruebas locales:**
   ```bash
   npm run reset-db  # Vacía la DB y crea admin@hako.test / Admin1234*
   ```

## 🏗️ Estructura del Proyecto

```text
/
├── client/                 # Aplicación frontend en React
│   ├── src/
│   │   ├── components/     # Componentes reutilizables (Locker3DCanvas, WompiCheckout...)
│   │   ├── pages/          # Vistas (Admin, Checkout, Orders, Landing...)
│   │   ├── services/       # Conexiones con la API (axios)
│   │   └── contexts/       # Estado global (Auth, Cart, SiteSettings)
├── server/                 # Aplicación backend Node.js / Express
│   ├── controllers/        # Lógica de negocio
│   ├── models/             # Esquemas Mongoose
│   ├── routes/             # Endpoints de la API
│   ├── middleware/         # JWT auth, adminAuth, rate limiting
│   ├── services/           # lockerAssignmentService, binPackingService
│   └── scripts/            # Utilidades de mantenimiento y seed
└── docs/                   # Documentación técnica (AI_CONTEXT, MASTER_DOC)
```

## 🛡️ Seguridad

*   **CORS** condicional: abierto en desarrollo, restringido al `FRONTEND_URL` en producción.
*   **Idempotencia de Webhooks**: guard basado en DB (`wompi_transaction_id` único) — resiste reinicios del servidor.
*   **Rate Limiting** en todas las rutas de autenticación (login, registro, verificación, recuperación).
*   **Validación de firmas SHA-256** en cada evento de Wompi.
*   **Protección de rutas** mediante JWT y roles (Admin/User).
*   **Helmet + CSP** con dominios de Wompi, Google y Cloudinary explícitamente permitidos.

---
*Hako — Re-imaginando la logística de última milla.*
