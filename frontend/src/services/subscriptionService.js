// =============================================================================
// src/services/subscriptionService.js
// =============================================================================

import api from "./api.js";

export const initiateSubscription = (planId, durationDays) =>
  api.post("/subscriptions/initiate", { planId, durationDays });

export const verifySubscription = (data) =>
  api.post("/subscriptions/verify", data);

export const getMySubscriptions = () =>
  api.get("/subscriptions/my");

export const getMyActiveSubscription = () =>
  api.get("/subscriptions/my/active");

export const getMyReceipts = () =>
  api.get("/subscriptions/my/receipts");
