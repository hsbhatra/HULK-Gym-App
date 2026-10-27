// =============================================================================
// src/components/layout/AdminRoute.jsx
// =============================================================================
// Protects staff routes. Checks BOTH:
//   1. User is authenticated (logged in)
//   2. User is staff — admin or receptionist. With `adminOnly`, admin alone.
//
// Anyone else who is logged in is redirected ("/" for members, the Members
// page for a receptionist on an admin-only page) — not "/login", they ARE
// logged in, they just don't have permission.
// =============================================================================

import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";
import { isStaffUser, isAdminUser, homePathFor } from "../../utils/roles.js";

export default function AdminRoute({ children, adminOnly = false }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user             = useAuthStore((s) => s.user);

  const manualLogout     = useAuthStore((s) => s.manualLogout);
  const location         = useLocation();

  if (!isAuthenticated) {
    if (manualLogout) return null;
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  if (!isStaffUser(user)) {
    return <Navigate to="/" replace />;
  }
  if (adminOnly && !isAdminUser(user)) {
    return <Navigate to={homePathFor(user)} replace />;
  }

  return children;
}