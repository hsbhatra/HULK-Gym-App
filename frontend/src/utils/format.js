// =============================================================================
// src/utils/format.js
// =============================================================================
// One place for how money, dates and subscription statuses are SHOWN.
// (Amounts are stored in paise; the backend does all the calculating.)
// =============================================================================

// ₹1,23,456 — whole rupees get no decimals; if there are paise both decimals are shown (₹1,000.50)
export const inr = (paise) => {
  const value = Math.round(Number(paise) || 0);
  const decimals = value % 100 === 0 ? 0 : 2;
  return `₹${(value / 100).toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
};

// 27 Oct 2026  (month: "short" | "long"); `fallback` is shown for an empty date
export const formatDate = (date, { month = "short", fallback = "—" } = {}) =>
  date ? new Date(date).toLocaleDateString("en-IN", { day: "numeric", month, year: "numeric" }) : fallback;

// Colour of a subscription status chip. Members see "expired" as grey (it is
// just over); the admin sees it red (needs attention).
const BASE_STATUS_COLORS = {
  active: "#22c55e",
  grace: "#f97316",
  pending: "#f3d400",
  complimentary: "#a78bfa",
};
const MEMBER_STATUS_COLORS = { ...BASE_STATUS_COLORS, expired: "rgba(255,255,255,0.4)", cancelled: "#ef4444" };
const ADMIN_STATUS_COLORS = { ...BASE_STATUS_COLORS, expired: "#ef4444", cancelled: "#8c8c86" };

export const subscriptionStatusColor = (status, { admin = false } = {}) =>
  (admin ? ADMIN_STATUS_COLORS : MEMBER_STATUS_COLORS)[status] || "#8c8c86";
