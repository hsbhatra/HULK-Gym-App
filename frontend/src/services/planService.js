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

// order = every plan id, top → bottom
export const reorderPlans = (order) =>
  api.patch("/admin/plans/reorder", { order });