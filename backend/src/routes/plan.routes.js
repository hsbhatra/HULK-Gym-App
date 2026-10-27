// =============================================================================
// src/routes/plan.routes.js
// =============================================================================

import { Router } from "express";
import authenticate from "../middleware/auth/authenticate.middleware.js";
import { loadStaff, adminOnly } from "../middleware/auth/staff.middleware.js";
import sessionGuard from "../middleware/auth/sessionGuard.middleware.js";
import {
  validateCreatePlan,
  validateUpdatePlan,
  validateUpdatePlanStatus,
  validateReorderPlans,
  validateLandingVisibility,
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
  setLandingVisibilityAdmin,
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

// Staff (admin + receptionist) may LIST plans to give a membership at the desk;
// every change to a plan is admin only.
adminPlanRouter.use(authenticate, sessionGuard, loadStaff);

adminPlanRouter.get   ("/",           getAllPlansAdminController);
adminPlanRouter.post  ("/",           adminOnly, validateCreatePlan,       createPlanAdmin);
// Must be declared before "/:id" so "reorder" isn't read as a plan id
adminPlanRouter.patch ("/reorder",    adminOnly, validateReorderPlans,     reorderPlansAdmin);
adminPlanRouter.patch ("/:id",        adminOnly, validateUpdatePlan,       updatePlanAdmin);
adminPlanRouter.patch ("/:id/status", adminOnly, validateUpdatePlanStatus, updatePlanStatusAdmin);
adminPlanRouter.patch ("/:id/landing", adminOnly, validateLandingVisibility, setLandingVisibilityAdmin);
adminPlanRouter.delete("/:id",        adminOnly, archivePlanAdmin);
