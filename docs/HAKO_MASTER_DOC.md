# 箱 HAKO — Master Documentation

## 1. Business Overview

### What is Hako
Hako is an innovative store management system that integrates physical smart lockers (casilleros) with a digital online store. It provides a seamless experience for customers to browse products, select specific variants, purchase through secure digital payments, and schedule high-security pickups using QR codes.

### Target Audience
- **Retail Customers:** Looking for a convenient, secure way to pick up online purchases at any time.
- **Store Administrators:** Who need to manage inventory, product variants, and locker assignments without manual intervention.

### Value Proposition
- **Security:** Pickup is governed by unique, time-bound QR codes and real-time locker assignments.
- **Convenience:** 24/7-ready pickup system with automated notifications and reminders.
- **Optimized Space:** Advanced slot calculation logic (27 slots per locker) ensures lockers are used efficiently based on product dimensions.
- **Transparency:** Real-time monitoring for both users (order status) and admins (system health).

### How it works end to end
1. **Browse & Select:** User chooses products in the React frontend, selecting variants (size, color, etc.) that define dimensions.
2. **Secure Payment:** Checkout via Mercado Pago (Checkout Pro) unifies all payment methods in Colombia (PSE, Credit, Cash).
3. **Automated Inventory:** Upon payment, the system creates `IndividualProduct` records and clears the cart.
4. **Appointment Scheduling:** The user selects a date and a 1-hour time slot (available if at least one of 12 lockers is free).
5. **Locker Assignment:** Products are assigned to a locker based on a 27-slot volume calculation.
6. **QR Pickup:** A unique QR code is generated and emailed. The user scans it at the store to mark the items as "picked up".
7. **Completion:** Locker is liberated, and the appointment status changes to `completed`.

---

## 2. Technical Architecture

### Tech Stack
- **Frontend:** React, TypeScript, Vite, Vanilla CSS.
- **Backend:** Node.js, Express.js.
- **Database:** MongoDB (using Mongoose ODM).
- **Payment Gateway:** Wompi (Web Checkout Redirect flow).
- **Automation:** `node-cron` for scheduled cleanups and status updates.
- **3D Visualization:** Integrated locker viewer in the frontend.

### Project Folder Structure
- `/client`: React application (Vite-based).
- `/server`: Node.js API.
- `/server/models`: MongoDB schemas.
- `/server/controllers`: Business logic handlers.
- `/server/routes`: Endpoint definitions.
- `/docs`: Project documentation.

### Key Dependencies
- `axios`: For backend-to-Wompi communication.
- `crypto`: For Wompi Webhook signature validation.
- `qrcode`: Token-to-image generation for pickup.
- `node-cron`: Handles expired QRs and penalty resets.
- `nodemailer`: Email notifications for payments and QR delivery.
- `express-rate-limit`: Security for sensitive endpoints like product suggestions.

---

## 3. Business Rules & Logic

### Payment Flow Rules
- **Pre-Payment:** "Pending Order" created in DB with a unique reference before redirecting to Wompi.
- **Reference:** Every Wompi transaction must include a unique `reference` following the pattern `HAKO-{timestamp}-{userId}`.
- **Validation:** Only `APPROVED` status from Wompi (verified via SHA-256 checksum) triggers the creation of `IndividualProduct` and marks the order as `paid`.

### Refund Eligibility Rules
- **Timing:** Refund is blocked if the pickup appointment starts in less than 1 hour.
- **Status:** Cannot refund if the order or any individual product has already been marked as `picked_up`.
- **System Action:** Successful refund automatically cancels the corresponding order and individual products.

### Appointment/Reservation Rules
- **Slots:** Fixed 1-hour windows from 08:00 to 22:00.
- **Capacity:** Maximum of 12 appointments per hour (one per locker).
- **Modification:** Users can reschedule as long as the current slot hasn't started.

### Locker Assignment Rules
- **Volume Logic:** Each locker contains 27 virtual "slots" (3x3x3).
- **Optimization:** Products occupy slots based on their dimensions (largo, ancho, alto).
- **Constraints:** Total occupied slots per locker must be $\le 27$.

### User Roles and Permissions
- **User:** Can browse, buy, manage their own orders/appointments, and see their QR history.
- **Admin:** Can manage products, handle refunds, monitor system health via a dedicated dashboard, and use "Debug Mode" to troubleshoot flows.

### Penalty System Rules
- **Trigger:** Missing a scheduled appointment without cancellation.
- **Consequence:** 24-hour block from creating new reservations for that specific date.
- **Reset:** Automated via cron script (`cleanup-expired-penalties.js`) or upon login after 24 hours.

---

## 4. API Reference

### Products
- `GET /api/producto`: List all active products.
- `GET /api/producto/:id`: Product detail with variants.
- `POST /api/producto/admin`: (Admin) Create product.
- `PATCH /api/producto/admin/:id/toggle-status`: (Admin) Activate/Deactivate.

### Orders & Payments
- `POST /api/payment/create-preference`: Initiate Wompi Redirect flow.
- `POST /api/payment/webhook`: Handle async status updates from Wompi.
- `POST /api/payment/refund/:paymentId`: (Admin) Process Wompi Void/Refund with validation.

### Appointments
- `GET /api/appointment/available-slots`: Check availability per date.
- `POST /api/appointment`: Create new reservation.
- `PUT /api/appointment/:id/complete`: (Admin/System) Finalize pickup.

### QR System
- `POST /api/qr/generate/:appointmentId`: Create unique QR for pickup.
- `GET /api/qr/user`: User history of QR codes.

---

## 5. Data Models

### User (`User.js`)
Stores profile info, credentials, and `reservationPenalties`. Includes safety features like login attempt locking (5 attempts).

### Product (`Product.js`)
Base inventory item. Defines base dimensions and possible `variants`. Variants can override dimensions if flagged as `definesDimensions`.

### IndividualProduct (`IndividualProduct.js`)
Represents a physical unit owned by a user after payment. Tracks individual status (`available`, `reserved`, `claimed`, `picked_up`).

### Order (`Order.js`)
Financial record of a purchase. Links users to multiple products and tracks Mercado Pago transaction status.

### Appointment (`Appointment.js`)
Operational record. Links an Order to a specific `scheduledDate` and `timeSlot`. Tracks locker assignment.

### LockerAssignment (`LockerAssignment.js`)
The spatial record. Maps products to physical lockers using the slot-calculation system (max 27 slots).

---

## 6. Admin Panel Capabilities

- **Monitoring Dashboard:** Real-time visualization of system health and active assignments.
- **Refund Management:** Controlled refund tool with built-in business rule validation.
- **Site Editor:** Manage static content, destacados (featured products), and categories.
- **Support & Debug:** High-level access to recent errors, payment logs, and manual state overrides for stuck appointments.

---

## 7. Environment & Configuration

### Required .env Variables
- `WOMPI_PUBLIC_KEY_TEST / WOMPI_PRIVATE_KEY_TEST`: API keys for payments.
- `WOMPI_EVENTS_SECRET`: Secret for webhook SHA-256 validation.
- `MONGODB_URI`: Connection string.
- `FRONTEND_URL`: URL for redirection callbacks.
- `WEBHOOK_URL`: Public URL (ngrok in dev) for payment notifications.
- `JWT_SECRET`: Security key for user sessions.
- `EMAIL_USER / EMAIL_PASS`: Credentials for sending QR/Notification emails.

---

## 8. Known Issues & Pending Work

- **Security Hardening:** Current need to move all hardcoded keys to `.env` (Ongoing).
- **Environment Logic:** Ensure `NODE_ENV=production` is strictly enforced to disable debug buttons.
- **Testing:** Unit tests for slot-calculation logic are recommended.
- **ProductVariantManager:** Known UI/Logic inconsistencies identified in recent audits.


---
*Document generated on: 2026-03-30*

## Comandos de Diagnóstico en Terminal

### Verificar estado general de la DB
```javascript
node -e "
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
function loadEnv() {
  const content = fs.readFileSync(path.resolve(__dirname, '../../.env'), 'utf-8');
  const config = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...v] = trimmed.split('=');
    if (key && v.length > 0) config[key.trim()] = v.join('=').trim();
  });
  return config;
}
const env = loadEnv();
mongoose.connect(env.MONGODB_URI, { dbName: 'HAKO' }).then(async () => {
  const db = mongoose.connection.db;
  const cols = await db.listCollections().toArray();
  for (const col of cols) {
    const count = await db.collection(col.name).countDocuments();
    console.log(col.name.padEnd(25), ':', count);
  }
  await mongoose.disconnect();
}).catch(e => console.error(e.message));
"
```

### Verificar datos de un usuario específico
```javascript
node -e "
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
function loadEnv() {
  const content = fs.readFileSync(path.resolve(__dirname, '../../.env'), 'utf-8');
  const config = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...v] = trimmed.split('=');
    if (key && v.length > 0) config[key.trim()] = v.join('=').trim();
  });
  return config;
}
const env = loadEnv();
const EMAIL = 'test@gmail.com';
mongoose.connect(env.MONGODB_URI, { dbName: 'HAKO' }).then(async () => {
  const db = mongoose.connection.db;
  const user = (await db.collection('usuarios').find({ email: EMAIL }).toArray())[0];
  if (!user) { console.log('Usuario no encontrado'); process.exit(0); }
  console.log('Usuario:', user.email, '| ID:', user._id);
  const appts = await db.collection('appointments').find({ user: user._id }).sort({ createdAt: -1 }).toArray();
  console.log('Reservas totales:', appts.length);
  appts.forEach(a => console.log(' -', a.status, '|', a.scheduledDate, '| items:', a.itemsToPickup?.length || 0));
  const prods = await db.collection('individualproducts').find({ user: user._id }).toArray();
  console.log('Productos individuales:', prods.length);
  prods.forEach(p => console.log(' -', p.status, '|', p._id));
  await mongoose.disconnect();
}).catch(e => console.error(e.message));
"
```
