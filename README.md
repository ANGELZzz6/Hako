# Hako — E-commerce con Sistema de Recogida en Lockers

Hako es una plataforma completa de comercio electrónico que integra un sistema de compra de productos con un innovador sistema de recogida en taquillas o casilleros inteligentes (lockers). Permite a los usuarios comprar productos en línea y reservarlos para recogerlos en un momento específico, evitando los tiempos de espera de los envíos tradicionales.

## Descripción del Proyecto

Hako está diseñado para ofrecer una experiencia de compra rápida y sin fricciones. Desde la selección de productos y el pago seguro en línea, hasta la reserva de un locker para recoger la compra escaneando un código QR.

**Usuarios Principales:**
*   **Administradores:** Tienen control total sobre el inventario, gestión de usuarios, asignación de lockers, soporte, control de pagos, y personalización del contenido de la web.
*   **Clientes:** Pueden explorar productos, agregarlos a su "Box" (carrito), realizar pagos, gestionar sus reservas de lockers y revisar su historial de pedidos.

**Valor Principal:**
Comodidad y rapidez. Los clientes no tienen que esperar días por un envío. Compran, eligen el momento para recoger, se les asigna un locker y van a retirar sus productos cuando les sea más conveniente.

## Funcionalidades Principales

### Plataforma Cliente
*   **Catálogo de Productos:** Exploración de productos disponibles, con detalles, precios e imágenes.
*   **Sistema de Carrito ("Tu Box"):** Gestión de productos a comprar.
*   **Recogida en Lockers:** Tras la compra, el sistema permite reservar una fecha y hora para la recogida, asignando automáticamente un locker disponible.
*   **Pagos Seguros:** Integración con Mercado Pago para transacciones seguras.
*   **Perfil de Usuario y Mis Pedidos:** Historial de compras, reservas activas, y códigos QR para abrir los lockers.
*   **Diseño Responsivo:** Optimizado tanto para dispositivos móviles como de escritorio, con modo claro y oscuro.

### Panel de Administración (Admin Dashboard)
*   **Gestión de Inventario (Productos):** Agregar, editar y eliminar productos.
*   **Gestión de Lockers y Asignaciones:** Supervisión de los lockers, su estado, y las reservas de los clientes.
*   **Monitorización de Pedidos y Pagos:** Ver pedidos realizados y su estado de pago.
*   **Gestión de Usuarios:** Ver información de los clientes registrados.
*   **Sistema de Soporte:** Responder a sugerencias o problemas reportados por los clientes.
*   **Editor de Contenido:** Personalizar títulos, descripciones y banners de la página principal directamente desde el panel, sin tocar código.

## Tecnologías Utilizadas (Tech Stack)

*   **Frontend:** React 18, TypeScript, Vite, Vanilla CSS, Bootstrap (para estructura).
*   **Backend:** Node.js, Express.js.
*   **Base de Datos:** MongoDB con Mongoose ODM.
*   **Autenticación:** JWT (JSON Web Tokens) & Google OAuth 2.0.
*   **Pagos:** Integración con Mercado Pago.
*   **Generación de QR:** `qrcode` para los códigos de acceso a los lockers.

## Estructura del Proyecto

```text
/
├── client/                 # Aplicación frontend en React
│   ├── src/
│   │   ├── components/     # Componentes de UI reutilizables
│   │   ├── pages/          # Vistas principales (Admin, Checkout, Home, etc.)
│   │   ├── services/       # Conexiones con la API (axios)
│   │   ├── contexts/       # Estado global (Auth, Cart, Configuración del Sitio)
│   │   └── hooks/          # Custom hooks
├── server/                 # Aplicación backend Node.js / Express
│   ├── controllers/        # Lógica de negocio
│   ├── models/             # Esquemas de base de datos (Mongoose)
│   ├── routes/             # Definición de endpoints de la API
│   ├── middleware/         # Autenticación, guardias de seguridad
│   └── services/           # Integraciones de servicios
└── docs/                   # Documentación adicional
```

## Instalación

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd hako
```

### 2. Instalar dependencias
Instalar las dependencias de la carpeta raíz, del frontend y del backend:
```bash
npm install
cd client && npm install
cd ../server && npm install
```

### 3. Variables de Entorno
Crea archivos `.env` en la raíz, en `client/` y en `server/` basándote en los ejemplos (p. ej. `env-example.txt`). Necesitarás configurar:
*   URI de MongoDB.
*   Secretos para JWT.
*   Credenciales de Mercado Pago.
*   Client ID de Google para autenticación.

### 4. Ejecutar el proyecto
**Modo Desarrollo:**
```bash
# En la carpeta raíz
npm run dev
```
Esto iniciará tanto el servidor backend como la aplicación frontend en React de forma simultánea.

**Modo Producción:**
```bash
npm start
```

## Flujo de Uso (Para el Usuario)

1.  **Exploración y Selección:** El cliente navega por los productos, añade al "Box" los que desea comprar.
2.  **Checkout y Pago:** El usuario inicia el proceso de pago, es redirigido a Mercado Pago.
3.  **Reserva de Locker:** Tras un pago exitoso, la plataforma indica que tiene productos sin reservar. El cliente va a "Mis Pedidos" y programa la fecha/hora de recogida.
4.  **Generación de QR:** El sistema asigna un locker y genera un código QR único que sirve como "llave" para abrir el locker.
5.  **Recogida:** El cliente se dirige a la ubicación física de la tienda en el horario acordado, muestra el QR y recoge sus productos.

## Endpoints Principales de la API

*   `GET /api/productos`: Lista de todos los productos disponibles.
*   `POST /api/cart/add`: Añade un producto al carrito del usuario.
*   `POST /api/payment/create-preference`: Inicia una intención de pago en Mercado Pago.
*   `GET /api/orders/my-orders`: Devuelve las compras del usuario autenticado.
*   `POST /api/appointments`: Crea una reserva de recogida y asigna un locker.
*   `GET /api/lockers`: (Admin) Ver el estado de todos los casilleros.

---
*Nota: Este proyecto está en desarrollo y algunas funcionalidades como los pagos y correos electrónicos pueden estar en modo de prueba (sandbox).*
