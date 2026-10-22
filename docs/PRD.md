# Product Requirements Document (PRD)
## Hulk Gym Web App
**Version:** 2.0 · **Last updated:** 22 October 2026 · **Status:** User testing on the testing server, production setup next

---

## 1. Overview

### 1.1 Summary
A website and membership system for Hulk Gym (Nayapura, Kota). It replaces paper registers and cash-only tracking: members can join and pay online, and the gym manages plans, payments, installments and refunds from one admin panel.

### 1.2 Problem
- Membership, payment and due dates were tracked by hand, so renewals and dues were easy to miss.
- No online presence that shows real gym information, prices and hours.
- No way to take payment online or give proper receipts.

### 1.3 Users
| User | Needs |
|---|---|
| **Visitor** | See facilities, prices, hours, location; contact the gym; join |
| **Member** | Pay online, see plan/expiry/installments/receipts, manage account |
| **Admin (gym owner/staff)** | Manage plans, record cash payments and installments, see dues and revenue, refund duplicates |

A `trainer` role exists in the code but has no screens — the trainer module is **deferred** until the client asks for it.

### 1.4 Gym facts used on the site (confirmed Oct 2026)
- Offering: free weights, functional zone, personal training on request (occasional). **No group classes, no Zumba, no AC.**
- Amenities: lockers, changing room, RO drinking water, parking, CCTV.
- Hours: Monday–Saturday, 6–11 AM and 5–10 PM; Sunday closed.
- Pending owner confirmation: free trial (currently not offered on the site), refund/cancellation rules, gym email address.

---

## 2. Features (built)

### 2.1 Public website
- Landing page: hero, live "Open now / Closed" status in IST, facilities, amenities, plans with tier switcher, FAQ, map, contact (call / WhatsApp / email with prefilled messages / Instagram / directions)
- Contact page; Terms, Privacy, Refund & Cancellation pages
- Responsive from 360 px phones to large screens; text sized for all ages (17 px base)
- SEO: per-route meta, canonical, JSON-LD, sitemap, robots, Open Graph image

### 2.2 Accounts & security
- Sign up → email OTP → account; age confirmation (18+ or guardian consent) and Terms/Privacy acceptance stored with version and time
- Login with JWT access token (15 min, memory only) + refresh token (30 days, httpOnly cookie); max 2 devices
- Forgot password: OTP → one-time reset token (15 min) → new password; all devices signed out
- Change password (other devices signed out); see and end active sessions
- Delete account: password confirmation; blocked while a plan, unpaid installment or refund is open; personal data anonymised, payment records kept for tax law
- Rate limits per IP + email on login, OTP, reset; generous global API limit

### 2.3 Membership & payments
- Plans with 1–4 pricing tiers (30/90/180/365 days), optional offer price with end date, features list, featured flag, grace period, status (active/inactive/archived)
- Online purchase via Razorpay; price always computed on the server; dual confirmation (checkout verify + webhook); recovers payments that succeeded while the browser closed
- Duplicate payment (member already active) is not activated — marked "refund due" and emailed
- Offline payments by admin: full, partial with installments, or complimentary
- Numbered receipts emailed for every payment event

### 2.4 Admin panel
- Dashboard: active members, revenue this month vs last, new members, expiring this week, 6-month revenue chart, plan split, expiring list, pending/overdue installments, alert for pending refunds
- Plans: create/edit, activate/deactivate/archive/restore, **display order by drag-and-drop or ↑/↓ (top = first on website)**
- Members: search by name/email/phone/ID, member detail, new membership (cash/UPI/complimentary/installments), collect balance, mark installment paid, cancel membership
- Refunds: pending duplicate payments with one-click Razorpay refund (emails member), refund history

### 2.5 Automation
- Daily 8:00 AM IST: reminder emails 7, 3 and 1 day before expiry; active → grace → expired; pending installments → overdue

---

## 3. Non-functional requirements

| Area | Target |
|---|---|
| Performance | Landing page usable < 2.5 s on 4G; images and fonts self-hosted |
| Availability | Free-tier hosting; first request after idle can take ~50 s (Render cold start) — UptimeRobot pings `/api/health` |
| Security | OWASP Top 10 basics; tested Oct 2026 (see TRD §5) |
| Privacy | DPDP Act 2023: consent, purpose, processors listed, deletion |
| Accessibility | Keyboard focus rings, 44 px tap targets, reduced-motion support, AA contrast |
| Browsers | Last 2 versions of Chrome, Safari, Firefox, Edge; Android 10+, iOS 15+ |

---

## 4. Out of scope (for now)
- Trainer module, workout/diet tracking, class booking
- Automatic recurring payments (autopay)
- Native mobile apps, multi-branch, multiple languages
- Attendance / biometric integration
