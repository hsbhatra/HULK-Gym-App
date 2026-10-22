// =============================================================================
// src/pages/auth/ResetPasswordPage.jsx
// =============================================================================

import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { resetPassword } from "../../services/authService.js";
import ParticleBackground from "../../components/three/ParticleBackground.jsx";
import Logo from "../../components/ui/Logo.jsx";
import PasswordStrength from "../../components/ui/PasswordStrength.jsx";
import { motion } from "framer-motion";
import { scaleIn } from "../../utils/animations.js";
import { CircleCheck, Dumbbell, Eye, EyeOff, Lock } from "lucide-react";

// =============================================================================
// ResetPasswordPage
// =============================================================================
export default function ResetPasswordPage() {
  const navigate = useNavigate();

  const email = sessionStorage.getItem("pendingEmail") || "";
  const resetToken = sessionStorage.getItem("resetToken") || "";
  const otpVerified = sessionStorage.getItem("otpVerified") === "true" && !!resetToken;

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [watchedPassword, setWatchedPassword] = useState("");

  // Guard — redirect if user didn't go through OTP verification
  useEffect(() => {
    if (!email || !otpVerified) {
      toast.error(
        "Session expired. Please start the password reset process again.",
      );
      navigate("/forgot-password");
    }
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const passwordValue = watch("newPassword", "");
  useEffect(() => {
    setWatchedPassword(passwordValue);
  }, [passwordValue]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await resetPassword({
        email,
        newPassword: data.newPassword,
        confirmNewPassword: data.confirmNewPassword,
        resetToken,
      });

      // Clean up all session storage
      sessionStorage.removeItem("pendingEmail");
      sessionStorage.removeItem("otpPurpose");
      sessionStorage.removeItem("otpVerified");
      sessionStorage.removeItem("resetToken");

      setSuccess(true);
      toast.success("Password reset successfully!");
    } catch (err) {
      const errs = err.response?.data?.errors;
      if (errs && errs.length > 0) {
        errs.forEach((e) => toast.error(e, { duration: 4000 }));
      } else {
        toast.error(
          err.response?.data?.message ||
            "Failed to reset password. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="auth-page"
      style={{ background: "var(--iron-950)", position: "relative" }}
    >
      <ParticleBackground />

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background:
            "radial-gradient(ellipse at center, rgba(243,212,0,0.05) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />

      {/* Card */}
      <motion.div
        className="auth-card-wrapper"
        initial={scaleIn.initial}
        animate={scaleIn.animate}
        transition={scaleIn.transition}
        style={{
          position: "relative",
          zIndex: 1,
          background: "var(--iron-850)",
          border: "1px solid #26262a",
          borderRadius: "24px",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          padding: "40px 36px",
        }}
      >
        {!success ? (
          <>
            {/* Icon */}
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "16px",
                background: "rgba(243,212,0,0.1)",
                border: "1px solid rgba(243,212,0,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                margin: "0 auto 24px",
              }}
            >
              <Lock size={40} strokeWidth={1.75} color="var(--yellow)" aria-hidden="true" />
            </div>

            <h1
              style={{
                fontSize: "24px",
                fontWeight: "700",
                marginBottom: "8px",
                letterSpacing: "-0.5px",
              }}
            >
              Set new password
            </h1>
            <p
              style={{
                fontSize: "16px",
                color: "rgba(255,255,255,0.62)",
                marginBottom: "32px",
                lineHeight: "1.6",
              }}
            >
              Create a strong password for{" "}
              <span style={{ color: "#f3d400" }}>{email}</span>
            </p>

            <form
              onSubmit={handleSubmit(onSubmit)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                textAlign: "left",
              }}
            >
              {/* New Password */}
              <div>
                <label
                  style={{
                    fontSize: "15px",
                    fontWeight: "500",
                    color: "rgba(255,255,255,0.6)",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  New Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showNew ? "text" : "password"}
                    placeholder="Create a strong password"
                    className="input-dark"
                    style={{
                      paddingRight: "44px",
                      ...(errors.newPassword
                        ? { borderColor: "rgba(239,68,68,0.6)" }
                        : {}),
                    }}
                    {...register("newPassword", {
                      required: "New password is required",
                      minLength: { value: 8, message: "Minimum 8 characters" },
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    style={{
                      position: "absolute",
                      right: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "rgba(255,255,255,0.6)",
                      fontSize: "16px",
                      padding: "4px",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#f3d400")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#8c8c86")
                    }
                  >
                    {showNew ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}<span className="sr-only">{showNew ? "Hide password" : "Show password"}</span>
                  </button>
                </div>
                {errors.newPassword && (
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#ef4444",
                      marginTop: "6px",
                    }}
                  >
                    {errors.newPassword.message}
                  </p>
                )}
                <PasswordStrength password={watchedPassword} />
              </div>

              {/* Confirm New Password */}
              <div>
                <label
                  style={{
                    fontSize: "15px",
                    fontWeight: "500",
                    color: "rgba(255,255,255,0.6)",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Confirm New Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repeat your new password"
                    className="input-dark"
                    style={{
                      paddingRight: "44px",
                      ...(errors.confirmNewPassword
                        ? { borderColor: "rgba(239,68,68,0.6)" }
                        : {}),
                    }}
                    {...register("confirmNewPassword", {
                      required: "Please confirm your new password",
                      validate: (val) =>
                        val === watch("newPassword") ||
                        "Passwords do not match",
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    style={{
                      position: "absolute",
                      right: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "rgba(255,255,255,0.6)",
                      fontSize: "16px",
                      padding: "4px",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#f3d400")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#8c8c86")
                    }
                  >
                    {showConfirm ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}<span className="sr-only">{showConfirm ? "Hide password" : "Show password"}</span>
                  </button>
                </div>
                {errors.confirmNewPassword && (
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#ef4444",
                      marginTop: "6px",
                    }}
                  >
                    {errors.confirmNewPassword.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="btn-gold"
                disabled={loading}
                style={{
                  marginTop: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                }}
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    Resetting password...
                  </>
                ) : (
                  "Reset Password →"
                )}
              </button>
            </form>

            <p style={{ marginTop: "24px" }}>
              <Link
                to="/forgot-password"
                style={{
                  fontSize: "15px",
                  color: "rgba(255,255,255,0.55)",
                  textDecoration: "none",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.target.style.color = "rgba(255,255,255,0.6)")
                }
                onMouseLeave={(e) =>
                  (e.target.style.color = "#8c8c86")
                }
              >
                ← Start over
              </Link>
            </p>
          </>
        ) : (
          /* ── Success State ── */
          <div 
          // className="page-enter"
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                margin: "0 auto 28px",
              }}
            >
              <CircleCheck size={40} strokeWidth={1.75} color="var(--yellow)" aria-hidden="true" />
            </div>

            <h1
              style={{
                fontSize: "24px",
                fontWeight: "700",
                marginBottom: "12px",
                letterSpacing: "-0.5px",
              }}
            >
              Password reset!
            </h1>
            <p
              style={{
                fontSize: "16px",
                color: "rgba(255,255,255,0.45)",
                marginBottom: "32px",
                lineHeight: "1.7",
              }}
            >
              Your password has been updated successfully. You can now sign in
              with your new password.
            </p>

            {/* Decorative divider */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "28px",
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: "1px",
                  background: "rgba(255,255,255,0.06)",
                }}
              />
              <Dumbbell size={20} color="var(--yellow)" aria-hidden="true" />
              <div
                style={{
                  flex: 1,
                  height: "1px",
                  background: "rgba(255,255,255,0.06)",
                }}
              />
            </div>

            <button onClick={() => navigate("/login")} className="btn-gold">
              Sign In Now →
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
