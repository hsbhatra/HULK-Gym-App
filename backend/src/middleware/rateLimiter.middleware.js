// =============================================================================
// src/middleware/rateLimiter.middleware.js
// =============================================================================
// Each route gets its OWN counter (a shared limiter meant 10 logins + resets +
// sign-ups all used up the same 10 slots). Sensitive routes count per
// IP + email, so one person can't lock everyone at the gym's Wi-Fi out, and an
// attacker can't hammer one account from many emails' worth of quota.
// Needs app.set("trust proxy", …) in app.js to see real client IPs.
// =============================================================================

import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const body = (message) => ({ success: false, statusCode: 429, message, errors: [] });

const byIpAndEmail = (req) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  return `${ipKeyGenerator(req.ip)}|${email}`;
};

const make = ({ minutes, max, message, perEmail = false, skipSuccessfulRequests = false }) =>
  rateLimit({
    windowMs: minutes * 60 * 1000,
    limit: max,
    message: body(message),
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skipSuccessfulRequests,
    ...(perEmail ? { keyGenerator: byIpAndEmail } : {}),
  });

const WAIT_15 = "Too many attempts. Please wait 15 minutes and try again.";

// Only wrong passwords count — members logging in normally never hit it
export const loginLimiter = make({ minutes: 15, max: 10, message: WAIT_15, perEmail: true, skipSuccessfulRequests: true });
export const registerLimiter = make({ minutes: 15, max: 10, message: WAIT_15 });
export const forgotPasswordLimiter = make({ minutes: 15, max: 5, message: WAIT_15, perEmail: true });
export const resetPasswordLimiter = make({ minutes: 15, max: 10, message: WAIT_15, perEmail: true });
export const sensitiveActionLimiter = make({ minutes: 15, max: 10, message: WAIT_15 });

export const otpLimiter = make({
  minutes: 10,
  max: 10,
  message: "Too many OTP requests. Please wait 10 minutes and try again.",
  perEmail: true,
});

// Backstop for the whole API (per IP). Generous: a gym's Wi-Fi is shared.
export const generalLimiter = make({
  minutes: 15,
  max: 1000,
  message: "Too many requests. Please slow down and try again in a few minutes.",
});

// Kept for any older import — same as the sensitive-action limiter
export const authLimiter = sensitiveActionLimiter;
