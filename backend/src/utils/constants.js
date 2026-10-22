export const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 10,
  EXPIRY_SECONDS: 10 * 60,
  EXPIRY_MS: 10 * 60 * 1000,
  MAX_ATTEMPTS: 3,
  RESEND_COOLDOWN_SECONDS: 60,
  PURPOSES: {
    REGISTRATION: "registration",
    FORGOT_PASSWORD: "forgotPassword",
  },
};

export const SESSION_CONFIG = {
  MAX_ACTIVE_DEVICES: 2,
  EXPIRY_DAYS: 30,
  EXPIRY_MS: 30 * 24 * 60 * 60 * 1000,
  EXPIRY_SECONDS: 30 * 24 * 60 * 60,
};

export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: "15m",
  REFRESH_TOKEN_EXPIRY: "30d",
  ALGORITHM: "HS256",
};

export const BCRYPT_CONFIG = {
  SALT_ROUNDS: 12,
};

export const TEMP_REGISTRATION_CONFIG = {
  EXPIRY_MINUTES: 15,
  EXPIRY_SECONDS: 15 * 60,
  EXPIRY_MS: 15 * 60 * 1000,
};

export const RATE_LIMIT_CONFIG = {
  OTP: {
    WINDOW_MS: 15 * 60 * 1000,
    MAX_REQUESTS: 5,
  },
  LOGIN: {
    WINDOW_MS: 15 * 60 * 1000,
    MAX_REQUESTS: 10,
  },
  GENERAL: {
    WINDOW_MS: 15 * 60 * 1000,
    MAX_REQUESTS: 20,
  },
};

export const USER_ROLES = {
  MEMBER: "member",
  TRAINER: "trainer",
  ADMIN: "admin",
};

export const USER_ROLES_ARRAY = Object.values(USER_ROLES);

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
};

export const COOKIE_CONFIG = {
  REFRESH_TOKEN: {
    NAME: "refreshToken",
    HTTP_ONLY: true,
    SECURE: process.env.NODE_ENV === "production",
    SAME_SITE: process.env.NODE_ENV === "production" ? "none" : "lax",
    MAX_AGE: SESSION_CONFIG.EXPIRY_MS,
  },
};

export const EMAIL_CONFIG = {
  FROM_NAME: process.env.GYM_NAME || "Hulk Gym",
  SUBJECTS: {
    // REGISTRATION_OTP: "Verify Your " + process.env.GYM_NAME + " Account",
    // FORGOT_PASSWORD_OTP: "Reset Your " + process.env.GYM_NAME + " Password",

    REGISTRATION_OTP: `Verify Your ${process.env.GYM_NAME || "Hulk Gym"} Account`,
    FORGOT_PASSWORD_OTP: `Reset Your ${process.env.GYM_NAME || "Hulk Gym"} Password`,
  },
  OTP_VALIDITY_TEXT: `${OTP_CONFIG.EXPIRY_MINUTES} minutes`,
};

// Bump when Terms/Privacy change materially — stored with each user's consent
export const LEGAL_VERSION = "2026-10-22";

export const AGE_CONFIRMATION = Object.freeze({
  ADULT: "adult", // member is 18 or older
  GUARDIAN: "guardian", // under 18, joining with a parent/guardian's consent
});

export const GYM_CONFIG = {
  NAME  : process.env.GYM_NAME            || "Hulk Gym",
  PREFIX: process.env.GYM_USER_ID_PREFIX  || "hulkgym",
};

export const PLAN_DURATIONS = {
  MONTHLY: { days: 30, label: "Monthly" },
  QUARTERLY: { days: 90, label: "Quarterly" },
  HALF_YEARLY: { days: 180, label: "Half-Yearly" },
  ANNUAL: { days: 365, label: "Annual" },
};

export const PLAN_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  ARCHIVED: "archived",
};

export const SUBSCRIPTION_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  GRACE: "grace",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
  COMPLIMENTARY: "complimentary",
};

export const PAYMENT_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  PARTIAL: "partial",
  FAILED: "failed",
  // Paid online while the member already had an active plan — money was
  // captured but no membership was given; admin must refund it.
  REFUND_DUE: "refund_due",
  // Admin issued the refund through Razorpay
  REFUNDED: "refunded",
};

export const PAYMENT_MODE = {
  RAZORPAY: "razorpay",
  CASH: "cash",
  UPI: "upi",
  CARD: "card",
  NETBANKING: "netbanking",
  WALLET: "wallet",
  COMPLIMENTARY: "complimentary",
};

export const INSTALLMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  OVERDUE: "overdue",
  WAIVED: "waived",
};

export const GRACE_PERIOD_DAYS = 3;

export const REMINDER_DAYS = [7, 3, 1]; // days before expiry to send reminders

export const RECEIPT_PREFIX = process.env.GYM_RECEIPT_PREFIX || "HLK";
// GYM_USER_ID_PREFIX = "hulkgym" → receipts become "hulkgym-2026-00001"
