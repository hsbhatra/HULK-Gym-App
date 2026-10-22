// =============================================================================
// src/pages/auth/ForgotOtpPage.jsx
// =============================================================================

import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  verifyForgotOtp,
  resendForgotOtp,
} from "../../services/authService.js";
import ParticleBackground from "../../components/three/ParticleBackground.jsx";
import { motion } from "framer-motion";
import { scaleIn, scrollScaleIn } from "../../utils/animations.js";
import { KeyRound } from "lucide-react";

// =============================================================================
// ForgotOtpPage
// =============================================================================
export default function ForgotOtpPage() {
  const navigate = useNavigate();
  const email = sessionStorage.getItem("pendingEmail") || "";

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!email) {
      toast.error("Session expired. Please start again.");
      navigate("/forgot-password");
    }
  }, []);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
    if (digit && index === 5) {
      const otp = [...newDigits.slice(0, 5), digit].join("");
      if (otp.length === 6) submitOtp(otp);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const newDigits = [...digits];
        newDigits[index] = "";
        setDigits(newDigits);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft" && index > 0)
      inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5)
      inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!pasted.length) return;
    const newDigits = ["", "", "", "", "", ""];
    pasted.split("").forEach((d, i) => {
      newDigits[i] = d;
    });
    setDigits(newDigits);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) submitOtp(pasted);
  };

  const submitOtp = async (otp) => {
    if (otp.length !== 6) {
      toast.error("Please enter the complete 6-digit OTP.");
      return;
    }
    setLoading(true);
    try {
      await verifyForgotOtp({ email, otp });
      sessionStorage.setItem("otpVerified", "true");
      toast.success("OTP verified! Set your new password.");
      navigate("/reset-password");
    } catch (err) {
      const msg =
        err.response?.data?.message || "Invalid OTP. Please try again.";
      toast.error(msg);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setResending(true);
    try {
      await resendForgotOtp({ email });
      toast.success("New OTP sent to your email!");
      setCountdown(60);
      setCanResend(false);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  const otp = digits.join("");

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
          <KeyRound size={40} strokeWidth={1.75} color="var(--yellow)" aria-hidden="true" />
        </div>

        <h1
          style={{
            fontSize: "24px",
            fontWeight: "700",
            marginBottom: "8px",
            letterSpacing: "-0.5px",
          }}
        >
          Enter reset code
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "rgba(255,255,255,0.62)",
            marginBottom: "8px",
            lineHeight: "1.6",
          }}
        >
          We sent a password reset code to
        </p>
        <p
          style={{
            fontSize: "16px",
            color: "#f3d400",
            fontWeight: "600",
            marginBottom: "32px",
          }}
        >
          {email}
        </p>

        {/* 6-box OTP Input */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            marginBottom: "28px",
          }}
        >
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              style={{
                width: "48px",
                height: "56px",
                textAlign: "center",
                fontSize: "22px",
                fontWeight: "700",
                background: digit
                  ? "rgba(243,212,0,0.08)"
                  : "rgba(255,255,255,0.03)",
                border: `1.5px solid ${digit ? "rgba(243,212,0,0.5)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: "12px",
                color: "#ffffff",
                outline: "none",
                transition: "all 0.2s",
                caretColor: "#f3d400",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#f3d400";
                e.target.style.background = "rgba(243,212,0,0.06)";
                e.target.style.boxShadow = "0 0 0 3px rgba(243,212,0,0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = digit
                  ? "rgba(243,212,0,0.5)"
                  : "rgba(255,255,255,0.1)";
                e.target.style.background = digit
                  ? "rgba(243,212,0,0.08)"
                  : "rgba(255,255,255,0.03)";
                e.target.style.boxShadow = "none";
              }}
            />
          ))}
        </div>

        <button
          onClick={() => submitOtp(otp)}
          disabled={loading || otp.length < 6}
          className="btn-gold"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            opacity: otp.length < 6 ? 0.5 : 1,
          }}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Verifying...
            </>
          ) : (
            "Verify & Continue →"
          )}
        </button>

        <div style={{ marginTop: "24px" }}>
          {canResend ? (
            <button
              onClick={handleResend}
              disabled={resending}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: "16px",
                color: "#f3d400",
                fontWeight: "600",
                textDecoration: "underline",
              }}
            >
              {resending ? "Sending..." : "Resend OTP"}
            </button>
          ) : (
            <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.55)" }}>
              Resend code in{" "}
              <span
                style={{
                  color: "#f3d400",
                  fontWeight: "600",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {String(Math.floor(countdown / 60)).padStart(2, "0")}:
                {String(countdown % 60).padStart(2, "0")}
              </span>
            </p>
          )}
        </div>

        <div
          style={{
            marginTop: "24px",
            padding: "12px 16px",
            background: "var(--iron-850)",
            borderRadius: "10px",
            border: "1px solid #26262a",
          }}
        >
          <p
            style={{
              fontSize: "14px",
              color: "rgba(255,255,255,0.55)",
              lineHeight: "1.6",
            }}
          >
            Didn't receive the email? Check your spam folder. The code expires
            in{" "}
            <span style={{ color: "rgba(255,255,255,0.5)" }}>10 minutes</span>.
          </p>
        </div>

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
            ← Back to forgot password
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
