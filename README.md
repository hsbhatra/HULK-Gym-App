# Hulk Gym — Membership & Payments Web App

Website and membership system for **Hulk Gym, Nayapura, Kota**. Members join online, pay with Razorpay (or at the desk), and see their membership, installments and receipts. The gym runs everything from an admin panel: plans, members, cash payments, installments and refunds.

- **Testing site:** https://hulk-gym-kota-test.netlify.app (Razorpay test mode)
- **API (testing):** https://hulk-gym-backend.onrender.com/api/v1
- **Built by:** Himanshu Sharma

---

## Features at a glance

**Public website**
- Landing page with real gym info (facilities, amenities, hours with live "Open now" status, map, FAQ), membership plans, contact page
- Terms, Privacy and Refund policies (DPDP Act 2023 aligned)
- SEO: per-page titles, JSON-LD (ExerciseGym, FAQ), sitemap, share image

**Members**
- Sign up with email OTP, age confirmation and terms consent
- Buy a plan online (Razorpay: UPI, card, net banking) — instant activation + emailed receipt
- Profile, photo, active devices, change password, delete account
- Membership tab: current plan, installments, receipts

**Admin**
- Dashboard: active members, revenue, expiring soon, pending installments
- Plans: create/edit, pricing tiers & offers, activate/deactivate/archive, **drag-and-drop display order**
- Members: search, profile, record cash/UPI payment with installments, collect balance, cancel
- Refunds: one-click Razorpay refund for duplicate payments, with history

**Automatic**
- Daily 8 AM IST job: expiry reminders (7/3/1 days), grace → expired, overdue installments
- Receipt numbers (`HLK-2026-00001`), member IDs (`hulkgym_0001`)

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 8, React Router 7, Zustand, Framer Motion, react-hook-form, Recharts, lucide-react, Tailwind 4 (preflight) |
| Backend | Node.js (ES modules), Express 5, Mongoose 9, Joi, bcryptjs, JWT, Helmet, express-rate-limit, node-cron |
| Database | MongoDB Atlas |
| Services | Razorpay (payments), Brevo (email), Cloudinary (photos) |
| Hosting | Netlify (frontend), Render (backend), UptimeRobot (keep-alive) |

---

## Quick start (local)

```bash
# Backend
cd backend
npm install
cp .env.example .env      # fill in values — see docs/PROJECT_SETUP_GUIDE.md
npm run dev               # http://localhost:8000  (health: /api/health)

# Frontend
cd frontend
npm install
cp .env.example .env
npm run dev               # http://localhost:5173
```

---

## Documentation

| Doc | What's inside |
|---|---|
| [docs/PRD.md](docs/PRD.md) | What the product does, for whom, scope |
| [docs/TRD.md](docs/TRD.md) | Architecture, security, payments, infra |
| [docs/APP_FLOW.md](docs/APP_FLOW.md) | Step-by-step user and admin flows |
| [docs/BACKEND_SCHEMA.md](docs/BACKEND_SCHEMA.md) | Collections, fields, indexes, API list |
| [docs/UI_UX_BRIEF.md](docs/UI_UX_BRIEF.md) | "Molten Iron" design system and content rules |
| [docs/PROJECT_SETUP_GUIDE.md](docs/PROJECT_SETUP_GUIDE.md) | Accounts, env vars, local setup, deployment, go-live checklist |
| [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) | Status, testing checklist, open items, roadmap |

---

## Project structure

```
Hulk Gym App/
├── backend/src/
│   ├── config/        DB, Cloudinary, Razorpay, start-up migrations
│   ├── controllers/   request handlers (auth/, admin, plan, profile, subscription, webhook)
│   ├── jobs/          daily reminder / expiry job
│   ├── middleware/    auth, validation (Joi), rate limits, upload, errors
│   ├── models/        Mongoose schemas
│   ├── routes/        Express routers
│   ├── services/      business logic, email templates
│   └── utils/         constants, ApiError/ApiResponse
├── frontend/src/
│   ├── components/    layout, ui, profile, admin, background canvas
│   ├── content/       gymContent.js (facilities, hours, FAQ) · legal.js (policies)
│   ├── pages/         public, auth, profile, admin, legal
│   ├── services/      API calls (axios with auto token refresh)
│   ├── store/         Zustand auth store
│   └── utils/         gymConfig (env contacts), hours, animations
├── frontend/seo.plugin.js   build-time SEO (JSON-LD, sitemap, robots)
├── docs/
└── netlify.toml
```

---

## Scripts

| Where | Command | Does |
|---|---|---|
| backend | `npm run dev` | start with nodemon |
| backend | `npm start` | production start |
| frontend | `npm run dev` | Vite dev server |
| frontend | `npm run build` | production build (needs `VITE_SITE_URL`) |
| frontend | `npm run lint` | ESLint |

---

© Hulk Gym, Kota. Built by Himanshu Sharma.
