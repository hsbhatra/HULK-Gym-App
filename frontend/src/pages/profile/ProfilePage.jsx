// =============================================================================
// src/pages/profile/ProfilePage.jsx
// =============================================================================

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import * as THREE from "three";
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
    storeLogout();
    toast.success("Logged out successfully.");
    navigate("/");
  };

  const navItems = [
    { id: "profile", label: "Profile", icon: "👤" },
    { id: "membership", label: "Membership", icon: "🏅" },
    { id: "sessions", label: "Active Sessions", icon: "🖥️" },
    { id: "password", label: "Change Password", icon: "🔒" },
  ];

  const sidebarItemStyle = (isActive) => ({
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    borderRadius: "10px",
    cursor: "pointer",
    background: isActive ? "rgba(232,196,74,0.1)" : "transparent",
    border: `1px solid ${isActive ? "rgba(232,196,74,0.2)" : "transparent"}`,
    color: isActive ? "#e8c44a" : "rgba(255,255,255,0.5)",
    fontSize: "14px",
    fontWeight: isActive ? "600" : "400",
    transition: "all 0.2s",
    userSelect: "none",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
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
            "radial-gradient(ellipse at 30% 50%, rgba(232,196,74,0.04) 0%, transparent 60%)",
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
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <Logo size="md" />
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {user && (
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
              Hi,{" "}
              <span style={{ color: "#e8c44a", fontWeight: "600" }}>
                {user.firstName}
              </span>
            </span>
          )}
          <button
            onClick={handleLogout}
            className="btn-ghost"
            style={{ padding: "7px 16px", fontSize: "13px" }}
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
            borderRight: "1px solid rgba(255,255,255,0.05)",
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
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
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
                  background: "#1a1a1a",
                  border: "2px solid rgba(232,196,74,0.3)",
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
                      color: "#e8c44a",
                    }}
                  >
                    {user.firstName?.[0]}
                  </span>
                )}
              </div>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  marginBottom: "2px",
                }}
              >
                {user.firstName} {user.lastName}
              </p>
              <p
                style={{
                  fontSize: "11px",
                  color: "#e8c44a",
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
              <motion.div
                key={item.id}
                style={sidebarItemStyle(activeTab === item.id)}
                onClick={() => setActiveTab(item.id)}
                whileHover={{ x: 4, transition: { duration: 0.15 } }}
                whileTap={{ scale: 0.98 }}
              >
                <span style={{ fontSize: "18px" }}>{item.icon}</span>
                <span>{item.label}</span>
              </motion.div>
            ))}
          </nav>

          {/* Back to home */}
          <div
            className="sidebar-back"
            style={{
              marginTop: "auto",
              paddingTop: "16px",
              borderTop: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div
              style={sidebarItemStyle(false)}
              onClick={() => navigate("/")}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.color = "rgba(255,255,255,0.7)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "rgba(255,255,255,0.5)";
              }}
            >
              <span>🏠</span>
              <span>Back to Home</span>
            </div>
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
                color: "rgba(255,255,255,0.3)",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  className="spinner"
                  style={{
                    borderColor: "rgba(255,255,255,0.1)",
                    borderTopColor: "#e8c44a",
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
