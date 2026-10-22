// =============================================================================
// src/services/plan.service.js
// =============================================================================

import MembershipPlan from "../models/membershipPlan.model.js";
import Subscription from "../models/subscription.model.js";
import ApiError from "../utils/apiError.js";
import { PLAN_STATUS } from "../utils/constants.js";

// =============================================================================
// createPlan
// =============================================================================
// Creates a new membership plan. Admin only.
// Validates that slug is unique and pricing tiers are complete (done by schema).
// =============================================================================

export const createPlan = async (planData, adminId) => {
  const existingSlug = await MembershipPlan.findOne({ slug: planData.slug });
  if (existingSlug) {
    throw ApiError.conflict(`A plan with slug "${planData.slug}" already exists.`);
  }

  // New plans go to the end of the list; admins reorder from the Plans page
  const last = await MembershipPlan.findOne().sort({ displayOrder: -1 }).select("displayOrder");

  const plan = await MembershipPlan.create({
    ...planData,
    displayOrder: (last?.displayOrder || 0) + 1,
    createdBy: adminId,
  });

  return plan;
};

// =============================================================================
// updatePlan
// =============================================================================
// Updates an existing plan. Admin only.
//
// IMPORTANT: This does NOT affect existing subscribers — their planSnapshot
// already captured the old plan details at purchase time.
// =============================================================================

export const updatePlan = async (planId, updateData) => {
  // Order is changed only through reorderPlans — keeps numbers 1..n consistent
  delete updateData.displayOrder;

  // If slug is being changed, ensure new slug isn't taken by another plan
  if (updateData.slug) {
    const existingSlug = await MembershipPlan.findOne({
      slug: updateData.slug,
      _id : { $ne: planId },
    });
    if (existingSlug) {
      throw ApiError.conflict(`A plan with slug "${updateData.slug}" already exists.`);
    }
  }

  const plan = await MembershipPlan.findByIdAndUpdate(
    planId,
    { $set: updateData },
    { returnDocument: "after", runValidators: true }
  );

  if (!plan) {
    throw ApiError.notFound("Membership plan not found.");
  }

  return plan;
};

// =============================================================================
// updatePlanStatus
// =============================================================================
// Changes a plan's status: active / inactive / archived.
//
// Business rule: Archiving a plan does NOT cancel existing subscriptions.
// It only prevents NEW purchases of this plan.
// =============================================================================

export const updatePlanStatus = async (planId, newStatus) => {
  if (!Object.values(PLAN_STATUS).includes(newStatus)) {
    throw ApiError.badRequest("Invalid plan status.");
  }

  const plan = await MembershipPlan.findByIdAndUpdate(
    planId,
    { $set: { status: newStatus } },
    { returnDocument: "after" }
  );

  if (!plan) {
    throw ApiError.notFound("Membership plan not found.");
  }

  return plan;
};

// =============================================================================
// archivePlan
// =============================================================================
// Soft-deletes a plan by archiving it. We NEVER hard-delete plans because
// existing subscriptions reference them (planId foreign key).
//
// Checks if plan has active subscribers first — informs admin either way.
// =============================================================================

export const archivePlan = async (planId) => {
  const activeSubscriberCount = await Subscription.countDocuments({
    planId,
    status: { $in: ["active", "grace"] },
  });

  const plan = await MembershipPlan.findByIdAndUpdate(
    planId,
    { $set: { status: PLAN_STATUS.ARCHIVED } },
    { returnDocument: "after" }
  );

  if (!plan) {
    throw ApiError.notFound("Membership plan not found.");
  }

  return { plan, activeSubscriberCount };
};

// =============================================================================
// getAllPlansAdmin
// =============================================================================
// Returns ALL plans regardless of status — for the admin panel.
// Includes active, inactive, and archived plans.
// =============================================================================

export const getAllPlansAdmin = async () => {
  return await MembershipPlan.find().sort({ displayOrder: 1, createdAt: 1 });
};

// =============================================================================
// reorderPlans
// =============================================================================
// Receives every plan id in the order the admin arranged them (top → bottom)
// and saves displayOrder 1, 2, 3… The list must contain each plan exactly once
// so a stale tab can't leave gaps or duplicate positions.
// =============================================================================

export const reorderPlans = async (orderedIds) => {
  if (new Set(orderedIds).size !== orderedIds.length) {
    throw ApiError.badRequest("Each plan can appear only once.");
  }

  const [total, found] = await Promise.all([
    MembershipPlan.countDocuments(),
    MembershipPlan.countDocuments({ _id: { $in: orderedIds } }),
  ]);
  if (found !== orderedIds.length || total !== orderedIds.length) {
    throw ApiError.conflict("The plan list has changed. Refresh the page and try again.");
  }

  await MembershipPlan.bulkWrite(
    orderedIds.map((id, i) => ({
      updateOne: { filter: { _id: id }, update: { $set: { displayOrder: i + 1 } } },
    })),
  );

  return getAllPlansAdmin();
};

// =============================================================================
// getActivePlans
// =============================================================================
// Returns only active plans — for the public pricing page.
// =============================================================================

export const getActivePlans = async () => {
  return await MembershipPlan.findActivePlans();
};

// =============================================================================
// getPlanBySlug
// =============================================================================
// Returns a single plan by its slug — for the plan detail page.
// Only returns active plans to public callers.
// =============================================================================

export const getPlanBySlug = async (slug, includeInactive = false) => {
  const query = { slug };
  if (!includeInactive) {
    query.status = PLAN_STATUS.ACTIVE;
  }

  const plan = await MembershipPlan.findOne(query);
  if (!plan) {
    throw ApiError.notFound("Membership plan not found.");
  }

  return plan;
};

// =============================================================================
// getPlanById
// =============================================================================
// Returns a single plan by ID — used internally when creating subscriptions.
// =============================================================================

export const getPlanById = async (planId) => {
  const plan = await MembershipPlan.findById(planId);
  if (!plan) {
    throw ApiError.notFound("Membership plan not found.");
  }
  return plan;
};
