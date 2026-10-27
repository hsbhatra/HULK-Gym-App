// =============================================================================
// src/middleware/auth/staff.middleware.js
// =============================================================================
// Staff panel access (admin + receptionist).
//
// The role is read from the DATABASE on every request — not from the login
// token, which keeps an old role for up to 15 minutes. So the moment an admin
// removes someone's receptionist role (or deactivates them) their next click
// is refused.
//
//   router.use(authenticate, sessionGuard, loadStaff);
//   router.get("/x", handler);              // admin and receptionist
//   router.post("/y", adminOnly, handler);  // admin only
// =============================================================================

import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/apiError.js";
import User from "../../models/user.model.js";
import { USER_ROLES, STAFF_ROLES } from "../../utils/constants.js";

export const loadStaff = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.userId).select("role isActive deletedAt firstName lastName");
  if (!user || user.isActive === false || user.deletedAt) {
    throw ApiError.unauthorized("This account can no longer sign in.");
  }
  if (!STAFF_ROLES.includes(user.role)) {
    throw ApiError.forbidden("Access denied. This area is for gym staff only.");
  }
  req.actor = { id: String(user._id), role: user.role, name: `${user.firstName} ${user.lastName}`.trim() };
  next();
});

export const adminOnly = (req, res, next) => {
  if (req.actor?.role !== USER_ROLES.ADMIN) {
    return next(ApiError.forbidden("Only the admin can do this."));
  }
  next();
};
