// =============================================================================
// src/components/layout/AdminLayout.jsx
// =============================================================================
// Shared shell for all admin pages — sidebar + top bar + content area.
// =============================================================================

import { useNavigate, useLocation } from "react-router-dom";
import Logo from "../ui/Logo.jsx";
import { useAuthStore } from "../../store/authStore.js";
import { logoutUser } from "../../services/authService.js";
import toast from "react-hot-toast";

export default function AdminLayout({ children }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = useAuthStore((s) => s.user);
  const logout    = useAuthStore((s) => s.logout);

  const navItems = [
    { path: "/admin",         label: "Dashboard", icon: "📊" },
    { path: "/admin/plans",   label: "Plans",     icon: "📦" },
    { path: "/admin/members", label: "Members",   icon: "👥" },
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

  const sidebarItemStyle = (isActive) => ({
    display       : "flex",
    alignItems    : "center",
    gap           : "12px",
    padding       : "12px 16px",
    borderRadius  : "10px",
    cursor        : "pointer",
    background    : isActive ? "rgba(232,196,74,0.1)" : "transparent",
    border        : `1px solid ${isActive ? "rgba(232,196,74,0.2)" : "transparent"}`,
    color         : isActive ? "#e8c44a" : "rgba(255,255,255,0.5)",
    fontSize      : "14px",
    fontWeight    : isActive ? "600" : "400",
    transition    : "all 0.2s",
    textDecoration: "none",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a" }}>
      {/* Mobile: hide sidebar + name, show a horizontal tab bar instead */}
      <style>{`
        .admin-mobile-nav { display: none; }
        @media (max-width: 767px) {
          .admin-sidebar { display: none !important; }
          .admin-mobile-nav { display: flex; }
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
        background: "rgba(10,10,10,0.95)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Logo size="sm" />
          <span style={{
            fontSize: "11px", padding: "3px 10px", borderRadius: "100px",
            background: "rgba(232,196,74,0.1)", border: "1px solid rgba(232,196,74,0.2)",
            color: "#e8c44a", fontWeight: "700", letterSpacing: "1px",
          }}>
            ADMIN
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="admin-user-name" style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
            {user?.firstName} {user?.lastName}
          </span>
          <button onClick={() => navigate("/")} className="btn-ghost admin-exit-btn" style={{ padding: "7px 16px", fontSize: "13px" }}>
            Exit Admin
          </button>
          <button onClick={handleLogout} className="btn-ghost" style={{ padding: "7px 16px", fontSize: "13px" }}>
            Logout
          </button>
        </div>
      </nav>

      {/* Layout */}
      <div style={{ paddingTop: "60px", display: "flex" }}>

        {/* Sidebar */}
        <aside className="admin-sidebar" style={{
          width: "220px", flexShrink: 0,
          borderRight: "1px solid rgba(255,255,255,0.05)",
          padding: "24px 16px",
          position: "sticky", top: "60px",
          height: "calc(100vh - 60px)",
        }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {navItems.map((item) => (
              <div
                key={item.path}
                style={sidebarItemStyle(isActive(item.path))}
                onClick={() => navigate(item.path)}>
                <span style={{ fontSize: "16px" }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        {/* minWidth 0 lets the flex child shrink — without it wide content
            pushed the page past the screen edge on small devices */}
        <main className="admin-main" style={{ flex: 1, minWidth: 0, padding: "32px 40px", maxWidth: "1200px" }}>
          <nav className="admin-mobile-nav" style={{ gap: "8px", marginBottom: "20px", overflowX: "auto" }}>
            {navItems.map((item) => (
              <div
                key={item.path}
                style={{ ...sidebarItemStyle(isActive(item.path)), padding: "8px 14px", whiteSpace: "nowrap" }}
                onClick={() => navigate(item.path)}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </nav>
          {children}
        </main>
      </div>
    </div>
  );
}