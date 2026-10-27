// =============================================================================
// src/utils/installmentPlan.js
// =============================================================================
// Auto-calculates an installment schedule for the admin "Record Payment" form.
//
//   balance (paise) + number of installments + gap + first due date
//     → [{ amountDue: "333", dueDate: "2026-11-26" }, ...]
//
// Rules
//   • Money is worked out in paise (whole numbers) so nothing drifts.
//   • Every installment but the last is a whole-rupee amount; the last one takes
//     the remainder, so the parts always add up to the balance exactly
//     (the server rejects a schedule whose total differs from the balance).
//   • Dates use plain YYYY-MM-DD maths (no time zones). The first due date is
//     one gap after the membership start date unless the admin picks one.
// =============================================================================

export const MAX_INSTALLMENTS = 12;

export const GAP_OPTIONS = [
  { value: "30", label: "Every 30 days" },
  { value: "15", label: "Every 15 days" },
  { value: "7", label: "Every 7 days (weekly)" },
  { value: "month", label: "Monthly (same date each month)" },
];

const pad = (n) => String(n).padStart(2, "0");
const formatYMD = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

// Today in the browser's own time zone, as YYYY-MM-DD.
// (new Date().toISOString() is UTC, which shows yesterday in India between
// midnight and 5:30 AM.)
export const localISODate = (date = new Date()) =>
  formatYMD(date.getFullYear(), date.getMonth(), date.getDate());

// "2026-11-26" → { y, m (0-11), d }, or null when it isn't a real date
const parseYMD = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  const check = new Date(Date.UTC(y, m, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m || check.getUTCDate() !== d) return null;
  return { y, m, d };
};

// "2026-10-27" → "27-10-2026" (how dates are shown to people)
export const dmy = (ymd) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : String(ymd ?? "");
};

export const isValidDate = (value) => parseYMD(value) !== null;

export const addDays = (value, days) => {
  const p = parseYMD(value);
  if (!p) return "";
  const t = new Date(Date.UTC(p.y, p.m, p.d + days));
  return formatYMD(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
};

// Same date N months later; if that month is shorter, the last day of it
// (31 Jan + 1 month = 28/29 Feb). Always counted from the anchor date, so
// 31 Jan → 28 Feb → 31 Mar (it does not drift to the 28th).
export const addMonths = (value, months) => {
  const p = parseYMD(value);
  if (!p) return "";
  const total = p.m + months;
  const y = p.y + Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return formatYMD(y, m, Math.min(p.d, lastDay));
};

// gap = "7" | "15" | "30" (days) or "month"
export const addGap = (value, gap, steps) =>
  gap === "month" ? addMonths(value, steps) : addDays(value, Number(gap) * steps);

export const toPaise = (rupees) => Math.round(Number(rupees) * 100);

// A rupee amount typed by hand: digits with at most 2 decimals ("500", "500.5", "500.55").
// The server applies the same rule; this lets the form say so before sending.
export const isMoneyInput = (value) => /^\d+(\.\d{1,2})?$/.test(String(value ?? "").trim());

// 33300 → "333"   33333 → "333.33"
export const paiseToRupeeString = (paise) =>
  paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);

// Most installments the balance can be split into (every part at least ₹1)
export const maxInstallmentsFor = (balancePaise) =>
  balancePaise > 0 ? Math.max(1, Math.min(MAX_INSTALLMENTS, Math.floor(balancePaise / 100))) : 0;

// Equal whole-rupee parts, remainder on the last. Returns amounts in paise.
export const splitBalance = (balancePaise, count) => {
  if (!(balancePaise > 0) || !(count >= 1)) return [];
  const base = Math.floor(balancePaise / (count * 100)) * 100;
  const parts = Array(count).fill(base);
  parts[count - 1] = balancePaise - base * (count - 1);
  return parts;
};

// The auto-filled schedule shown to the admin
export const buildSchedule = ({ balancePaise, count, gap, firstDue }) => {
  if (!isValidDate(firstDue)) return [];
  return splitBalance(balancePaise, count).map((paise, i) => ({
    amountDue: paiseToRupeeString(paise),
    dueDate: addGap(firstDue, gap, i),
  }));
};

// Price the server will charge: the offer price while the offer is valid
// (same rule as MembershipPlan.getEffectivePrice on the backend)
export const effectiveTierPricePaise = (tier, nowMs = Date.now()) => {
  if (!tier) return 0;
  const hasOffer =
    tier.offerPrice !== null &&
    tier.offerPrice !== undefined &&
    (!tier.offerValidUntil || new Date(tier.offerValidUntil).getTime() > nowMs);
  return hasOffer ? tier.offerPrice : tier.price;
};

export const sumPaise = (rows) =>
  rows.reduce((total, row) => {
    const paise = toPaise(row.amountDue);
    return total + (Number.isFinite(paise) && paise > 0 ? paise : 0);
  }, 0);

// -----------------------------------------------------------------------------
// Fitting the schedule inside the membership
// -----------------------------------------------------------------------------
// The membership runs from the start date for `durationDays` days. Every
// installment must be paid before that ends — the last one at least
// LAST_DUE_LEAD_DAYS days early, so there is time to chase a missed payment.
export const LAST_DUE_LEAD_DAYS = 7;

export const membershipEndDate = (startDate, durationDays) => addDays(startDate, durationDays);

// Latest date an installment may be due ("" when the start date is invalid)
export const lastAllowedDueDate = (startDate, durationDays) =>
  addDays(startDate, durationDays - LAST_DUE_LEAD_DAYS);

// How many installments fit when the first is due on `firstDue` and the rest
// follow every `gap`, without going past `limitDate` (0 = none fit)
export const fitCount = (firstDue, gap, limitDate) => {
  if (!isValidDate(firstDue) || !isValidDate(limitDate)) return 0;
  let n = 0;
  while (n < MAX_INSTALLMENTS && addGap(firstDue, gap, n) <= limitDate) n += 1;
  return n;
};

// Calculator defaults for a plan: the longest gap that still fits (30 → 15 → 7
// days) and about one installment per month of the plan, minus the month that
// today's payment covers.  90 days → 2 × 30 days; 180 → 5; 365 → 11;
// 30 days → 1 × 15 days.
export const suggestSchedule = (startDate, durationDays) => {
  const limit = lastAllowedDueDate(startDate, durationDays);
  const wanted = Math.max(1, Math.round(durationDays / 30) - 1);
  for (const gap of ["30", "15", "7"]) {
    const fit = fitCount(addGap(startDate, gap, 1), gap, limit);
    if (fit >= 1) return { gap, count: Math.min(fit, wanted) };
  }
  return { gap: "7", count: 0 };
};

// Dates that appear on more than one installment (sorted, unique)
export const duplicateDates = (rows) => {
  const seen = {};
  rows.forEach((r) => {
    if (isValidDate(r.dueDate)) seen[r.dueDate] = (seen[r.dueDate] || 0) + 1;
  });
  return Object.keys(seen).filter((d) => seen[d] > 1).sort();
};

// Problem with a single row ("" when fine). ctx = { today, lastAllowed, end }
export const rowProblem = (row, ctx) => {
  if (String(row.amountDue ?? "").trim() !== "" && !isMoneyInput(row.amountDue)) return "Enter the amount in rupees (up to 2 decimals).";
  const paise = toPaise(row.amountDue);
  if (!Number.isFinite(paise) || paise <= 0) return "Enter an amount above ₹0.";
  if (!isValidDate(row.dueDate)) return "Pick a valid due date.";
  if (ctx?.today && row.dueDate < ctx.today) return "This date has already passed — pick today or later.";
  if (ctx?.lastAllowed && row.dueDate > ctx.lastAllowed) {
    return `Too late — it must be on or before ${dmy(ctx.lastAllowed)} (membership ends ${dmy(ctx.end)}; the last installment is kept ${LAST_DUE_LEAD_DAYS} days before that).`;
  }
  return "";
};

// Returns an error message, or "" when the schedule can be saved
export const validateSchedule = (rows, balancePaise, ctx) => {
  if (!rows.length) return "Choose the number of installments and a first due date.";
  for (let i = 0; i < rows.length; i += 1) {
    const problem = rowProblem(rows[i], ctx);
    if (problem) return `Installment ${i + 1}: ${problem}`;
  }
  const same = duplicateDates(rows);
  if (same.length) return `Two installments fall on ${same.map(dmy).join(", ")}. Give each installment its own date.`;
  const diff = balancePaise - sumPaise(rows);
  if (diff !== 0) {
    const rupees = paiseToRupeeString(Math.abs(diff));
    return diff > 0
      ? `Installments are ₹${rupees} short of the balance.`
      : `Installments are ₹${rupees} more than the balance.`;
  }
  return "";
};

// Installments are numbered in the order sent, so send them earliest first
export const sortByDueDate = (rows) =>
  rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => (a.row.dueDate < b.row.dueDate ? -1 : a.row.dueDate > b.row.dueDate ? 1 : a.index - b.index))
    .map(({ row }) => row);
