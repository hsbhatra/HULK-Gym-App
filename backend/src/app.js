// =============================================================================
// src/app.js
// =============================================================================

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import healthRoutes from "./routes/health.routes.js";
import authRouter from "./routes/auth/index.js";
import profileRouter from "./routes/profile.routes.js";
import planRouter, { adminPlanRouter } from "./routes/plan.routes.js";
import webhookRouter from "./routes/webhook.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import adminRouter from "./routes/admin.routes.js";
import errorHandler from "./middleware/error/errorHandler.middleware.js";
import ApiError from "./utils/apiError.js";

const app = express();

// -----------------------------------------------------------------------------
// Security Middleware
// -----------------------------------------------------------------------------

// helmet: automatically sets secure HTTP response headers
// e.g. prevents clickjacking, sniffing attacks, etc. — zero config needed
app.use(helmet());

// cors: allows your frontend (different port/domain) to call this API
app.use(
  cors({
    origin: (origin, callback) => {
      // CLIENT_URL may list several origins, comma-separated
      // (e.g. "https://hulk-gym-kota-test.netlify.app,http://localhost:5173").
      // Trailing slashes are ignored on both sides.
      const allowed = (process.env.CLIENT_URL || "http://localhost:5173")
        .split(",")
        .map((o) => o.trim().replace(/\/$/, ""))
        .filter(Boolean);
      const normalizedOrigin = origin?.replace(/\/$/, "");

      if (!origin || allowed.includes(normalizedOrigin)) {
        callback(null, true);
      } else {
        // ApiError → errorHandler replies 403 (a plain Error became a 500)
        callback(ApiError.forbidden("This origin is not allowed to access the API."));
      }
    },
    credentials: true, // required to send/receive cookies cross-origin
  }),
);

// Manual sanitizer — strips MongoDB operators from req.body only
// Avoids express-mongo-sanitize conflict with Express's read-only req.query
app.use((req, res, next) => {
  if (req.body) {
    const sanitize = (obj) => {
      Object.keys(obj).forEach((key) => {
        if (key.startsWith("$")) {
          delete obj[key];
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          sanitize(obj[key]);
        }
      });
    };
    sanitize(req.body);
  }
  next();
});

// -----------------------------------------------------------------------------
// Body & Cookie Parsing
// -----------------------------------------------------------------------------

// Webhook route MUST come before express.json() and use raw body parsing
// Razorpay signature verification requires the exact raw request bytes
app.use(
  "/api/v1/webhooks",
  express.raw({ type: "application/json" }),
  webhookRouter
);

// Parses incoming JSON request bodies → available as req.body
app.use(express.json({ limit: "10kb" })); // limit prevents large payload attacks

// Parses URL-encoded form data → available as req.body
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Parses cookies from incoming requests → available as req.cookies
// Required for reading the refresh token HTTP-only cookie
app.use(cookieParser());

// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/profile", profileRouter);
app.use("/api/v1/plans", planRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);

// Admin Routes
app.use("/api/v1/admin/plans", adminPlanRouter);
app.use("/api/v1/admin", adminRouter);

// Health check (existing)
app.use("/api/health", healthRoutes);

// -----------------------------------------------------------------------------
// 404 Handler — unknown routes
// -----------------------------------------------------------------------------
// If a request doesn't match any route above, send a clean 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
    errors: [],
  });
});

// -----------------------------------------------------------------------------
// Global Error Handler — MUST be last
// -----------------------------------------------------------------------------
// Express identifies this as an error handler because it has 4 parameters.
// All errors from controllers, services, and middleware end up here.
app.use(errorHandler);

export default app;
