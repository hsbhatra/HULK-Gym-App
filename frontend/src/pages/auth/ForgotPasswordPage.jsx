// =============================================================================
// src/pages/auth/ForgotPasswordPage.jsx
// =============================================================================

import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { forgotPassword } from "../../services/authService.js";
import ParticleBackground from "../../components/three/ParticleBackground.jsx";
import { motion } from "framer-motion";
import { scaleIn } from "../../utils/animations.js";
import { CircleCheck, Lock } from "lucide-react";

// =============================================================================
// ForgotPasswordPage
// =============================================================================
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await forgotPassword({ email: data.email });

      // Store email for the OTP page
      sessionStorage.setItem("pendingEmail", data.email);
      sessionStorage.setItem("otpPurpose", "forgotPassword");

      setSent(true);
      toast.success("If this email is registered, an OTP has been sent.");
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Something went wrong. Please try again.";
      toast.error(msg);
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

        {!sent ? (
          <>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: "700",
                marginBottom: "8px",
                letterSpacing: "-0.5px",
              }}
            >
              Forgot password?
            </h1>
            <p
              style={{
                fontSize: "16px",
                color: "rgba(255,255,255,0.62)",
                marginBottom: "32px",
                lineHeight: "1.6",
              }}
            >
              No worries. Enter your registered email and we'll send you a
              verification code.
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
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="input-dark"
                  style={
                    errors.email ? { borderColor: "rgba(239,68,68,0.6)" } : {}
                  }
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^\S+@\S+\.\S+$/,
                      message: "Enter a valid email",
                    },
                  })}
                />
                {errors.email && (
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#ef4444",
                      marginTop: "6px",
                    }}
                  >
                    {errors.email.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="btn-gold"
                disabled={loading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                }}
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    Sending OTP...
                  </>
                ) : (
                  "Send OTP →"
                )}
              </button>
            </form>
          </>
        ) : (
          /* Success state — shown after OTP is sent */
          <>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                margin: "0 auto 24px",
              }}
            >
              <CircleCheck size={40} strokeWidth={1.75} color="var(--yellow)" aria-hidden="true" />
            </div>
            <h1
              style={{
                fontSize: "22px",
                fontWeight: "700",
                marginBottom: "10px",
              }}
            >
              OTP Sent!
            </h1>
            <p
              style={{
                fontSize: "16px",
                color: "rgba(255,255,255,0.62)",
                marginBottom: "8px",
              }}
            >
              We sent a verification code to
            </p>
            <p
              style={{
                fontSize: "16px",
                color: "#f3d400",
                fontWeight: "600",
                marginBottom: "32px",
              }}
            >
              {getValues("email")}
            </p>
            <button
              onClick={() => navigate("/forgot-otp")}
              className="btn-gold"
              style={{ marginBottom: "16px" }}
            >
              Enter OTP →
            </button>
            <button
              onClick={() => {
                setSent(false);
                setLoading(false);
              }}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: "15px",
                color: "rgba(255,255,255,0.55)",
                textDecoration: "underline",
              }}
            >
              Use a different email
            </button>
          </>
        )}

        {/* Back to login */}
        <p style={{ marginTop: "28px" }}>
          <Link
            to="/login"
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
            ← Back to login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
