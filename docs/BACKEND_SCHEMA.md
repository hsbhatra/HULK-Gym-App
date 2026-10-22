# Backend Schema & API Reference
## Hulk Gym Web App
**Last updated:** 22 October 2026 · MongoDB (Atlas) via Mongoose 9

All money fields are **integers in paise** (₹1 = 100). All documents have `createdAt` / `updatedAt`.

---

## 1. Collections

### 1.1 `users`
| Field | Type | Notes |
|---|---|---|
| firstName, lastName | String | 2–50 chars, letters |
| email | String | unique, lowercase |
| phoneNumber | String | unique, 10-digit Indian mobile |
| passwordHash | String | bcrypt (cost 12), `select: false`, never in JSON |
| role | String | `member` · `trainer` (unused) · `admin` |
| userId | String | readable ID `hulkgym_0001` (atomic counter) |
| isEmailVerified, isActive | Boolean | inactive = cannot log in |
| profilePicture, profilePicturePublicId | String | Cloudinary URL + id |
| height (cm), weight (kg), dateOfBirth, gender, bio | | optional profile |
| consent | Object | `{ termsAcceptedAt, termsVersion, ageConfirmation: adult\|guardian }` |
| deletedAt | Date | set when the member deletes the account (data anonymised) |

Pre-save hook hashes `passwordHash` unless it is already a bcrypt hash.

### 1.2 `membershipplans`
| Field | Type | Notes |
|---|---|---|
| name, slug, description | String | slug unique, used in `/plans/:slug` |
| pricingTiers[] | `{ durationDays: 30\|90\|180\|365, label, price, offerPrice, offerValidUntil }` | 1–4 tiers |
| features[] | String | shown on the plan card |
| status | `active` · `inactive` · `archived` | only active plans are public/purchasable |
| isFeatured | Boolean | highlighted card |
| displayOrder | Number | 1..n, set by admin drag-and-drop; new plans go last |
| gracePeriodDays | Number | 0–30 (default 3) |
| createdBy | ObjectId → users | |

Method `getEffectivePrice(days)` returns the offer price while valid, else the base price. Index `{ status, displayOrder }`.

### 1.3 `subscriptions`
| Field | Notes |
|---|---|
| userId, planId | refs |
| planSnapshot | `{ planName, planSlug, durationDays, durationLabel, features, price, gracePeriodDays }` frozen at purchase |
| status | `pending` · `active` · `grace` · `expired` · `cancelled` · `complimentary` |
| paymentMode | razorpay · cash · upi · card · netbanking · wallet · complimentary |
| startDate, endDate, gracePeriodEnds, activatedAt | |
| cancelledAt, cancelReason | |
| remindersSent | `{ sevenDay, threeDay, oneDay }` |
| createdBy, notes | admin-created memberships |

Active = status in (active, grace, complimentary) **and** `gracePeriodEnds > now`. Indexes `{ userId, status }`, `{ status, endDate }`.

### 1.4 `payments` (one per subscription)
| Field | Notes |
|---|---|
| userId, subscriptionId, planId | refs |
| amountDue, amountPaid, downPayment, currency | paise, INR |
| status | `pending` · `completed` · `partial` · `failed` · `refund_due` · `refunded` |
| paymentMode | as above |
| razorpay | `{ orderId, paymentId, signature, method }` |
| refund | `{ refundId, amount, status, lockedAt, initiatedAt, initiatedBy }` |
| receiptNumber | unique + sparse (set only when money arrives) |
| recordedBy, paidAt, notes | |

Indexes `{ userId, createdAt }`, `{ razorpay.orderId }`.

### 1.5 `installments`
`paymentId, subscriptionId, userId, installmentNumber, amountDue, amountPaid, dueDate, paidAt, status (pending · paid · overdue · waived), paymentMode, recordedBy, notes`. Indexes `{ status, dueDate }`, `{ paymentId, installmentNumber }`.

### 1.6 `receipts` (one per money event)
`receiptNumber (HLK-YYYY-NNNNN, unique), userId, subscriptionId, paymentId, installmentId, type (online · offline · installment · balance), amount, paymentMode, razorpayPaymentId, planName, durationLabel, totalDue, totalPaidAfter, balanceAfter, note, recordedBy, paidAt, emailSent`.

### 1.7 `sessions`
`userId, refreshTokenHash (SHA-256), deviceInfo { userAgent, ipAddress, deviceName, platform }, isActive, lastUsedAt, expiresAt (30 days, TTL index)`.

### 1.8 `otps`
`userId, email, otpHash (SHA-256, select:false), purpose (registration · forgotPassword), attempts / maxAttempts (3), isUsed, resetTokenHash (select:false), resetTokenExpiresAt, expiresAt (10 min, TTL index)`.

### 1.9 `tempregistrations`
Pending sign-ups (15 min, TTL): name, email, phone, **passwordHash**, `termsAcceptedAt`, `termsVersion`, `ageConfirmation`.

### 1.10 `counters`
Atomic sequences: member IDs and yearly receipt numbers (`receipt_2026`).

---

## 2. Relationships

```
users 1─* sessions
users 1─* subscriptions 1─1 payments 1─* installments
                         payments 1─* receipts *─0..1 installments
membershipplans 1─* subscriptions (plan also copied into planSnapshot)
```

---

## 3. API (prefix `/api/v1`)

**Auth** = Bearer token + active session. **Admin** = Auth + role admin.

### Public / auth
| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | uptime check (no `/v1`) |
| POST | /auth/register | consent fields required |
| POST | /auth/verify-registration-otp | creates user, logs in |
| POST | /auth/resend-registration-otp | 60 s cooldown |
| POST | /auth/login | |
| GET | /auth/refresh-token | cookie → new access token |
| POST | /auth/logout · /auth/logout-all | Auth |
| GET | /auth/sessions | Auth |
| POST | /auth/forgot-password | always 200 |
| POST | /auth/verify-forgot-otp | returns `resetToken` |
| POST | /auth/resend-forgot-otp | |
| POST | /auth/reset-password | needs `resetToken` |
| POST | /auth/change-password | Auth |
| GET | /plans · /plans/:slug | active plans in display order |

### Member (Auth)
| Method | Path | Notes |
|---|---|---|
| GET / PATCH | /profile | whitelisted fields only |
| PATCH / DELETE | /profile/picture | multipart `profilePicture` |
| POST | /profile/delete | `{ password }` |
| POST | /subscriptions/initiate | `{ planId, durationDays }` → Razorpay order |
| POST | /subscriptions/verify | `{ razorpayOrderId, razorpayPaymentId, razorpaySignature }` |
| GET | /subscriptions/my · /my/active · /my/receipts | |

### Admin
| Method | Path | Notes |
|---|---|---|
| GET | /admin/dashboard | KPIs, charts, lists |
| GET | /admin/members?q=&page=&limit= | members only (not admin, not deleted) |
| GET | /admin/members/:id | profile, subscriptions, payments, receipts |
| GET | /admin/subscriptions | |
| POST | /admin/subscriptions/offline | full / installments / complimentary |
| POST | /admin/subscriptions/:id/collect | balance payment |
| PATCH | /admin/subscriptions/:id/cancel | |
| PATCH | /admin/installments/:id | mark paid |
| GET | /admin/refunds | `{ due, history }` |
| POST | /admin/payments/:id/refund | Razorpay refund |
| GET / POST | /admin/plans | list all · create |
| PATCH | /admin/plans/reorder | `{ order: [every planId, top → bottom] }` |
| PATCH | /admin/plans/:id | edit (display order ignored here) |
| PATCH | /admin/plans/:id/status | active / inactive / archived |
| DELETE | /admin/plans/:id | archive (soft) |

### Webhook
| POST | /webhooks/razorpay | raw body, `x-razorpay-signature` verified; handles `payment.captured`, `order.paid`, `payment.failed` |
