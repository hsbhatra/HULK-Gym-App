// =============================================================================
// src/routes/plan.routes.js
// =============================================================================

import { Router } from "express";
import authenticate from "../middleware/auth/authenticate.middleware.js";
import authorize from "../middleware/auth/authorize.middleware.js";
import sessionGuard from "../middleware/auth/sessionGuard.middleware.js";
import {
  validateCreatePlan,
  validateUpdatePlan,
  validateUpdatePlanStatus,
} from "../middleware/validation/plan.validation.js";

import {
  getPublicPlans,
  getPublicPlanBySlug,
  createPlanAdmin,
  updatePlanAdmin,
  updatePlanStatusAdmin,
  archivePlanAdmin,
  getAllPlansAdminController,
} from "../controllers/plan.controller.js";

const router = Router();

// --- Public routes (pricing page) ---
router.get("/", getPublicPlans);
router.get("/:slug", getPublicPlanBySlug);

export default router;

// =============================================================================
// Admin router — mounted separately at /api/v1/admin/plans in app.js
// =============================================================================

export const adminPlanRouter = Router();

adminPlanRouter.use(authenticate, sessionGuard, authorize("admin"));

adminPlanRouter.get   ("/",           getAllPlansAdminController);
adminPlanRouter.post  ("/",           validateCreatePlan,       createPlanAdmin);
adminPlanRouter.patch ("/:id",        validateUpdatePlan,       updatePlanAdmin);
adminPlanRouter.patch ("/:id/status", validateUpdatePlanStatus, updatePlanStatusAdmin);
adminPlanRouter.delete("/:id",        archivePlanAdmin);
