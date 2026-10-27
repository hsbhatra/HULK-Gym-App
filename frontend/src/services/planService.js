// =============================================================================
// src/services/planService.js
// =============================================================================

import api from "./api.js";

// ── Public ────────────────────────────────────────────────────────────────────

export const getPublicPlans = () =>
  api.get("/plans");

export const getPlanBySlug = (slug) =>
  api.get(`/plans/${slug}`);

// ── Admin ─────────────────────────────────────────────────────────────────────

export const getAllPlansAdmin = () =>
  api.get("/admin/plans");

export const createPlan = (data) =>
  api.post("/admin/plans", data);

export const updatePlan = (id, data) =>
  api.patch(`/admin/plans/${id}`, data);

export const updatePlanStatus = (id, status) =>
  api.patch(`/admin/plans/${id}/status`, { status });

export const archivePlan = (id) =>
  api.delete(`/admin/plans/${id}`);

// order = the plan ids of ONE list, top → bottom; group = "landing" | "other"
export const reorderPlans = (order, group) =>
  api.patch("/admin/plans/reorder", { order, group });

// Show a plan on the landing page (true) or move it to "Other plans" (false)
export const setLandingVisibility = (id, show) =>
  api.patch(`/admin/plans/${id}/landing`, { show });
