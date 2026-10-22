# App Flow Document
## Hulk Gym Web App
**Last updated:** 22 October 2026

Routes in brackets are frontend pages; `METHOD /path` are API calls under `/api/v1`.

---

## 1. Visitor → member (sign up)

1. [/] Landing page → "Join now" or a plan → [/register]
2. Fill first/last name, email, 10-digit mobile, password (+ strength meter), confirm password
3. Choose age: **"I am 18 or older"** or **"under 18 and my parent/guardian agrees"**, tick **Terms / Privacy / Refund** — both required
4. `POST /auth/register` → server checks email/phone not taken, hashes the password, stores a temporary registration (15 min) with consent + terms version, emails a 6-digit OTP
5. [/verify-otp] 6-box OTP input (paste supported, 60 s resend timer) → `POST /auth/verify-registration-otp`
   - wrong code: "N attempts remaining"; after 3 wrong codes a new OTP is emailed
6. Account created (member ID `hulkgym_000N`), logged in on this device, redirected to the plan they picked or the profile

## 2. Login & staying logged in

1. [/login] email + password → `POST /auth/login`
2. Server creates a session (max 2 devices — the oldest is signed out), sets the refresh cookie, returns an access token (kept in memory only)
3. Every API call sends `Authorization: Bearer …`; on 401 the app calls `GET /auth/refresh-token` once, then retries
4. Page refresh: `useAuthInit` calls refresh before rendering, so members stay logged in for 30 days
5. If `?redirect=` is present (e.g. came from a plan page), login returns there

Errors: wrong email or password → same message (no account enumeration); 10 wrong tries for one email from one IP → wait 15 min.

## 3. Forgot password

1. [/forgot-password] email → `POST /auth/forgot-password` → same reply whether or not the account exists
2. [/forgot-otp] OTP → `POST /auth/verify-forgot-otp` → returns a **reset token** (15 min, single use), kept in this tab only
3. [/reset-password] new password ×2 → `POST /auth/reset-password` with the token
4. Password changed, OTPs deleted, **every device signed out** → login with the new password

Going back and resubmitting, or reusing an old tab → "Your reset session has expired".

## 4. Buying a membership online

1. [/] Plans section → choose duration tab → plan card → [/plans/:slug]
2. Plan page shows tiers, features, offer price/date; "By paying you agree to Terms and Refund Policy"
3. Not logged in → [/login?redirect=…]
4. "Pay" → `POST /subscriptions/initiate { planId, durationDays }`
   - already has an active plan → blocked with a message
   - an earlier payment actually succeeded → it's activated now, no new charge
   - an open order for the same plan exists (<30 min) → reused
5. Razorpay checkout opens (UPI / card / net banking)
6. Success → `POST /subscriptions/verify` (signature + ownership checked) → membership active, receipt `HLK-YYYY-NNNNN` emailed → [/subscription/success]
7. Razorpay also calls the **webhook**; whichever arrives first activates, the other is ignored
8. If the member closes the tab after paying, the webhook (or the next "Pay" click) still activates it

**Duplicate payment:** member already active and pays again (e.g. two tabs) → no second membership; payment marked *refund due*, member emailed, appears in Admin → Refunds.

## 5. Member area [/profile]

| Tab | What they can do |
|---|---|
| Profile | Edit name, height, weight, DOB, gender, bio; upload/remove photo; **Delete my account** |
| Membership | Current plan, dates, status (active / grace / complimentary), installments, receipts, history |
| Sessions | See devices, sign out one or all |
| Password | Change password (other devices signed out) |

**Delete account:** password → blocked if an active plan, unpaid installment or pending refund exists → otherwise photo deleted, personal data anonymised, sessions ended, logged out. Payment/receipt records are kept (tax law).

## 6. Admin flows [/admin/*]

Admin logs in normally; role `admin` sees the Admin panel (sidebar on desktop, 2×2 tabs on phones).

### 6.1 Dashboard [/admin]
KPIs, revenue chart, plan split, expiring this week, pending/overdue installments. If refunds are pending, an alert at the top links to Refunds.

### 6.2 Plans [/admin/plans]
- **Create Plan** → name, slug, description, features, 1–4 tiers (30/90/180/365 days) with price and optional offer price + end date, featured, grace days → appears at the **bottom** of the list
- **Order:** drag the handle (desktop) or use ↑/↓ (any device) — saved immediately; the website shows plans in this order
- Activate / Deactivate (hidden from site, existing members unaffected), Archive (soft delete), Restore, Edit

### 6.3 Members [/admin/members]
1. Search by name, email, phone or member ID → open a member
2. **New Membership** (only when no active plan): plan + tier + mode (cash / UPI / card…) →
   - full payment, **or** partial with an installment schedule, **or** complimentary
   - receipt emailed for money received
3. **Collect balance** → applied to the oldest unpaid installments first, receipt emailed
4. **Mark installment paid** · **Cancel membership** (reason recorded; future installments waived)

### 6.4 Refunds [/admin/refunds]
Pending duplicate payments → **Refund** → confirm → Razorpay refund (full amount to the original method) → member emailed → moves to History with refund ID and status. Sidebar badge shows the pending count.

## 7. Automatic daily job (8:00 AM IST)
1. Email reminders 7, 3 and 1 day before a plan ends (each sent once)
2. Ended plans → **grace** (renew window) → **expired** after the grace days
3. Unpaid installments past due date → **overdue**

## 8. Navigation map

```
/                     landing
/plans/:slug          plan + checkout
/register → /verify-otp
/login
/forgot-password → /forgot-otp → /reset-password
/profile              (tabs: profile, membership, sessions, password)
/subscription/success
/contact  /terms  /privacy  /refund-policy
/admin  /admin/plans  /admin/members[/:id]  /admin/refunds
*                     404 page
```
