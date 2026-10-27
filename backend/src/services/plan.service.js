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

// Landing-page rule: at least one active plan must stay visible on the landing
// page, otherwise its Plans section would be empty.
const assertNotLastLandingPlan = async (plan, action) => {
  const isLanding = plan.status === PLAN_STATUS.ACTIVE && plan.showOnLanding !== false;
  if (!isLanding) return;
  const others = await MembershipPlan.countDocuments({
    _id: { $ne: plan._id },
    status: PLAN_STATUS.ACTIVE,
    showOnLanding: { $ne: false },
  });
  if (others === 0) {
    throw ApiError.conflict(
      `"${plan.name}" is the only active plan on the landing page, so it can't be ${action}. Put another active plan on the landing page first.`,
    );
  }
};

export const createPlan = async (planData, adminId) => {
  const existingSlug = await MembershipPlan.findOne({ slug: planData.slug });
  if (existingSlug) {
    throw ApiError.conflict(`A plan with slug "${planData.slug}" already exists.`);
  }

  // New plans go to the end of the list; admins reorder from the Plans page
  const last = await MembershipPlan.findOne().sort({ displayOrder: -1 }).select("displayOrder");

  const plan = await MembershipPlan.create({
    ...planData,
    // A new plan stays off the landing page unless the admin switches it on
    showOnLanding: planData.showOnLanding === true,
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
  // Landing-page visibility has its own endpoint (it has safety checks)
  delete updateData.showOnLanding;

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

  const current = await MembershipPlan.findById(planId);
  if (!current) {
    throw ApiError.notFound("Membership plan not found.");
  }
  if (newStatus !== PLAN_STATUS.ACTIVE) {
    await assertNotLastLandingPlan(current, newStatus === PLAN_STATUS.ARCHIVED ? "archived" : "deactivated");
  }

  const plan = await MembershipPlan.findByIdAndUpdate(
    planId,
    { $set: { status: newStatus } },
    { returnDocument: "after" }
  );

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
  const current = await MembershipPlan.findById(planId);
  if (!current) {
    throw ApiError.notFound("Membership plan not found.");
  }
  await assertNotLastLandingPlan(current, "archived");

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
// The admin reorders ONE list at a time: "landing" (plans shown on the
// landing page) or "other". `orderedIds` must be exactly that list's plans,
// each once. They take over the slots that list already occupies in the
// overall sequence, so the other list's order is untouched; then every plan
// is renumbered 1..n so there are never gaps or duplicate positions.
// =============================================================================

const inGroup = (plan, group) => (group === "landing" ? plan.showOnLanding !== false : plan.showOnLanding === false);

export const reorderPlans = async (orderedIds, group) => {
  if (new Set(orderedIds).size !== orderedIds.length) {
    throw ApiError.badRequest("Each plan can appear only once.");
  }

  const all = await getAllPlansAdmin(); // sorted by displayOrder, createdAt
  const groupIds = all.filter((p) => inGroup(p, group)).map((p) => String(p._id));
  const sameSet =
    groupIds.length === orderedIds.length && orderedIds.every((id) => groupIds.includes(String(id)));
  if (!sameSet) {
    throw ApiError.conflict("The plan list has changed. Refresh the page and try again.");
  }

  const queue = orderedIds.map(String);
  const finalOrder = all.map((p) => (inGroup(p, group) ? queue.shift() : String(p._id)));

  await MembershipPlan.bulkWrite(
    finalOrder.map((id, i) => ({
      updateOne: { filter: { _id: id }, update: { $set: { displayOrder: i + 1 } } },
    })),
  );

  return getAllPlansAdmin();
};

// =============================================================================
// setLandingVisibility
// =============================================================================
// Moves a plan between "Landing page plans" and "Other plans". The plan goes
// to the end of the list it joins. The last active landing plan can't leave.
// =============================================================================

export const setLandingVisibility = async (planId, show) => {
  const plan = await MembershipPlan.findById(planId);
  if (!plan) throw ApiError.notFound("Membership plan not found.");

  const currentlyShown = plan.showOnLanding !== false;
  if (currentlyShown === show) return plan; // nothing to change

  if (!show) await assertNotLastLandingPlan(plan, "moved off the landing page");

  const last = await MembershipPlan.findOne().sort({ displayOrder: -1 }).select("displayOrder");
  plan.showOnLanding = show;
  plan.displayOrder = (last?.displayOrder || 0) + 1;
  await plan.save();
  return plan;
};

// =============================================================================
// getActivePlans
// =============================================================================
// Returns only active plans — for the public pricing page.
// =============================================================================

export const getActivePlans = async () => {
  // Landing page only lists plans the admin chose to show
  return await MembershipPlan.findActivePlans({ landingOnly: true });
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
