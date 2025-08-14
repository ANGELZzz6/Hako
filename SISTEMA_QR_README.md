# Sistema de Códigos QR para Recogida - Hako Store

## Descripción General

Este sistema implementa códigos QR únicos para la recogida de productos en la tienda Hako Store. Cada código QR está asociado a una reserva específica y permite a los usuarios recoger sus productos de forma segura y eficiente.

## Características Principales

### 🔐 Seguridad
- **QR Único**: Cada código QR tiene un identificador único generado automáticamente
- **Asociación con Reserva**: El QR está vinculado a una cita específica y orden
- **Estado Controlado**: Los QR tienen estados (disponible, vencido, recogido)
- **Vencimiento Automático**: Los QR se marcan como vencidos cuando expira la cita

### 📧 Notificaciones
- **Email Automático**: Se envía un email con el código QR al usuario
- **Una Sola Vez**: El email se envía solo cuando se genera el QR
- **Instrucciones Claras**: El email incluye instrucciones de uso

### 🎯 Funcionalidades del Usuario
- **Generar QR**: Botón disponible en reservas activas
- **Ver QR**: Modal que muestra el código QR generado
- **Historial**: Vista de todos los QR generados por el usuario
- **Estados**: Visualización clara del estado de cada QR

## Arquitectura del Sistema

### Backend (Node.js + Express)

#### Modelos
- **`qrModel.js`**: Esquema de MongoDB para los códigos QR
- **`Appointment.js`**: Modelo de citas (ya existente)
- **`Order.js`**: Modelo de órdenes (ya existente)

#### Controladores
- **`qrController.js`**: Lógica de negocio para manejo de QR
  - Generar QR
  - Obtener información del QR
  - Marcar como recogido
  - Obtener QRs del usuario

#### Servicios
- **`notificationService.js`**: Envío de emails con códigos QR
- **`scheduledTasks.js`**: Tareas programadas para actualizar estados

#### Rutas
- **`/api/qr/generate/:appointmentId`**: Generar QR para una cita
- **`/api/qr/info/:qrId`**: Obtener información de un QR
- **`/api/qr/pickup/:qrId`**: Marcar QR como recogido (admin)
- **`/api/qr/user`**: Obtener QRs del usuario

### Frontend (React + TypeScript)

#### Servicios
- **`qrService.ts`**: Cliente para comunicación con la API de QR

#### Componentes
- **`AppointmentCard.tsx`**: Botón QR en tarjetas de reserva
- **`QRHistory.tsx`**: Historial de códigos QR del usuario

## Flujo de Uso

### 1. Generación del QR
1. Usuario tiene una reserva activa
2. Hace clic en el botón "QR" en la tarjeta de reserva
3. Sistema genera código QR único
4. Se envía email con el código QR
5. Se muestra modal con el QR generado

### 2. Uso del QR
1. Usuario llega a la tienda en la fecha/hora de su cita
2. Muestra el código QR al personal
3. Personal escanea el código
4. Sistema marca QR como "recogido"
5. Reserva se mueve a "completados"

### 3. Estados del QR
- **Disponible**: QR activo y válido para uso
- **Vencido**: La cita ha expirado, QR no válido
- **Recogido**: Productos ya fueron recogidos

## Instalación y Configuración

### Dependencias del Servidor
```bash
cd server
npm install qrcode node-cron
```

### Variables de Entorno
```env
# Configuración de email para envío de QR
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-password-app
```

### Base de Datos
El sistema crea automáticamente la colección `qrs` en MongoDB con el esquema definido.

## Tareas Programadas

### Actualización de Estados
- **QRs Vencidos**: Se actualizan cada hora
- **Limpieza**: Se eliminan QRs antiguos (30+ días) cada día a las 2:00 AM

### Configuración
```javascript
// Actualizar QRs vencidos cada hora
cron.schedule('0 * * * *', updateExpiredQRs);

// Limpiar QRs antiguos cada día a las 2:00 AM
cron.schedule('0 2 * * *', cleanupOldQRs);
```

## Seguridad y Validaciones

### Validaciones del Backend
- Usuario solo puede generar QR para sus propias citas
- Verificación de que la cita no esté vencida
- Un solo QR por cita
- Solo admins pueden marcar QR como recogido

### Validaciones del Frontend
- Botón QR solo visible en reservas activas
- Verificación de estado antes de mostrar QR
- Manejo de errores en la generación

## Casos de Uso

### Caso 1: Usuario Normal
- Genera QR para su reserva
- Recibe email con el código
- Usa el QR en la tienda para recoger productos

### Caso 2: Admin
- Escanea QR del usuario
- Confirma recogida en el sistema
- Sistema actualiza estados automáticamente

### Caso 3: QR Vencido
- Sistema detecta vencimiento automáticamente
- Estado cambia a "vencido"
- Usuario debe generar nuevo QR si necesita

## Mantenimiento

### Logs del Sistema
- Generación de QR
- Cambios de estado
- Errores en el proceso
- Tareas programadas ejecutadas

### Monitoreo
- Estado de QRs activos
- QRs vencidos pendientes de limpieza
- Errores en envío de emails

## Futuras Mejoras

### Funcionalidades Adicionales
- **QR Dinámico**: Actualización en tiempo real del estado
- **Notificaciones Push**: Alertas cuando el QR está próximo a vencer
- **Analytics**: Estadísticas de uso de QR
- **Integración con Apps**: Escaneo desde app móvil

### Optimizaciones
- **Cache de QR**: Almacenamiento en memoria para QRs frecuentes
- **Compresión de Imágenes**: Optimización del tamaño de QR
- **CDN**: Distribución global de códigos QR

## Soporte Técnico

Para problemas o consultas sobre el sistema de QR:
1. Revisar logs del servidor
2. Verificar estado de la base de datos
3. Comprobar configuración de email
4. Validar permisos de usuario

---

**Desarrollado para Hako Store**  
*Sistema de Códigos QR para Recogida de Productos*
