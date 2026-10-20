// =============================================================================
// src/routes/admin.routes.js
// =============================================================================

import { Router } from "express";
import authenticate from "../middleware/auth/authenticate.middleware.js";
import authorize from "../middleware/auth/authorize.middleware.js";

import {
  searchMembers,
  getMemberProfile,
  recordOfflinePayment,
  markInstallmentPaid,
  getAllSubscriptions,
  cancelSubscription,
  getDashboardStats,
} from "../controllers/admin.controller.js";

const router = Router();

// import { runReminderJob } from "../jobs/subscriptionReminder.job.js";
// router.post("/test-cron", async (req, res) => {
//   await runReminderJob();
//   res.json({ success: true });
// });

// All admin routes require authentication + admin role
router.use(authenticate, authorize("admin"));
// Dashboard
router.get("/dashboard", getDashboardStats);

// Members
router.get("/members", searchMembers);
router.get("/members/:id", getMemberProfile);

// Subscriptions
router.get("/subscriptions", getAllSubscriptions);
router.post("/subscriptions/offline", recordOfflinePayment);
router.patch("/subscriptions/:id/cancel", cancelSubscription);

// Installments
router.patch("/installments/:id", markInstallmentPaid);

export default router;
