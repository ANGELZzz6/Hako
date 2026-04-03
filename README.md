# Hako — Beauty Salon Platform

A comprehensive management system for beauty salons that integrates a public booking website with a robust administration dashboard. This platform automates the appointment scheduling process, manages salon services (products), and provides real-time monitoring of salon operations.

## Project Overview

Hako is designed to streamline the interaction between salon owners, specialists, and clients. It provides a seamless digital experience for booking beauty services, managing professional schedules, and handling secure payments.

**Target Users:**
*   **Salon Owners:** For complete business oversight, revenue tracking, and system configuration.
*   **Specialists:** To manage their availability and view upcoming appointments.
*   **Clients:** To browse services, book appointments, and manage their personal booking history.

**Core Value:** 
Automation of the entire booking lifecycle, from initial service selection and secure payment to appointment scheduling and automated notifications, reducing manual administrative overhead and improving customer satisfaction.

## Features

### Public Website
*   **Service Catalog:** Browse beauty services with detailed descriptions, pricing, and category filtering.
*   **Featured Services:** Highlighted treatments on the landing page for better visibility.
*   **Client Profile:** Secure user accounts with booking history and personal settings.
*   **Responsive Design:** Optimized for both desktop and mobile devices.

### Booking System
*   **Real-time Availability:** Dynamic time slot calculation (1-hour windows from 08:00 to 22:00) with conflict prevention.
*   **Secure Checkout:** Integrated payment flow via Mercado Pago (Checkout Pro) supporting multiple payment methods (PSE, Credit, Cash).
*   **QR Identification:** Automated generation of unique QR codes for appointment verification and check-in.
*   **Automated Reminders:** Email notifications for booking confirmation and payment success.

### Admin Dashboard
*   **Appointment Management:** Real-time visualization and status control (Scheduled, Confirmed, Completed, Cancelled).
*   **Service & Specialist Management:** Tools to add, edit, or deactivate services and manage specialists.
*   **System Monitoring:** Dashboard to track system health, active assignments, and recent errors.
*   **Content Editor:** Manage site-wide text, featured banners, and promotional messages without code changes.
*   **Refund Management:** Integrated refund processing with built-in business rule validation (e.g., block refunds if appointment starts in < 1 hour).

### Notifications & Integrations
*   **Mercado Pago:** Secure payment gateway integration.
*   **Nodemailer:** Automated email system for transaction and booking alerts.
*   **Google OAuth:** One-click social login for faster client registration.

## Tech Stack

*   **Frontend:** React 18, TypeScript, Vite, Vanilla CSS, Bootstrap (for layout).
*   **Backend:** Node.js, Express.js.
*   **Database:** MongoDB with Mongoose ODM.
*   **Authentication:** JWT (JSON Web Tokens) & Google OAuth 2.0.
*   **Payments:** Mercado Pago v1 SDK.
*   **Automation:** `node-cron` for scheduled background tasks.

## Project Structure

```text
/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page-level components (Admin, Booking, etc.)
│   │   ├── services/       # API client abstractions
│   │   └── contexts/       # Global state management (Auth, Cart, Settings)
├── server/                 # Node.js Express backend
│   ├── controllers/        # Business logic handlers
│   ├── models/             # MongoDB/Mongoose schemas
│   ├── routes/             # API endpoint definitions
│   ├── middleware/         # Security and authentication guards
│   └── services/           # External service integrations (Email, Payments)
└── docs/                   # Project documentation and master files
```

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd hako
```

### 2. Install dependencies
Install root, client, and server dependencies:
```bash
npm install
cd client && npm install
cd ../server && npm install
```

### 3. Environment Variables
Create a `.env` file in the root and `server` directories based on the provided templates (see Environment Variables section).

### 4. Run the project
**Development Mode:**
```bash
# In the root directory
npm run dev
```

**Production Mode:**
```bash
npm start
```

## Environment Variables

The system requires the following environment variables:

| Variable | Description |
| :--- | :--- |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for session tokens |
| `MERCADOPAGO_ACCESS_TOKEN` | Mercado Pago API access token |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `FRONTEND_URL` | Base URL of the frontend application |
| `WEBHOOK_URL` | Public URL for Mercado Pago async notifications |
| `EMAIL_USER` | SMTP username for notifications |
| `EMAIL_PASS` | SMTP password for notifications |
| `MP_CLIENT_ID` | Mercado Pago OAuth Client ID (for testing) |
| `MP_CLIENT_SECRET` | Mercado Pago OAuth Client Secret (for testing) |
| `API_BASE_URL` | Base URL of the API for testing scripts |

## Usage

### Client Flow
1.  **Selection:** Browse services and add them to the "Box" (Cart).
2.  **Payment:** Proceed to checkout via Mercado Pago secure platform.
3.  **Booking:** Choose a date and time slot for the appointment.
4.  **Confirmation:** Receive a QR code via email for identification at the salon.

### Admin Flow
1.  **Monitoring:** View active appointments and system health from the Dashboard.
2.  **Inventory:** Manage services and adjust pricing or availability.
3.  **Support:** Respond to customer suggestions and manage support tickets.
4.  **Override:** Manually update appointment statuses or process refunds when necessary.

## API Endpoints

### Services (Products)
*   `GET /api/products`: List all active services.
*   `POST /api/products/admin`: (Admin) Create a new service.

### Appointments
*   `GET /api/appointments/available-slots/:date`: Check availability.
*   `POST /api/appointments`: Create a new booking.
*   `GET /api/appointments/my-appointments`: View personal history.

### Payments
*   `POST /api/payment/create-preference`: Initiate checkout.
*   `POST /api/payment/webhook`: Handle payment status updates.

## Deployment

*   **Frontend:** Recommendations for Vercel or Netlify.
*   **Backend:** Recommendations for Heroku, Railway, or Render.
*   **Database:** MongoDB Atlas is recommended for production.
*   **Testing:** Node.js environment for integration scripts.

## Integration Testing

The project includes a comprehensive integration test suite to validate the end-to-end payment lifecycle, from preference creation to administrative refunds.

### Payment Flow Validation
This script simulates a complete purchase using Mercado Pago's sandbox:
1.  Admin authentication.
2.  Product retrieval and cart management.
3.  Preference creation.
4.  Automated 'TEST-' token retrieval via OAuth.
5.  Sandbox payment simulation (approved status).
6.  Webhook processing and Order creation verification.
7.  Administrative refund and order cancellation flow.

**Run the test:**
```bash
# Ensure ngrok is running and WEBHOOK_URL is updated in .env
node server/scripts/test-payment-flow.js
```

## Future Improvements

*   **SaaS Integration:** Multi-salon support with tenant isolation.
*   **Advanced Analytics:** Revenue forecasting and specialist performance metrics.
*   **Mobile App:** Dedicated iOS/Android applications for better push notifications.
*   **AI Chatbot:** Automated customer support for FAQs and appointment rescheduling.