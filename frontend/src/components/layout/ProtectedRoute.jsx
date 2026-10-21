import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";

export function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const manualLogout    = useAuthStore((s) => s.manualLogout);
  const location        = useLocation();

  if (!isAuthenticated) {
    if (manualLogout) return null;
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  return children;
}

// Same-app paths only ("/x") — never "//host" or "https://…"
const safePath = (p) => (p && p.startsWith("/") && !p.startsWith("//") ? p : null);

export function PublicRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user            = useAuthStore((s) => s.user);
  const [searchParams]  = useSearchParams();

  if (isAuthenticated) {
    // This fires the moment login succeeds, so it must honour ?redirect=
    // (otherwise it races the page's own navigate() and wins with "/").
    const target =
      safePath(searchParams.get("redirect")) ||
      (user?.role === "admin" ? "/admin" : "/");
    return <Navigate to={target} replace />;
  }
  return children;
}
