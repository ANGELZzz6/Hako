# HAKO — AI Developer Context

This document provides a high-level technical and functional context for AI models collaborating on the **Hako** project. It outlines the core "brains" of the system, critical state machines, and the architectural philosophy.

---

## 1. System Essence
**Hako** is an automated retail-to-locker platform. It bridges the gap between a digital e-commerce store and physical 12-locker hardware.

*   **Primary Goal**: Completely eliminate manual intervention in product delivery using smart lockers.
*   **Unique Selling Point**: A complex **3D slot-calculation logic** that optimizes locker space usage.

---

## 2. Core Technical Concepts

### A. The Slot System (The Space Logic)
Each of the 12 lockers is modeled as a **3x3x3 grid (27 total slots)**. 
- **Business Rule**: Products have dimensions (Length, Width, Height) and occupy slots.
- **Critical File**: `server/models/LockerAssignment.js` and associated calculation helpers.
- **Logic**: A locker is considered "Available" for an appointment only if it can accommodate the total volume of all items in an order.

### B. Product Lifecycle (`Product` vs `IndividualProduct`)
- **`Product`**: The catalog blueprint (e.g., "Lavender Oil"). Defines base price and variants.
- **`IndividualProduct`**: A specific physical unit created **only after a successful payment**.
    - **Statuses**: `available` (ready to be reserved), `reserved` (linked to an appointment), `claimed` (scanned for pickup), `picked_up` (delivered), `returned` (refunded).

### C. The Wompi Payment Flow (Migration Finished)
The system uses **Wompi Web Checkout (Redirect Flow)**.
- **Flow**: Frontend calls `createPreference` -> Backend creates a `pending` Order -> Redirects to Wompi -> Webhook validates signature via `x-event-checksum` (SHA-256) -> Backend upgrades Order to `paid` and generates `IndividualProducts`.
- **Reference**: Follows the pattern `HAKO-{timestamp}-{userId}` to maintain idempotency.

---

## 3. Architecture & Tech Stack
- **Frontend**: React 18, TypeScript, Vite. (Strictly uses **Vanilla CSS** for premium look).
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB (Mongoose).
- **Automation**: `node-cron` for cleaning expired QR codes and resetting penalties.
- **Design System**: Harmonious HSL colors, modern typography (Inter/Montserrat), premium glassmorphism.

---

## 4. Business Rules "Cheat Sheet"
- **Appointment Windows**: Fixed 1-hour slots (08:00 - 22:00).
- **Refund Block**: Refunds are prohibited if the appointment starts in less than 1 hour.
- **Penalty Logic**: If a user misses an appointment without cancelling, they are blocked for 24 hours.
- **QR Codes**: Unique tokens generated per appointment, sent via Nodemailer.

---

## 5. Landmark Files (Where to Look)
- **`server/controllers/paymentController.js`**: The financial engine (Wompi, Refunds, Webhooks).
- **`server/controllers/appointmentController.js`**: The logistics engine (Slot calculation, availability).
- **`client/src/App.tsx`**: The main routing and global state (Auth, Cart).
- **`client/src/components/WompiCheckout.tsx`**: The gateway component.

---

## 6. How to help as an AI
1.  **Maintain AESTHETICS**: Never use browser default colors. Use the curated Hako palette.
2.  **Respect Type Safety**: Always use the defined interfaces in `client/src/types` or local definitions.
3.  **Trace the State**: When modifying orders, remember to update the corresponding `IndividualProduct` and `Appointment` records.
4.  **No Placeholders**: Always generate real assets or logic; avoid `// TODO` in critical paths.

---
*Last Technical Audit: 2026-04-04*
