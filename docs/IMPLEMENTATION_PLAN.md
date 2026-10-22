# Implementation Status & Roadmap
## Hulk Gym Web App
**Last updated:** 22 October 2026 · **Phase:** client review on the testing server → production setup

---

## 1. Done ✅

### Platform
- [x] Auth: OTP sign-up with consent, login, 2-device sessions, refresh cookie, forgot/change password, logout everywhere
- [x] Profile: details, photo, sessions, delete account (anonymised, records kept)
- [x] Plans: tiers, offers, featured, grace days, status, **drag-and-drop display order**
- [x] Online payments: Razorpay orders, verify + webhook, recovery of missed payments, duplicate detection
- [x] Offline payments: full / installments / complimentary, collect balance, cancel (waives future installments)
- [x] Receipts: numbered, emailed for every money event
- [x] Refunds: one-click Razorpay refund for duplicates, history page, sidebar badge
- [x] Daily 8 AM IST job: reminders, grace/expiry, overdue installments
- [x] Admin dashboard: KPIs, revenue chart, plan split, expiring, dues

### Website
- [x] "Molten Iron" design across public, member and admin screens; responsive; larger text for all ages
- [x] Real gym content only; contacts from env; open-now status in IST; map
- [x] Contact, Terms, Privacy (DPDP 2023), Refund pages
- [x] SEO: JSON-LD, sitemap, robots, canonical, share image; Netlify cache + security headers

### Security (review 22 Oct 2026 — see TRD §5)
- [x] Password-reset bypass fixed (single-use reset token)
- [x] Real client IPs behind Render + per-route IP+email rate limits
- [x] Sanitizer order, pinned JWT algorithm, OTP removed from logs, session guard on admin plans, 400/413 for bad bodies
- [x] Ownership check before payment activation; members list excludes admin/deleted
- [x] Reminder job ran at 2:30 AM IST — now 8:00 AM IST

---

## 2. Manual test checklist (testing server)

**Security fixes**
- [ ] Forgot password with a real OTP → new password works; resubmitting the old reset page says "expired"
- [ ] Reset/change password on one device → the other device is signed out
- [ ] Profile → Active sessions shows real, different IPs for phone (mobile data) and laptop (Wi-Fi)
- [ ] 10 wrong passwords for one email → "wait 15 minutes"; another account still logs in

**Member journey (fresh email)**
- [ ] Register without age/terms → blocked; with them → OTP → profile
- [ ] Buy a plan (test UPI `success@razorpay`) → active + receipt email (check spam)
- [ ] Pay the same plan in two tabs → second appears in Admin → Refunds → Refund → refund email
- [ ] `failure@razorpay` / close checkout → no membership; retry works

**Admin**
- [ ] Plans: drag and ↑/↓ reorder → order on the home page matches; new plan lands last
- [ ] Cash membership with installments → mark one paid → collect balance → cancel another
- [ ] Search by name, phone, member ID

**Account & layout**
- [ ] Delete account blocked with an active plan; works without; old login fails
- [ ] Phone check of every page; footer developer card clearly visible

---

## 3. Open items

| Item | Owner | Status |
|---|---|---|
| Free trial offered? | Sanjay | pending (hidden on site) |
| Refund / cancellation rules | Sanjay | pending (site: fees non-refundable once active; duplicates refunded) |
| Gym email address | Sanjay / Himanshu | to create today → `VITE_GYM_EMAIL`, Brevo sender |
| Exact Google Maps link, real photos | Sanjay | optional |
| Plan features text | Himanshu | test data — replace with real features |
| Production setup (domain, DB, live Razorpay, Brevo domain) | Himanshu | after client review — see PROJECT_SETUP_GUIDE §5 |
| Final installment ₹6,000 | Sanjay | after launch |

## 4. Known limitations / tech debt

| Item | Priority | Note |
|---|---|---|
| Render free tier cold start (~50 s) | Medium | UptimeRobot keeps it warm; paid instance if it matters |
| No Content-Security-Policy header | Medium | add after confirming Razorpay + Maps sources |
| Refresh token not rotated on use | Low | sessions are revocable; rotation would add theft detection |
| Joi validators don't write the cleaned body back | Low | controllers whitelist fields, so no exposure today |
| ESLint: ~45 pre-existing React-hooks style errors | Low | no runtime impact; clean up gradually |
| `trainer` role unused | — | trainer module deferred |

---

## 5. Roadmap (if the client wants more)

| Phase | Scope | Rough effort |
|---|---|---|
| Launch support | go-live, owner training, first-week monitoring | 2–3 days |
| Renewals | "Renew now" from reminder emails, renewal discounts | 2–3 days |
| Attendance | QR check-in at the desk, visit history | 1 week |
| Trainer module | trainer profiles, PT bookings, assigned members | 1–2 weeks |
| Member progress | weight/measurements log, charts | 1 week |
| Notifications | WhatsApp reminders (paid API) | 3–4 days |
| Reports | monthly revenue/dues export (Excel/PDF) | 2–3 days |
