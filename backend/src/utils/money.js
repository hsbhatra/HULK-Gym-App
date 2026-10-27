// =============================================================================
// src/utils/money.js
// =============================================================================
// Strict money + date helpers for anything that records or splits payments.
// Money is always whole paise (integers); rupee input from the browser is
// converted exactly once, here, and rejected if it isn't a real amount.
// =============================================================================

import ApiError from "./apiError.js";

const MAX_PAISE = 10_000_000_00; // ₹1 crore — far above any membership; stops typos

/**
 * "233.33" / 233.33 / 500 → paise (integer).
 * Rejects empty, NaN, negative, more than 2 decimals, or absurdly large values.
 * @param {string|number} value  rupees
 * @param {string} label         used in the error message
 * @param {{ allowZero?: boolean }} [opts]
 */
export const rupeesToPaise = (value, label = "Amount", { allowZero = false } = {}) => {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") {
    throw ApiError.badRequest(`${label} is required.`);
  }
  const text = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    throw ApiError.badRequest(`${label} must be a valid rupee amount (up to 2 decimals).`);
  }
  const paise = Math.round(Number(text) * 100);
  if (paise < 0 || paise > MAX_PAISE) {
    throw ApiError.badRequest(`${label} is out of range.`);
  }
  if (paise === 0 && !allowZero) {
    throw ApiError.badRequest(`${label} must be above ₹0.`);
  }
  return paise;
};

// "2026-10-27" (or a Date) → "2026-10-27"; null when not a real date
export const toYMD = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

// Today in India, as YYYY-MM-DD (the gym works in IST)
export const todayIST = () => new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);

// Only accepts a plain YYYY-MM-DD that is a real calendar date
export const parseDateOnly = (value, label = "Date") => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw ApiError.badRequest(`${label} must be a valid date (YYYY-MM-DD).`);
  }
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    throw ApiError.badRequest(`${label} is not a real date.`);
  }
  return d;
};

export const addDaysYMD = (ymd, days) => {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
