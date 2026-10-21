// =============================================================================
// src/middleware/rateLimiter.middleware.js
// =============================================================================

import rateLimit from "express-rate-limit";

// Strict limiter — for login, register, OTP endpoints
// 10 requests per 15 minutes per IP
export const authLimiter = rateLimit({
  windowMs       : 15 * 60 * 1000, // 15 minutes
  max            : 10,
  message        : {
    success   : false,
    statusCode: 429,
    message   : "Too many requests. Please wait 15 minutes and try again.",
    errors    : [],
  },
  standardHeaders: true,
  legacyHeaders  : false,
});

// OTP resend limiter — tighter
// 3 requests per 10 minutes per IP
export const otpLimiter = rateLimit({
  windowMs       : 10 * 60 * 1000, // 10 minutes
  max            : 5,
  message        : {
    success   : false,
    statusCode: 429,
    message   : "Too many OTP requests. Please wait 10 minutes and try again.",
    errors    : [],
  },
  standardHeaders: true,
  legacyHeaders  : false,
});

// General API limiter — loose
// 100 requests per 15 minutes per IP
export const generalLimiter = rateLimit({
  windowMs       : 15 * 60 * 1000,
  max            : 100,
  standardHeaders: true,
  legacyHeaders  : false,
});