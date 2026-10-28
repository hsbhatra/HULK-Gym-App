// =============================================================================
// src/utils/roles.js
// =============================================================================
// Who is who on the screen. This only decides what to SHOW — the server checks
// the role again on every request, so a hidden button is never the protection.
// =============================================================================

export const isAdminUser = (user) => user?.role === "admin";
export const isStaffUser = (user) => user?.role === "admin" || user?.role === "receptionist";

// Where a signed-in person lands after login / from the navbar
export const homePathFor = (user) =>
  user?.role === "admin" ? "/admin" : user?.role === "receptionist" ? "/admin/members" : "/";

export const roleLabel = (role) =>
  role === "receptionist" ? "Receptionist" : role === "trainer" ? "Trainer" : role === "admin" ? "Admin" : "Member";
