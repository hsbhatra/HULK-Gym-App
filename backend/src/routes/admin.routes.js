// =============================================================================
// src/routes/admin.routes.js
// =============================================================================

import { Router } from "express";
import authenticate from "../middleware/auth/authenticate.middleware.js";
import sessionGuard from "../middleware/auth/sessionGuard.middleware.js";
import authorize from "../middleware/auth/authorize.middleware.js";

import {
  searchMembers,
  getMemberProfile,
  recordOfflinePayment,
  markInstallmentPaid,
  getAllSubscriptions,
  cancelSubscription,
  getDashboardStats,
  collectOutstandingBalance,
  refundDuplicatePayment,
  getRefunds,
  unlockMemberIdEntry,
  revealMemberIdNumber,
} from "../controllers/admin.controller.js";
import { idRevealLimiter } from "../middleware/rateLimiter.middleware.js";

const router = Router();

// import { runReminderJob } from "../jobs/subscriptionReminder.job.js";
// router.post("/test-cron", async (req, res) => {
//   await runReminderJob();
//   res.json({ success: true });
// });

// All admin routes require authentication + session guard + admin role
router.use(authenticate, sessionGuard, authorize("admin"));

// Dashboard
router.get("/dashboard", getDashboardStats);

// Members
router.get("/members", searchMembers);
router.get("/members/:id", getMemberProfile);

// Government ID: desk unlock (once, 30 min) and "Show ID number"
router.post("/members/:id/id/unlock", unlockMemberIdEntry);
router.post("/members/:id/id/reveal", idRevealLimiter, revealMemberIdNumber);

// Subscriptions
router.get("/subscriptions", getAllSubscriptions);
router.post("/subscriptions/offline", recordOfflinePayment);
router.patch("/subscriptions/:id/cancel", cancelSubscription);
router.post("/subscriptions/:id/collect", collectOutstandingBalance);

// Payments / refunds
router.get("/refunds", getRefunds);
router.post("/payments/:id/refund", refundDuplicatePayment);

// Installments
router.patch("/installments/:id", markInstallmentPaid);

export default router;
