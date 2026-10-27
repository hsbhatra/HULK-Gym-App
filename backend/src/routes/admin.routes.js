// =============================================================================
// src/routes/admin.routes.js
// =============================================================================

import { Router } from "express";
import authenticate from "../middleware/auth/authenticate.middleware.js";
import sessionGuard from "../middleware/auth/sessionGuard.middleware.js";
import { loadStaff, adminOnly } from "../middleware/auth/staff.middleware.js";

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
  getDeletionRequests,
  approveDeletionRequest,
  rejectDeletionRequest,
  setMemberRole,
} from "../controllers/admin.controller.js";
import { revenueAnalytics, memberAnalytics, duesAnalytics, renewalAnalytics } from "../controllers/analytics.controller.js";
import { idRevealLimiter, staffWriteLimiter } from "../middleware/rateLimiter.middleware.js";

const router = Router();

// import { runReminderJob } from "../jobs/subscriptionReminder.job.js";
// router.post("/test-cron", async (req, res) => {
//   await runReminderJob();
//   res.json({ success: true });
// });

// Everything here needs a signed-in staff member (admin or receptionist); the
// role is checked against the database. Routes marked adminOnly are for the
// admin alone — a receptionist gets 403 from the server, not just a hidden button.
router.use(authenticate, sessionGuard, loadStaff);

// Dashboard
router.get("/dashboard", adminOnly, getDashboardStats);

// Analytics (admin only; ?from=YYYY-MM-DD&to=YYYY-MM-DD, default last 30 days)
router.get("/analytics/revenue", adminOnly, revenueAnalytics);
router.get("/analytics/members", adminOnly, memberAnalytics);
router.get("/analytics/dues", adminOnly, duesAnalytics);
router.get("/analytics/renewals", adminOnly, renewalAnalytics);

// Members
router.get("/members", searchMembers);
router.get("/members/:id", getMemberProfile);

// Government ID: desk unlock (once, 30 min) and "Show ID number"
router.post("/members/:id/id/unlock", unlockMemberIdEntry);
router.post("/members/:id/id/reveal", adminOnly, idRevealLimiter, revealMemberIdNumber);

// Receptionist role (admin only)
router.patch("/members/:id/role", adminOnly, setMemberRole);

// Subscriptions
router.get("/subscriptions", adminOnly, getAllSubscriptions);
router.post("/subscriptions/offline", staffWriteLimiter, recordOfflinePayment);
router.patch("/subscriptions/:id/cancel", adminOnly, cancelSubscription);
router.post("/subscriptions/:id/collect", staffWriteLimiter, collectOutstandingBalance);

// Payments / refunds
router.get("/refunds", adminOnly, getRefunds);
router.post("/payments/:id/refund", adminOnly, refundDuplicatePayment);

// Account deletion requests (member asks, admin approves or rejects)
router.get("/deletion-requests", adminOnly, getDeletionRequests);
router.post("/deletion-requests/:id/approve", adminOnly, approveDeletionRequest);
router.post("/deletion-requests/:id/reject", adminOnly, rejectDeletionRequest);

// Installments
router.patch("/installments/:id", staffWriteLimiter, markInstallmentPaid);

export default router;
