# Technical Requirements Document (TRD)
## Hulk Gym Web App
**Version:** 2.0 · **Last updated:** 22 October 2026

---

## 1. Architecture

```
Browser (React SPA on Netlify)
   │  HTTPS · JSON · Authorization: Bearer <access token>
   │  refresh token = httpOnly cookie (cross-site, SameSite=None in production)
   ▼
API (Express 5 on Render) ── MongoDB Atlas
   │
   ├── Razorpay  (orders, checkout verification, webhooks, refunds)
   ├── Brevo     (transactional email over HTTPS API; Gmail SMTP fallback locally)
   └── Cloudinary(profile photos, 400×400)
```

Layering in the backend: **routes → middleware → controllers → services → models**. Constants (statuses, limits, prefixes) live in `src/utils/constants.js`. Every error is an `ApiError` handled by one error middleware; every success uses `ApiResponse`:

```json
{ "success": true,  "statusCode": 200, "message": "…", "data": { } }
{ "success": false, "statusCode": 400, "message": "…", "errors": [ ] }
```

---

## 2. Backend

### 2.1 Request pipeline (`src/app.js`, in order)
1. `trust proxy` = `TRUST_PROXY` (default 1) — Render's load balancer; needed for real client IPs
2. Helmet (security headers)
3. CORS allowlist from `CLIENT_URL` (comma-separated), credentials on
4. `/api/v1/webhooks` with **raw** body (Razorpay signature needs exact bytes)
5. `express.json` / `urlencoded` (10 kb limit) → cookie-parser
6. Body sanitizer — strips keys starting with `$` (runs after parsing)
7. Global rate limit on `/api/v1` (1000 req / 15 min / IP)
8. Routers → 404 → error handler (Mongoose, JWT, malformed/oversized body → 400/413, else 500)

### 2.2 Authentication
- **Access token:** JWT HS256, 15 min, payload `{ sub, role, sessionId }`, verified with a pinned algorithm.
- **Refresh token:** random 64-byte value in an httpOnly cookie; only its SHA-256 hash is stored in `sessions`. 30-day expiry, max 2 active devices (oldest revoked).
- **Session guard:** every protected route checks the session is still active, so logout/revoke takes effect immediately.
- **OTP:** 6 digits, SHA-256 hashed, 10 min, 3 attempts then a new code is emailed, 60 s resend cooldown.
- **Password reset:** OTP verification issues a random reset token (hash stored on the OTP document, 15 min, single use). `/reset-password` requires it; success deletes the OTPs and revokes all sessions.
- **Passwords:** bcrypt cost 12; temp registrations store only the hash.

### 2.3 Rate limits (`middleware/rateLimiter.middleware.js`)
| Route | Limit | Keyed by |
|---|---|---|
| login | 10 failed / 15 min (successes not counted) | IP + email |
| register | 10 / 15 min | IP |
| forgot-password | 5 / 15 min | IP + email |
| reset-password | 10 / 15 min | IP + email |
| OTP verify/resend | 10 / 10 min | IP + email |
| change-password, delete account | 10 / 15 min | IP |
| everything under /api/v1 | 1000 / 15 min | IP |

### 2.4 Payments (Razorpay)
- **Price is server-side:** `initiate` takes only `planId` + `durationDays`; amount comes from the plan (offer price if valid). Amounts are integers in **paise**.
- **Order reuse:** an open order for the same plan/tier/amount within 30 min is reused (no duplicate orders on double click).
- **Activation paths (idempotent):** checkout `verify` (HMAC of `order|payment` with key secret, timing-safe compare, ownership checked first) and webhook `payment.captured` / `order.paid` (HMAC of raw body with webhook secret). Both call `completeOnlinePayment`, which uses an atomic status transition so a payment is activated once.
- **Recovery:** before creating a new order, open orders from the last 3 days are checked with Razorpay; a paid one is completed instead of charging again.
- **Duplicates:** if the member already has an active plan, the payment becomes `refund_due`, the new subscription is cancelled and the member is emailed.
- **Refunds:** admin endpoint locks the payment atomically, calls `payments.refund` (full amount, normal speed), handles "already refunded", records refund id/status, emails the member.
- **Plan snapshot:** each subscription stores the plan name, tier, price and features at purchase time, so later plan edits never change history.

### 2.5 Offline payments & installments
Admin can record full, partial (with an installment schedule) or complimentary memberships. Each money event creates a **receipt** (`HLK-YYYY-NNNNN`, from an atomic yearly counter) and emails it. Balance collection is applied to the oldest unpaid installments first.

### 2.6 Scheduled job
`jobs/subscriptionReminder.job.js` — node-cron `0 8 * * *` in Asia/Kolkata (8:00 AM IST): reminder emails at 7/3/1 days, active → grace → expired, pending → overdue installments. On Render's free tier the server must be awake for the job to run (UptimeRobot keeps it awake).

### 2.7 Start-up migrations (`config/migrations.js`, idempotent)
- Make `payments.receiptNumber` index unique + sparse
- Seed this year's receipt counter above the highest existing number
- Number plans 1..n for display order (first run only)

### 2.8 Email
`services/email/transporter.js` sends through Brevo's HTTPS API when `BREVO_API_KEY` is set (Render blocks SMTP), otherwise Gmail SMTP for local dev; `SKIP_EMAIL=true` logs instead of sending. Templates: OTPs, receipts, complimentary activation, duplicate payment, refund initiated, expiry reminders.

### 2.9 Uploads
Multer memory storage (JPG/PNG/WebP, 5 MB) → streamed to Cloudinary (400×400 face crop). Old photo deleted on replace/remove/account deletion.

---

## 3. Frontend

- **Build:** Vite 8 + `@vitejs/plugin-react`, Tailwind 4 (preflight only), custom `seo.plugin.js` (JSON-LD, crawlable fallback HTML, font preloads, sitemap, robots). Routes are code-split with `React.lazy`.
- **State:** Zustand auth store; access token kept in memory only. `useAuthInit` restores the session on load via `/auth/refresh-token`.
- **HTTP:** axios instance with `withCredentials`, bearer header, and a 401 → refresh → retry queue.
- **Forms:** react-hook-form; client rules mirror server Joi rules.
- **SEO per route:** `applySeo` in `App.jsx` sets title, description, canonical, og:url, robots (private pages `noindex`).
- **Content as data:** `content/gymContent.js` (facilities, amenities, FAQ, hours, `show` flags) and `content/legal.js` (policies). Contact details come only from `VITE_*` env vars via `utils/gymConfig.js`; empty = hidden.
- **Motion:** 2D canvas ember background (no three.js), Framer Motion; everything respects `prefers-reduced-motion`.
- **Netlify:** `public/_headers` (immutable cache for `/assets`, nosniff, frame and referrer policy), SPA redirect in `public/_redirects`.

---

## 4. Environments

| | Testing | Production (planned) |
|---|---|---|
| Frontend | hulk-gym-kota-test.netlify.app | gym domain on Netlify |
| Backend | hulk-gym-backend.onrender.com | Render (same or new service) |
| Database | Atlas (test data) | **new** Atlas database — no test data |
| Razorpay | test keys | live keys + live webhook |
| Email | Brevo | Brevo with verified sender domain |

---

## 5. Security review (22 Oct 2026)

Tested against the testing server:

| Attack | Result |
|---|---|
| Admin/member APIs without login | 401 everywhere |
| Forged JWT (`alg: none`, wrong signature) | 401 |
| NoSQL operators in login / forgot password | 400 |
| Spoofed Razorpay webhook / payment signature | 400 / 401 |
| Changing price, plan or role from the browser | Ignored — server decides |
| Reading the API from another website (CORS) | Blocked by browser |
| **Password reset without OTP** | **Was possible — fixed** with single-use reset token |
| **Rate limit shared by all users behind Render proxy** | **Fixed** with `trust proxy` + per-route IP+email limits |
| Body sanitizer ran before parsing (no effect) | Fixed |
| OTP printed in server logs | Removed |
| Admin plan routes without session check | Fixed |
| Malformed / huge JSON returned 500 | Now 400 / 413 |

Still recommended before scale: Content-Security-Policy header, refresh-token rotation, MongoDB backups, an error-alert channel (Render logs or Sentry).
