// =============================================================================
// src/App.jsx
// =============================================================================

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/authStore.js";
import { useAuthInit } from "./hooks/useAuthInit.js";
import {
  ProtectedRoute,
  PublicRoute,
} from "./components/layout/ProtectedRoute.jsx";
import AppLoader from "./components/ui/AppLoader.jsx";

import LandingPage from "./pages/LandingPage.jsx";
import RegisterPage from "./pages/auth/RegisterPage.jsx";
import VerifyOtpPage from "./pages/auth/VerifyOtpPage.jsx";
import LoginPage from "./pages/auth/LoginPage.jsx";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage.jsx";
import ForgotOtpPage from "./pages/auth/ForgotOtpPage.jsx";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage.jsx";
import ProfilePage from "./pages/profile/ProfilePage.jsx";
import { AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import AdminRoute from "./components/layout/AdminRoute.jsx";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage.jsx";
import AdminPlansPage from "./pages/admin/AdminPlansPage.jsx";
import PlanDetailPage from "./pages/PlanDetailPage.jsx";
import SubscriptionSuccessPage from "./pages/SubscriptionSuccessPage.jsx";
import AdminMembersPage from "./pages/admin/AdminMembersPage.jsx";

// =============================================================================
// AppContent — renders after session initialization completes
// =============================================================================
function AppContent() {
  // Run session restore on every app startup
  useAuthInit();

  const isInitialized = useAuthStore((s) => s.isInitialized);
  const location = useLocation();

  // Show loading screen while we silently check for existing session
  // This prevents the brief flash of login page before session is restored
  if (!isInitialized) return <AppLoader />;

  return (
    <>
      <Toaster
        position="top-center" // center on mobile, right on desktop
        toastOptions={{
          style: {
            background: "#1a1a1a",
            color: "#ffffff",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "10px",
            fontSize: "14px",
            maxWidth: "360px",
          },
          success: { iconTheme: { primary: "#e8c44a", secondary: "#0a0a0a" } },
          error: { iconTheme: { primary: "#ef4444", secondary: "#ffffff" } },
        }}
      />

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public — accessible by everyone */}
          <Route path="/" element={<LandingPage />} />
          {/* Auth — only for non-logged-in users */}
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />
          <Route
            path="/verify-otp"
            element={
              <PublicRoute>
                <VerifyOtpPage />
              </PublicRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPasswordPage />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-otp"
            element={
              <PublicRoute>
                <ForgotOtpPage />
              </PublicRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PublicRoute>
                <ResetPasswordPage />
              </PublicRoute>
            }
          />
          {/* Protected — only for logged-in users */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/sessions"
            element={<Navigate to="/profile" replace />}
          />
          <Route
            path="/profile/change-password"
            element={<Navigate to="/profile" replace />}
          />
          <Route path="/plans/:slug" element={<PlanDetailPage />} />
          <Route
            path="/subscription/success"
            element={
              <ProtectedRoute>
                <SubscriptionSuccessPage />
              </ProtectedRoute>
            }
          />
          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/plans"
            element={
              <AdminRoute>
                <AdminPlansPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/members"
            element={
              <AdminRoute>
                <AdminMembersPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/members/:id"
            element={
              <AdminRoute>
                <AdminMembersPage />
              </AdminRoute>
            }
          />
          {/* Add as last route: */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}

// =============================================================================
// App — wraps everything in BrowserRouter
// =============================================================================
export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
