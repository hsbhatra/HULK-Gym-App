// =============================================================================
// src/components/layout/AdminRoute.jsx
// =============================================================================
// Protects admin-only routes. Checks BOTH:
//   1. User is authenticated (logged in)
//   2. User's role is "admin"
//
// Non-admin logged-in users are redirected to "/" (not "/login" — they ARE
// logged in, they just don't have permission).
// =============================================================================

import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";

export default function AdminRoute({ children }) {
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

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}