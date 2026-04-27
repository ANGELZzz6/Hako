# Pre-Launch Checklist — Hako
Lista de elementos que DEBEN resolverse antes de lanzar a producción.
Actualizar este archivo con cada nueva tarea identificada.

## Crítico (bloquea el lanzamiento)
- [ ] Configurar credenciales reales de Wompi en Render (PROD keys, no TEST)
- [ ] Cambiar `NODE_ENV=production` en servidor de producción (Render dashboard)
- [ ] Verificar que `WEBHOOK_URL` apunta a la URL pública real de Render (no ngrok)
- [ ] Verificar que `FRONTEND_URL` apunta a la URL real del frontend (no ngrok)
- [ ] Rotar todas las credenciales de prueba usadas en desarrollo
- [ ] Cambiar `API_BASE_URL` en paymentController.js de sandbox → producción Wompi
  - Archivo: `server/controllers/paymentController.js` línea 16
  - De: `https://sandbox.wompi.co/v1` → A: `https://production.wompi.co/v1`

## Seguridad — COMPLETADOS ✅
- [x] CORS abierto (origin: true) → condicional por NODE_ENV
      Fix: server/server.js — CORS restringido a FRONTEND_URL en producción
- [x] Idempotencia del webhook en memoria (Set) → migrado a DB (wompi_transaction_id)
      Fix: server/controllers/paymentController.js
- [x] Webhook sin guard de estructura → crash con payload malformado
      Fix: server/controllers/paymentController.js — validación previa al procesamiento
- [x] Reembolso sin validaciones de negocio → implementadas todas las reglas
      Fix: server/controllers/paymentController.js — bloqueo por 1h, picked_up, cancelado
- [x] Botón "Recoger Test" visible en producción → ahora solo en dev
      Fix: AppointmentCard.tsx — guard con import.meta.env.DEV
- [x] Penalización 24h bypasseable por fecha → ventana global de 24h
      Fix: server/controllers/appointmentController.js
- [x] user_id del webhook como string → casteado a ObjectId
      Fix: server/controllers/paymentController.js
- [x] CSP sin dominios de Wompi/Cloudinary → añadidos
      Fix: server/server.js
- [x] verify-code, forgot/reset-password sin rate limiting → aplicado
      Fix: server/routes/userRoutes.js
- [x] timeSlot sin validación → validado contra lista de 15 slots permitidos
      Fix: server/controllers/appointmentController.js
- [x] NODE_ENV=test en .env local → cambiado a development

## Pendiente — Race Condition (Segunda fase, no bloquea lanzamiento inicial)
- [ ] Race condition TOCTOU en asignación de casilleros simultáneos
      Requiere: transacciones MongoDB (session.startTransaction())
      Archivo: server/controllers/appointmentController.js — createAppointment()

## UI / UX
- [x] Botón "Recoger Test" condicionado a dev — desaparece en producción
- [ ] Eliminar o condicionarlo en producción si se desea remover permanentemente
      Archivo: client/src/pages/OrdersPage/components/AppointmentCard.tsx | Línea: 501

## Deuda Técnica (no bloquea pero debe resolverse pronto)
- [ ] Estandarizar campo contraseña → password en User.js (requiere migración DB)
- [ ] Corregir status codes de login: 400 → 401/404
- [ ] Reescribir AdminOrdersPage.css y AdminProductTestPage.css con min-width
- [ ] Notificación por email cuando vence un QR
- [ ] Implementar srcset para optimización de imágenes
- [ ] Agregar paginación en getMyAppointments (evitar respuestas enormes)
- [ ] Optimizar getAvailableTimeSlots: 15 queries → 1 con agregación

## Scripts de prueba a eliminar antes de producción
- [ ] Verificar y limpiar scripts en server/scripts/ que sean solo de prueba
- [x] Scripts de diagnóstico temporales eliminados: list_users.js, diag.js, list-users.js, deep_diag.js, check_db.js
- [ ] Mover/eliminar server/scripts/seed-test-data.js (script de datos de prueba)
- [ ] Revisar unlock-admin.js en raíz — mover a scripts/ o eliminar si ya no es necesario

---
Última actualización: 27/04/2026 — Auditoría integral completada
