# 🌿 Mother Best — Home Care Platform

A full-stack home care and delivery management platform built with **React + TypeScript + Vite** and powered by **InsForge** as the backend.

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS 3.4 |
| Routing | React Router DOM v7 |
| Maps | React Leaflet, Google Maps API |
| Charts | Recharts |
| Backend | InsForge (PostgreSQL + Auth + Storage + Realtime) |
| AI | InsForge AI integration |

---

## 🗂️ Project Structure

```
MOTHER_BEST/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── Layout.tsx
│   │   ├── UserAuth.tsx / UserAuthEnhanced.tsx
│   │   ├── ProfileMobile.tsx
│   │   ├── ShopMobile.tsx
│   │   ├── OrdersMobile.tsx
│   │   ├── CheckoutMobile.tsx
│   │   ├── NotificationBell.tsx
│   │   ├── ImageCropper.tsx
│   │   ├── AddressForm.tsx
│   │   ├── AnalyticsDashboard.tsx
│   │   └── OrderSuccessMobile.tsx
│   ├── pages/             # Full pages / views
│   │   ├── LandingPage.tsx / LandingPageMobile.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── DeliveryDashboard.tsx
│   │   ├── SalesDashboard.tsx
│   │   ├── AuthPage.tsx
│   │   ├── AdminLogin.tsx
│   │   ├── ProductHub.tsx
│   │   ├── CheckoutPage.tsx
│   │   ├── AutoDeliveryPage.tsx
│   │   ├── ManageSubscriptionPage.tsx
│   │   ├── OrderHistoryPage.tsx
│   │   └── OrderSuccessPage.tsx
│   ├── contexts/          # React contexts (auth, cart, etc.)
│   ├── services/          # API service helpers
│   ├── lib/               # InsForge client & utilities
│   ├── types/             # TypeScript type definitions
│   ├── tests/             # Unit/integration tests
│   ├── App.tsx            # Root app component & routing
│   └── index.tsx          # App entry point
├── database/              # SQL schema files
│   └── schema.sql
├── design-mockups/        # UI design mockups (HTML previews)
├── docs/                  # Project documentation
├── scripts/               # Utility / admin scripts
├── public/                # Static assets
├── .env.local             # Environment variables (not committed)
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the project root:

```env
VITE_INSFORGE_URL=https://your-app.region.insforge.app
VITE_INSFORGE_ANON_KEY=your-anon-key-here
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🏗️ Build for Production

```bash
npm run build
```

---

## 🔐 User Roles

| Role | Access |
|---|---|
| Customer | Shop, orders, profile, subscriptions |
| Delivery Agent | Delivery dashboard with real-time map |
| Admin | Full admin dashboard, analytics, COD management |
| Sales | Sales dashboard |

---

## 📊 Key Features

- **Mobile-first** responsive UI
- **Real-time delivery tracking** with Leaflet maps
- **Subscription management** for recurring deliveries
- **Admin dashboard** with order board, analytics, logistics hub
- **COD management** & reconciliation
- **Profile management** with photo upload
- **Address book** with GPS location detection
- **Notification system**

---

## 📄 License

Private repository — All rights reserved.
