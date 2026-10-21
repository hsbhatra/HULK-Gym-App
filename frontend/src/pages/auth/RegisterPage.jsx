// =============================================================================
// src/pages/auth/RegisterPage.jsx
// =============================================================================

import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import * as THREE from "three";
import { registerUser } from "../../services/authService.js";
import ParticleBackground from "../../components/three/ParticleBackground.jsx";
import Logo from "../../components/ui/Logo.jsx";
import PasswordStrength from "../../components/ui/PasswordStrength.jsx";
import { motion } from "framer-motion";
import { scaleIn } from "../../utils/animations.js";

// =============================================================================
// RegisterPage
// =============================================================================
export default function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [watchedPassword, setWatchedPassword] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  // Watch password field for strength indicator
  const passwordValue = watch("password", "");
  useEffect(() => {
    setWatchedPassword(passwordValue);
  }, [passwordValue]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await registerUser({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });

      // Store email temporarily so OTP page knows which email to verify
      sessionStorage.setItem("pendingEmail", data.email);
      sessionStorage.setItem("otpPurpose", "registration");

      toast.success("OTP sent to your email! Check your inbox.");
      navigate("/verify-otp");
    } catch (err) {
      const msg =
        err.response?.data?.message || "Registration failed. Please try again.";
      // Show validation errors if any
      const errs = err.response?.data?.errors;
      if (errs && errs.length > 0) {
        errs.forEach((e) => toast.error(e, { duration: 4000 }));
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 24px 40px",
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
            "radial-gradient(ellipse at center, rgba(232,196,74,0.05) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />

      {/* Card */}
      <motion.div
        className="auth-card-wrapper auth-card-wrapper--wide"
        initial={scaleIn.initial}
        animate={scaleIn.animate}
        transition={scaleIn.transition}
        style={{
          position: "relative",
          zIndex: 1,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "24px",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          padding: "40px 36px",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ marginBottom: "24px" }}>
            <Logo
              size="md"
              clickable={false}
              style={{ justifyContent: "center" }}
            />
          </div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: "700",
              marginBottom: "8px",
              letterSpacing: "-0.5px",
            }}
          >
            Create your account
          </h1>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)" }}>
            Join thousands of members already training
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          {/* First Name + Last Name */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            <div>
              <label
                style={{
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "rgba(255,255,255,0.6)",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                First Name
              </label>
              <input
                placeholder="Hulk"
                className="input-dark"
                style={
                  errors.firstName ? { borderColor: "rgba(239,68,68,0.6)" } : {}
                }
                {...register("firstName", {
                  required: "Required",
                  minLength: { value: 2, message: "Min 2 chars" },
                  pattern: {
                    value: /^\s*[A-Za-z][A-Za-z .'-]*\s*$/,
                    message: "Letters only",
                  },
                })}
              />
              {errors.firstName && (
                <p
                  style={{
                    fontSize: "11px",
                    color: "#ef4444",
                    marginTop: "5px",
                  }}
                >
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div>
              <label
                style={{
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "rgba(255,255,255,0.6)",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Last Name
              </label>
              <input
                placeholder="Gym"
                className="input-dark"
                style={
                  errors.lastName ? { borderColor: "rgba(239,68,68,0.6)" } : {}
                }
                {...register("lastName", {
                  required: "Required",
                  minLength: { value: 2, message: "Min 2 chars" },
                  pattern: {
                    value: /^\s*[A-Za-z][A-Za-z .'-]*\s*$/,
                    message: "Letters only",
                  },
                })}
              />
              {errors.lastName && (
                <p
                  style={{
                    fontSize: "11px",
                    color: "#ef4444",
                    marginTop: "5px",
                  }}
                >
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label
              style={{
                fontSize: "13px",
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
              style={errors.email ? { borderColor: "rgba(239,68,68,0.6)" } : {}}
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
                style={{ fontSize: "12px", color: "#ef4444", marginTop: "6px" }}
              >
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label
              style={{
                fontSize: "13px",
                fontWeight: "500",
                color: "rgba(255,255,255,0.6)",
                display: "block",
                marginBottom: "8px",
              }}
            >
              Phone Number
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.3)",
                  fontWeight: "500",
                }}
              >
                +91
              </span>
              <input
                type="tel"
                placeholder="9876543210"
                className="input-dark"
                style={{
                  paddingLeft: "44px",
                  ...(errors.phoneNumber
                    ? { borderColor: "rgba(239,68,68,0.6)" }
                    : {}),
                }}
                {...register("phoneNumber", {
                  required: "Phone number is required",
                  pattern: {
                    value: /^[6-9]\d{9}$/,
                    message: "Enter a valid 10-digit Indian mobile number",
                  },
                })}
              />
            </div>
            {errors.phoneNumber && (
              <p
                style={{ fontSize: "12px", color: "#ef4444", marginTop: "6px" }}
              >
                {errors.phoneNumber.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              style={{
                fontSize: "13px",
                fontWeight: "500",
                color: "rgba(255,255,255,0.6)",
                display: "block",
                marginBottom: "8px",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                className="input-dark"
                style={{
                  paddingRight: "44px",
                  ...(errors.password
                    ? { borderColor: "rgba(239,68,68,0.6)" }
                    : {}),
                }}
                {...register("password", {
                  required: "Password is required",
                  minLength: { value: 8, message: "Minimum 8 characters" },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.35)",
                  fontSize: "14px",
                  padding: "4px",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#e8c44a")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "rgba(255,255,255,0.35)")
                }
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {errors.password && (
              <p
                style={{ fontSize: "12px", color: "#ef4444", marginTop: "6px" }}
              >
                {errors.password.message}
              </p>
            )}
            <PasswordStrength password={watchedPassword} />
          </div>

          {/* Confirm Password */}
          <div>
            <label
              style={{
                fontSize: "13px",
                fontWeight: "500",
                color: "rgba(255,255,255,0.6)",
                display: "block",
                marginBottom: "8px",
              }}
            >
              Confirm Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repeat your password"
                className="input-dark"
                style={{
                  paddingRight: "44px",
                  ...(errors.confirmPassword
                    ? { borderColor: "rgba(239,68,68,0.6)" }
                    : {}),
                }}
                {...register("confirmPassword", {
                  required: "Please confirm your password",
                  validate: (val) =>
                    val === watch("password") || "Passwords do not match",
                })}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: "absolute",
                  right: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.35)",
                  fontSize: "14px",
                  padding: "4px",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#e8c44a")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "rgba(255,255,255,0.35)")
                }
              >
                {showConfirmPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {errors.confirmPassword && (
              <p
                style={{ fontSize: "12px", color: "#ef4444", marginTop: "6px" }}
              >
                {errors.confirmPassword.message}
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
                Creating account...
              </>
            ) : (
              "Create Account →"
            )}
          </button>
        </form>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            margin: "24px 0",
          }}
        >
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "rgba(255,255,255,0.07)",
            }}
          />
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>
            Already a member?
          </span>
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "rgba(255,255,255,0.07)",
            }}
          />
        </div>

        <Link
          to="/login"
          style={{
            display: "block",
            textAlign: "center",
            padding: "13px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.6)",
            fontSize: "14px",
            fontWeight: "500",
            textDecoration: "none",
            transition: "border-color 0.2s, color 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#e8c44a";
            e.currentTarget.style.color = "#e8c44a";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            e.currentTarget.style.color = "rgba(255,255,255,0.6)";
          }}
        >
          Sign in instead
        </Link>

        <p style={{ textAlign: "center", marginTop: "20px" }}>
          <Link
            to="/"
            style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.3)",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.target.style.color = "rgba(255,255,255,0.6)")
            }
            onMouseLeave={(e) =>
              (e.target.style.color = "rgba(255,255,255,0.3)")
            }
          >
            ← Back to home
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
