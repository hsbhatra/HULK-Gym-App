// =============================================================================
// src/components/layout/AdminLayout.jsx
// =============================================================================
// Shared shell for all admin pages — sidebar + top bar + content area.
// =============================================================================

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Logo from "../ui/Logo.jsx";
import { useAuthStore } from "../../store/authStore.js";
import { logoutUser } from "../../services/authService.js";
import toast from "react-hot-toast";
import { LayoutDashboard, Package, RotateCcw, Users } from "lucide-react";
import api from "../../services/api.js";

export default function AdminLayout({ children }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = useAuthStore((s) => s.user);
  const logout    = useAuthStore((s) => s.logout);

  // Pending-refund count for the sidebar badge. Refreshes on every admin page
  // change and right after a refund is issued.
  const [refundsPending, setRefundsPending] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () =>
      api.get("/admin/refunds")
        .then((res) => alive && setRefundsPending(res.data?.data?.due?.length || 0))
        .catch(() => {});
    // The Refunds page sends its fresh count; anything else triggers a reload
    const onChange = (e) =>
      typeof e.detail?.pending === "number" ? setRefundsPending(e.detail.pending) : load();
    load();
    window.addEventListener("hg:refunds-changed", onChange);
    return () => {
      alive = false;
      window.removeEventListener("hg:refunds-changed", onChange);
    };
  }, [location.pathname]);

  const navItems = [
    { path: "/admin",         label: "Dashboard", icon: <LayoutDashboard size={18} aria-hidden="true" /> },
    { path: "/admin/plans",   label: "Plans",     icon: <Package size={18} aria-hidden="true" /> },
    { path: "/admin/members", label: "Members",   icon: <Users size={18} aria-hidden="true" /> },
    { path: "/admin/refunds", label: "Refunds",   icon: <RotateCcw size={18} aria-hidden="true" />, badge: refundsPending },
  ];

  // Must revoke the server session too — clearing local state alone left the
  // refresh cookie valid, so a page reload logged the admin straight back in.
  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {}
    navigate("/", { replace: true });
    logout({ manual: true });
    toast.success("Logged out successfully.");
  };

  // "/admin/members/:id" should still highlight "Members"
  const isActive = (path) =>
    path === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(path);

  return (
    <div className="admin-shell" style={{ minHeight: "100vh" }}>
      {/* Mobile: hide sidebar + name, show a horizontal tab bar instead */}
      <style>{`
        .admin-mobile-nav { display: none; }
        @media (max-width: 767px) {
          .admin-sidebar { display: none !important; }
          .admin-mobile-nav { display: grid; grid-template-columns: 1fr 1fr; }
          .admin-main { padding: 20px 16px !important; }
          .admin-topbar { padding: 0 12px !important; }
          .admin-user-name, .admin-exit-btn { display: none !important; }
        }
      `}</style>

      {/* Top bar */}
      <nav className="admin-topbar" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        height: "60px", padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(10,10,11,0.94)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid #26262a",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Logo size="sm" />
          <span style={{
            fontSize: "13px", padding: "4px 10px", borderRadius: "999px",
            background: "var(--ember)", color: "#ffffff", fontWeight: "800", letterSpacing: "1.5px",
          }}>
            ADMIN
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="admin-user-name" style={{ fontSize: "15px", color: "var(--text-2)" }}>
            {user?.firstName} {user?.lastName}
          </span>
          <button type="button" onClick={() => navigate("/")} className="btn-ghost btn-sm admin-exit-btn">
            Exit Admin
          </button>
          <button type="button" onClick={handleLogout} className="btn-ghost btn-sm">
            Logout
          </button>
        </div>
      </nav>

      {/* Layout */}
      <div style={{ paddingTop: "60px", display: "flex" }}>

        {/* Sidebar */}
        <aside className="admin-sidebar" style={{
          width: "220px", flexShrink: 0,
          borderRight: "1px solid #26262a",
          padding: "24px 16px",
          position: "sticky", top: "60px",
          height: "calc(100vh - 60px)",
        }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {navItems.map((item) => (
              <button
                type="button"
                key={item.path}
                aria-current={isActive(item.path) ? "page" : undefined}
                className={isActive(item.path) ? "admin-nav-item admin-nav-item--active" : "admin-nav-item"}
                onClick={() => navigate(item.path)}>
                {item.icon}
                <span>{item.label}</span>
                {item.badge > 0 && (
                  <span className="nav-badge" aria-label={`${item.badge} pending`}>{item.badge}</span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        {/* minWidth 0 lets the flex child shrink — without it wide content
            pushed the page past the screen edge on small devices */}
        <main className="admin-main" style={{ flex: 1, minWidth: 0, padding: "32px 40px", maxWidth: "1200px" }}>
          <nav className="admin-mobile-nav" aria-label="Admin" style={{ gap: "8px", marginBottom: "20px" }}>
            {navItems.map((item) => (
              <button
                type="button"
                key={item.path}
                aria-current={isActive(item.path) ? "page" : undefined}
                className={isActive(item.path) ? "admin-nav-item admin-nav-item--active" : "admin-nav-item"}
                style={{ padding: "10px 14px", whiteSpace: "nowrap", justifyContent: "center" }}
                onClick={() => navigate(item.path)}>
                {item.icon}
                <span>{item.label}</span>
                {item.badge > 0 && (
                  <span className="nav-badge" aria-label={`${item.badge} pending`}>{item.badge}</span>
                )}
              </button>
            ))}
          </nav>
          {children}
        </main>
      </div>
    </div>
  );
}