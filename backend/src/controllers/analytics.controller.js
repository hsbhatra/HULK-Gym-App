import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import * as analytics from "../services/analytics.service.js";

const wrap = (fn) =>
  asyncHandler(async (req, res) => {
    const data = await fn(req.query);
    res.set("Cache-Control", "no-store");
    return res.status(200).json(new ApiResponse(200, "OK", data));
  });

export const revenueAnalytics = wrap(analytics.getRevenue);
export const memberAnalytics = wrap(analytics.getMembers);
export const duesAnalytics = wrap(analytics.getDues);
export const renewalAnalytics = wrap(analytics.getRenewals);
