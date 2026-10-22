# Project Setup & Deployment Guide
## Hulk Gym Web App
**Last updated:** 22 October 2026

---

## 1. Accounts you need

| Service | Used for | Notes |
|---|---|---|
| MongoDB Atlas | database | free M0 cluster is enough to start; separate DB for production |
| Razorpay | online payments | test keys work instantly; live keys need KYC |
| Brevo | emails (OTP, receipts, reminders) | free plan ~300 emails/day; verify a sender |
| Cloudinary | profile photos | free plan |
| Netlify | frontend hosting | connect the Git repo |
| Render | backend hosting | free web service |
| UptimeRobot | keeps Render awake | ping `/api/health` every 5 min |

---

## 2. Local setup

Requirements: Node.js 20+ (22 recommended), npm 10+, Git.

```bash
git clone <repo-url> "Hulk Gym App"
cd "Hulk Gym App"

# Backend
cd backend
npm install
cp .env.example .env         # fill values (section 3)
npm run dev                  # → http://localhost:8000/api/health  {"success":true,…}

# Frontend (new terminal)
cd frontend
npm install
cp .env.example .env
npm run dev                  # → http://localhost:5173
```

**First admin:** register normally, then in Atlas set that user's `role` to `"admin"`. Log out and in again.

**Local payments:** Razorpay test keys + test UPI `success@razorpay` / `failure@razorpay`. To receive webhooks locally use ngrok and point a test webhook at `https://<ngrok>/api/v1/webhooks/razorpay` (checkout verify works without it).

---

## 3. Environment variables

### 3.1 Backend (`backend/.env`, Render → Environment)
| Key | Example / note |
|---|---|
| PORT | 8000 (Render sets its own) |
| NODE_ENV | `development` locally, **`production` on Render** |
| TRUST_PROXY | 1 (Render) |
| CLIENT_URL | `http://localhost:5173` · testing/production site URL(s), comma-separated |
| MONGO_URI | Atlas connection string |
| ACCESS_TOKEN_SECRET | 64+ random chars (different per environment) |
| GYM_NAME / GYM_USER_ID_PREFIX / GYM_RECEIPT_PREFIX | Hulk Gym / hulkgym / HLK |
| RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET | test or live pair |
| RAZORPAY_WEBHOOK_SECRET | the secret you set on the webhook |
| BREVO_API_KEY / BREVO_SENDER_EMAIL | required on Render |
| EMAIL_USER / EMAIL_PASS | Gmail fallback for local dev only |
| SKIP_EMAIL | `true` to log emails instead of sending |
| CLOUDINARY_CLOUD_NAME / _API_KEY / _API_SECRET | |

### 3.2 Frontend (`frontend/.env`, Netlify → Site configuration → Environment variables)
All `VITE_*` values are public (they go into the browser bundle) — never put secrets here. Empty contact values are hidden on the site.

| Key | Note |
|---|---|
| VITE_API_URL | `http://localhost:8000/api/v1` · `https://<render-app>.onrender.com/api/v1` |
| VITE_SITE_URL | public site URL — canonical links, sitemap, share image (**required at build**) |
| VITE_GYM_NAME, VITE_GYM_CITY | HULK GYM, Kota |
| VITE_GYM_PHONE, VITE_GYM_WHATSAPP | `+91…`; WhatsApp only if different |
| VITE_GYM_EMAIL | leave empty until the mailbox exists |
| VITE_GYM_INSTAGRAM_URL, VITE_GYM_ADDRESS, VITE_GYM_MAPS_URL | maps URL optional |
| VITE_DEV_NAME, VITE_DEV_PHONE, VITE_DEV_WHATSAPP, VITE_DEV_EMAIL, VITE_DEV_URL | footer developer credit |

Opening hours, facilities, amenities and FAQ are **not** env vars — edit `frontend/src/content/gymContent.js`. Policy text: `frontend/src/content/legal.js` (update `LAST_UPDATED`, and `LEGAL_VERSION` in `backend/src/utils/constants.js` when terms change).

---

## 4. Deployment

### 4.1 Backend on Render
1. New **Web Service** from the repo · Root directory `backend` · Build `npm install` · Start `npm start`
2. Add all backend env vars (section 3.1), `NODE_ENV=production`
3. Deploy → open `https://<app>.onrender.com/api/health`
4. UptimeRobot: HTTP monitor on that URL every 5 min (keeps the daily 8 AM job running)

### 4.2 Frontend on Netlify
1. Import the repo — `netlify.toml` sets base `frontend`, build `npm run build`, publish `dist`
2. Add all `VITE_*` vars, then **Clear cache and deploy** (env changes need a rebuild)
3. `public/_redirects` handles SPA routes; `public/_headers` sets caching and security headers

### 4.3 Razorpay webhook
Dashboard → Settings → Webhooks → Add: URL `https://<render-app>.onrender.com/api/v1/webhooks/razorpay`, events **payment.captured, order.paid, payment.failed**, a strong secret → same value in `RAZORPAY_WEBHOOK_SECRET`. Test-mode and live-mode webhooks are separate.

---

## 5. Go-live checklist (testing → production)

**Data & accounts**
- [ ] New Atlas database (or cluster) for production; production `MONGO_URI` on Render
- [ ] New `ACCESS_TOKEN_SECRET` for production
- [ ] Register the owner's admin account on production and set `role: "admin"`
- [ ] Create the real plans and arrange their order (Admin → Plans)

**Payments**
- [ ] Razorpay KYC complete → live `RAZORPAY_KEY_ID` / `_SECRET`
- [ ] Live-mode webhook created with its own secret
- [ ] One small real payment end to end, then refund it from Admin → Refunds

**Email & domain**
- [ ] Gym email created → `VITE_GYM_EMAIL`
- [ ] Brevo sender verified (SPF + DKIM on the domain) → `BREVO_SENDER_EMAIL`
- [ ] Custom domain on Netlify (HTTPS auto) → update `VITE_SITE_URL` and Render `CLIENT_URL`

**Content**
- [ ] Owner confirmed: free trial, refund/cancellation rules (edit `legal.js` if different), hours, address, maps link
- [ ] Real photos (optional)

**After launch**
- [ ] Submit `https://<domain>/sitemap.xml` in Google Search Console
- [ ] Add the website to the Google Business Profile
- [ ] Atlas backups on; check Render logs and Admin → Refunds daily for the first week

---

## 6. Troubleshooting

| Problem | Fix |
|---|---|
| CORS error | `CLIENT_URL` must exactly match the site origin (no trailing slash); redeploy backend |
| Logged out on every refresh in production | `NODE_ENV=production` (cookie needs `Secure; SameSite=None`) and HTTPS on both sites |
| Everyone gets "Too many attempts" together | `TRUST_PROXY` wrong — check Active sessions IPs; try 2 |
| OTP/receipt emails not arriving | Brevo key + verified sender; check spam; Render logs `[EMAIL]` |
| Paid but membership not active | Webhook URL/secret; member can click Pay again — it reconciles the earlier payment |
| First load takes ~50 s | Render free tier waking up; UptimeRobot monitor |
| Changed env var but site unchanged | Netlify needs a fresh deploy; Render restarts on env change |
