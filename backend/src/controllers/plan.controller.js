// =============================================================================
// src/controllers/plan.controller.js
// =============================================================================

import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import { HTTP_STATUS } from "../utils/constants.js";

import {
  createPlan,
  updatePlan,
  updatePlanStatus,
  archivePlan,
  getAllPlansAdmin,
  getActivePlans,
  getPlanBySlug,
  reorderPlans,
} from "../services/plan.service.js";

// =============================================================================
// PUBLIC ENDPOINTS
// =============================================================================

// GET /api/v1/plans
export const getPublicPlans = asyncHandler(async (req, res) => {
  const plans = await getActivePlans();

  return new ApiResponse(
    HTTP_STATUS.OK,
    "Membership plans retrieved successfully.",
    { plans }
  ).send(res);
});

// GET /api/v1/plans/:slug
export const getPublicPlanBySlug = asyncHandler(async (req, res) => {
  const plan = await getPlanBySlug(req.params.slug);

  return new ApiResponse(
    HTTP_STATUS.OK,
    "Plan details retrieved successfully.",
    { plan }
  ).send(res);
});

// =============================================================================
// ADMIN ENDPOINTS
// =============================================================================

// POST /api/v1/admin/plans
export const createPlanAdmin = asyncHandler(async (req, res) => {
  const plan = await createPlan(req.body, req.user.userId);

  return new ApiResponse(
    HTTP_STATUS.CREATED,
    "Membership plan created successfully.",
    { plan }
  ).send(res);
});

// PATCH /api/v1/admin/plans/:id
export const updatePlanAdmin = asyncHandler(async (req, res) => {
  const plan = await updatePlan(req.params.id, req.body);

  return new ApiResponse(
    HTTP_STATUS.OK,
    "Membership plan updated successfully.",
    { plan }
  ).send(res);
});

// PATCH /api/v1/admin/plans/:id/status
export const updatePlanStatusAdmin = asyncHandler(async (req, res) => {
  const plan = await updatePlanStatus(req.params.id, req.body.status);

  return new ApiResponse(
    HTTP_STATUS.OK,
    `Plan status updated to "${req.body.status}".`,
    { plan }
  ).send(res);
});

// DELETE /api/v1/admin/plans/:id  (archives, never hard-deletes)
export const archivePlanAdmin = asyncHandler(async (req, res) => {
  const { plan, activeSubscriberCount } = await archivePlan(req.params.id);

  const message = activeSubscriberCount > 0
    ? `Plan archived. Note: ${activeSubscriberCount} member(s) still have active subscriptions on this plan — they are unaffected.`
    : "Plan archived successfully.";

  return new ApiResponse(HTTP_STATUS.OK, message, { plan }).send(res);
});

// PATCH /api/v1/admin/plans/reorder   body: { order: [planId, planId, …] }
export const reorderPlansAdmin = asyncHandler(async (req, res) => {
  const plans = await reorderPlans(req.body.order);

  return new ApiResponse(HTTP_STATUS.OK, "Plan order saved.", { plans }).send(res);
});

// GET /api/v1/admin/plans
export const getAllPlansAdminController = asyncHandler(async (req, res) => {
  const plans = await getAllPlansAdmin();

  return new ApiResponse(
    HTTP_STATUS.OK,
    "All membership plans retrieved successfully.",
    { plans }
  ).send(res);
});
