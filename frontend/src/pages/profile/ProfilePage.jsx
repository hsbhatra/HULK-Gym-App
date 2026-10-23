// =============================================================================
// src/pages/profile/ProfilePage.jsx
// =============================================================================

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/authStore.js";
import {
  getProfile,
  updateProfile,
  updateProfilePicture,
  deleteProfilePicture,
} from "../../services/profileService.js";
import {
  getSessions,
  logoutUser,
  logoutAllDevices,
  changePassword,
} from "../../services/authService.js";
import ParticleBackground from "../../components/three/ParticleBackground.jsx";
import Logo from "../../components/ui/Logo.jsx";
import ConfirmDialog from "../../components/ui/ConfirmDialog.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { slideInRight } from "../../utils/animations.js";
import { getMyActiveSubscription } from "../../services/subscriptionService.js";
import ProfileSection from "../../components/profile/ProfileSection.jsx";
import SessionsSection from "../../components/profile/SessionsSection.jsx";
import ChangePasswordSection from "../../components/profile/ChangePasswordSection.jsx";
import MembershipSection from "../../components/profile/MembershipSection.jsx";
import IdProofSection from "../../components/profile/IdProofSection.jsx";
import { BadgeCheck, House, IdCard, Lock, MonitorSmartphone, User } from "lucide-react";

// =============================================================================
// ProfilePage — Main Component
// =============================================================================
export default function ProfilePage() {
  const navigate = useNavigate();
  const storeLogout = useAuthStore((s) => s.logout);
  const storeUser = useAuthStore((s) => s.user);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await getProfile();
      setUser(res.data.data.user);
    } catch {
      toast.error("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {}
    // Leave /profile BEFORE clearing auth, otherwise ProtectedRoute sees a
    // logged-out user first and redirects to /login?redirect=/profile.
    navigate("/", { replace: true });
    storeLogout({ manual: true });
    toast.success("Logged out successfully.");
  };

  const navItems = [
    { id: "profile", label: "Profile", icon: <User size={18} aria-hidden="true" /> },
    { id: "membership", label: "Membership", icon: <BadgeCheck size={18} aria-hidden="true" /> },
    { id: "idproof", label: "ID Proof", icon: <IdCard size={18} aria-hidden="true" /> },
    { id: "sessions", label: "Active Sessions", icon: <MonitorSmartphone size={18} aria-hidden="true" /> },
    { id: "password", label: "Change Password", icon: <Lock size={18} aria-hidden="true" /> },
  ];

  const sidebarItemStyle = (isActive) => ({
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    borderRadius: "999px",
    cursor: "pointer",
    // Same treatment as the admin sidebar: solid yellow pill with ember shadow
    background: isActive ? "var(--yellow)" : "transparent",
    border: `1px solid ${isActive ? "var(--yellow)" : "transparent"}`,
    boxShadow: isActive ? "3px 3px 0 var(--ember)" : "none",
    color: isActive ? "var(--iron-950)" : "#bdbdb6",
    fontSize: "16px",
    fontWeight: isActive ? "700" : "600",
    transition: "all 0.2s",
    userSelect: "none",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--iron-950)",
        position: "relative",
      }}
    >
      <ParticleBackground />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background:
            "radial-gradient(ellipse at 30% 50%, rgba(243,212,0,0.04) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />

      {/* ── Top Navbar ── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          height: "60px",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(10,10,10,0.9)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid #26262a",
        }}
      >
        <Logo size="md" />
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {user && (
            <span style={{ fontSize: "15px", color: "rgba(255,255,255,0.62)" }}>
              Hi,{" "}
              <span style={{ color: "#f3d400", fontWeight: "600" }}>
                {user.firstName}
              </span>
            </span>
          )}
          <button
            onClick={handleLogout}
            className="btn-ghost"
            style={{ padding: "7px 16px", fontSize: "15px" }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* ── Main Layout ── */}
      <div
        className="profile-layout"
        style={{ paddingTop: "60px", position: "relative", zIndex: 1 }}
      >
        {/* ── Sidebar ── */}
        <aside
          className="profile-sidebar"
          style={{
            width: "240px",
            flexShrink: 0,
            borderRight: "1px solid #26262a",
            padding: "32px 16px",
            position: "sticky",
            top: "60px",
            height: "calc(100vh - 60px)",
            display: "flex",
            flexDirection: "column",
            background: "rgba(10,10,10,0.5)",
          }}
        >
          {/* User mini card */}
          {user && (
            <div
              className="sidebar-mini-card"
              style={{
                padding: "16px",
                borderRadius: "12px",
                background: "var(--iron-850)",
                border: "1px solid #26262a",
                marginBottom: "24px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  margin: "0 auto 10px",
                  background: "var(--iron-850)",
                  border: "2px solid rgba(243,212,0,0.3)",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: "20px",
                      fontWeight: "800",
                      color: "#f3d400",
                    }}
                  >
                    {user.firstName?.[0]}
                  </span>
                )}
              </div>
              <p
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  marginBottom: "2px",
                }}
              >
                {user.firstName} {user.lastName}
              </p>
              <p
                style={{
                  fontSize: "13px",
                  color: "#f3d400",
                  fontWeight: "600",
                }}
              >
                @{user.userId}
              </p>
            </div>
          )}

          {/* Nav items */}
          <nav
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              flex: 1,
            }}
          >
            {navItems.map((item) => (
              <motion.button
                type="button"
                key={item.id}
                aria-current={activeTab === item.id ? "page" : undefined}
                style={{ ...sidebarItemStyle(activeTab === item.id), width: "100%", textAlign: "left", fontFamily: "inherit" }}
                onClick={() => setActiveTab(item.id)}
                whileHover={{ x: 4, transition: { duration: 0.15 } }}
                whileTap={{ scale: 0.98 }}
              >
                <span style={{ fontSize: "19px", display: "inline-flex" }}>{item.icon}</span>
                <span>{item.label}</span>
              </motion.button>
            ))}
          </nav>

          {/* Back to home */}
          <div
            className="sidebar-back"
            style={{
              marginTop: "auto",
              paddingTop: "16px",
              borderTop: "1px solid #26262a",
            }}
          >
            <button
              type="button"
              style={{ ...sidebarItemStyle(false), width: "100%", textAlign: "left", fontFamily: "inherit" }}
              onClick={() => navigate("/")}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.color = "#edede8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#bdbdb6";
              }}
            >
              <House size={16} aria-hidden="true" />
              <span>Back to Home</span>
            </button>
          </div>
        </aside>

        {/* ── Content Area ── */}
        <main
          className="profile-content"
          style={{
            flex: 1,
            padding: "40px 48px",
            maxWidth: "900px",
            overflowY: "auto",
          }}
        >
          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "300px",
                color: "rgba(255,255,255,0.55)",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  className="spinner"
                  style={{
                    borderColor: "rgba(255,255,255,0.1)",
                    borderTopColor: "#f3d400",
                    width: "32px",
                    height: "32px",
                    margin: "0 auto 16px",
                  }}
                />
                Loading your profile...
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={slideInRight.initial}
                animate={slideInRight.animate}
                exit={slideInRight.exit}
                transition={slideInRight.transition}
              >
                {activeTab === "profile" && (
                  <ProfileSection user={user} onUpdate={setUser} />
                )}
                {activeTab === "membership" && <MembershipSection />}
                {activeTab === "idproof" && (
                  <IdProofSection user={user} onUpdate={setUser} />
                )}
                {activeTab === "sessions" && (
                  <SessionsSection onLogout={() => navigate("/")} />
                )}
                {activeTab === "password" && <ChangePasswordSection />}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  );
}
