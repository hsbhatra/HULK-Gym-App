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
const ProfilePage = lazy(() => import("./pages/profile/ProfilePage.jsx"));
import { AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import AdminRoute from "./components/layout/AdminRoute.jsx";
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage.jsx"));
const AdminPlansPage = lazy(() => import("./pages/admin/AdminPlansPage.jsx"));
const PlanDetailPage = lazy(() => import("./pages/PlanDetailPage.jsx"));
const SubscriptionSuccessPage = lazy(() => import("./pages/SubscriptionSuccessPage.jsx"));
const LegalPage = lazy(() => import("./pages/legal/LegalPage.jsx"));
const ContactPage = lazy(() => import("./pages/ContactPage.jsx"));
const AdminMembersPage = lazy(() => import("./pages/admin/AdminMembersPage.jsx"));
const AdminRefundsPage = lazy(() => import("./pages/admin/AdminRefundsPage.jsx"));

// Per-route SEO: tab title, description, canonical and indexing rules
const SITE_URL = (import.meta.env.VITE_SITE_URL || "").replace(/\/$/, "");
const DEFAULT_DESC =
  "Hulk Gym, Kota — a strength gym with free weights, a functional zone and personal training on request. Join online and pay by UPI or card, or at the desk.";

const PAGES = {
  "/": { title: "Hulk Gym, Kota — Strength Training Gym in Nayapura", index: true },
  "/register": { title: "Join Hulk Gym — Create your account", desc: "Create your Hulk Gym account, pick a plan and pay online in minutes.", index: true },
  "/login": { title: "Member login — Hulk Gym", desc: "Log in to see your Hulk Gym membership, payments and receipts.", index: true },
  "/contact": { title: "Contact Hulk Gym, Kota — Address, Phone & Hours", desc: "Address, phone, WhatsApp, email and opening hours for Hulk Gym, Nayapura, Kota.", index: true },
  "/privacy": { title: "Privacy Policy — Hulk Gym", desc: "How Hulk Gym collects, uses and protects your personal data.", index: true },
  "/terms": { title: "Terms & Conditions — Hulk Gym", desc: "Membership terms, gym rules and payment terms for Hulk Gym, Kota.", index: true },
  "/refund-policy": { title: "Refund & Cancellation Policy — Hulk Gym", desc: "When Hulk Gym memberships are refunded and how cancellation works.", index: true },
  "/verify-otp": { title: "Verify email — Hulk Gym" },
  "/forgot-password": { title: "Forgot password — Hulk Gym" },
  "/forgot-otp": { title: "Verify code — Hulk Gym" },
  "/reset-password": { title: "Reset password — Hulk Gym" },
  "/profile": { title: "My membership — Hulk Gym" },
  "/subscription/success": { title: "Payment successful — Hulk Gym" },
  "/admin": { title: "Dashboard — Hulk Gym Admin" },
  "/admin/plans": { title: "Plans — Hulk Gym Admin" },
  "/admin/members": { title: "Members — Hulk Gym Admin" },
  "/admin/refunds": { title: "Refunds — Hulk Gym Admin" },
};

function pageFor(pathname) {
  if (PAGES[pathname]) return PAGES[pathname];
  if (pathname.startsWith("/plans/"))
    return { title: "Membership plan — Hulk Gym", desc: "Plan details, durations and prices at Hulk Gym, Kota.", index: true };
  if (pathname.startsWith("/admin/members/")) return { title: "Member — Hulk Gym Admin" };
  return { title: "Page not found — Hulk Gym" };
}

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function applySeo(pathname) {
  const page = pageFor(pathname);
  const desc = page.desc || DEFAULT_DESC;
  document.title = page.title;
  setMeta("name", "description", desc);
  setMeta("name", "robots", page.index ? "index, follow, max-image-preview:large" : "noindex, nofollow");
  setMeta("property", "og:title", page.title);
  setMeta("property", "og:description", desc);
  if (SITE_URL) {
    const url = `${SITE_URL}${pathname === "/" ? "/" : pathname}`;
    setMeta("property", "og:url", url);
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", url);
  }
}

// =============================================================================
// AppContent — renders after session initialization completes
// =============================================================================
function AppContent() {
  // Run session restore on every app startup
  useAuthInit();

  const isInitialized = useAuthStore((s) => s.isInitialized);
  const location = useLocation();

  useEffect(() => {
    applySeo(location.pathname);
  }, [location.pathname]);

  // Show loading screen while we silently check for existing session
  // This prevents the brief flash of login page before session is restored
  if (!isInitialized) return <AppLoader />;

  return (
    <>
      <Toaster
        position="top-center" // center on mobile, right on desktop
        toastOptions={{
          style: {
            background: "#151517",
            color: "#edede8",
            border: "1px solid #2e2e33",
            borderRadius: "12px",
            fontSize: "16px",
            maxWidth: "360px",
          },
          success: { iconTheme: { primary: "#f3d400", secondary: "#0a0a0a" } },
          error: { iconTheme: { primary: "#ef4444", secondary: "#ffffff" } },
        }}
      />

      <Suspense fallback={<AppLoader />}>
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
            path="/admin/refunds"
            element={
              <AdminRoute>
                <AdminRefundsPage />
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
          {/* Public info + policies */}
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<LegalPage policy="privacy" />} />
          <Route path="/terms" element={<LegalPage policy="terms" />} />
          <Route path="/refund-policy" element={<LegalPage policy="refunds" />} />
          {/* Add as last route: */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AnimatePresence>
      </Suspense>
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
