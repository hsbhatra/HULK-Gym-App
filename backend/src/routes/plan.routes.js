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
  validateReorderPlans,
} from "../middleware/validation/plan.validation.js";

import {
  getPublicPlans,
  getPublicPlanBySlug,
  createPlanAdmin,
  updatePlanAdmin,
  updatePlanStatusAdmin,
  archivePlanAdmin,
  getAllPlansAdminController,
  reorderPlansAdmin,
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
// Must be declared before "/:id" so "reorder" isn't read as a plan id
adminPlanRouter.patch ("/reorder",    validateReorderPlans,     reorderPlansAdmin);
adminPlanRouter.patch ("/:id",        validateUpdatePlan,       updatePlanAdmin);
adminPlanRouter.patch ("/:id/status", validateUpdatePlanStatus, updatePlanStatusAdmin);
adminPlanRouter.delete("/:id",        archivePlanAdmin);
