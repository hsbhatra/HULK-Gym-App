// =============================================================================
// src/pages/auth/VerifyOtpPage.jsx
// =============================================================================

import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/authStore.js";
import {
  verifyRegistrationOtp,
  resendRegistrationOtp,
} from "../../services/authService.js";
import ParticleBackground from "../../components/three/ParticleBackground.jsx";
import { motion } from "framer-motion";
import { scaleIn } from "../../utils/animations.js";
import { Mail } from "lucide-react";

// =============================================================================
// ParticleBackground
// =============================================================================
// function ParticleBackground() {
//   const mountRef = useRef(null);

//   useEffect(() => {
//     const mount  = mountRef.current;
//     const width  = mount.clientWidth;
//     const height = mount.clientHeight;

//     const scene    = new THREE.Scene();
//     const camera   = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
//     const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
//     renderer.setSize(width, height);
//     renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
//     renderer.setClearColor(0x000000, 0);
//     mount.appendChild(renderer.domElement);
//     camera.position.z = 80;

//     const COUNT      = 100;
//     const positions  = new Float32Array(COUNT * 3);
//     const velocities = [];
//     for (let i = 0; i < COUNT; i++) {
//       positions[i*3]   = (Math.random() - 0.5) * 200;
//       positions[i*3+1] = (Math.random() - 0.5) * 200;
//       positions[i*3+2] = (Math.random() - 0.5) * 200;
//       velocities.push(new THREE.Vector3(
//         (Math.random() - 0.5) * 0.06,
//         (Math.random() - 0.5) * 0.06,
//         (Math.random() - 0.5) * 0.06
//       ));
//     }

//     const pGeo = new THREE.BufferGeometry();
//     pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
//     scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({
//       color: 0xe8c44a, size: 0.8, transparent: true, opacity: 0.6, sizeAttenuation: true,
//     })));

//     const lGeo = new THREE.BufferGeometry();
//     const lPos  = new Float32Array(COUNT * COUNT * 6);
//     lGeo.setAttribute("position", new THREE.BufferAttribute(lPos, 3));
//     scene.add(new THREE.LineSegments(lGeo, new THREE.LineBasicMaterial({
//       color: 0xe8c44a, transparent: true, opacity: 0.06,
//     })));

//     const ring = new THREE.Mesh(
//       new THREE.TorusGeometry(24, 0.3, 8, 80),
//       new THREE.MeshBasicMaterial({ color: 0xe8c44a, transparent: true, opacity: 0.08, wireframe: true })
//     );
//     scene.add(ring);

//     const mouse = { x: 0, y: 0 };
//     const onMouse = (e) => {
//       mouse.x = (e.clientX / window.innerWidth  - 0.5) * 0.2;
//       mouse.y = (e.clientY / window.innerHeight - 0.5) * 0.2;
//     };
//     window.addEventListener("mousemove", onMouse);

//     let id;
//     const pos = pGeo.attributes.position.array;

//     const animate = () => {
//       id = requestAnimationFrame(animate);
//       for (let i = 0; i < COUNT; i++) {
//         pos[i*3]   += velocities[i].x;
//         pos[i*3+1] += velocities[i].y;
//         pos[i*3+2] += velocities[i].z;
//         if (Math.abs(pos[i*3])   > 100) velocities[i].x *= -1;
//         if (Math.abs(pos[i*3+1]) > 100) velocities[i].y *= -1;
//         if (Math.abs(pos[i*3+2]) > 100) velocities[i].z *= -1;
//       }
//       pGeo.attributes.position.needsUpdate = true;

//       let li = 0;
//       for (let i = 0; i < COUNT; i++) {
//         for (let j = i + 1; j < COUNT; j++) {
//           const dx = pos[i*3]-pos[j*3], dy = pos[i*3+1]-pos[j*3+1], dz = pos[i*3+2]-pos[j*3+2];
//           if (Math.sqrt(dx*dx+dy*dy+dz*dz) < 30) {
//             lPos[li++]=pos[i*3]; lPos[li++]=pos[i*3+1]; lPos[li++]=pos[i*3+2];
//             lPos[li++]=pos[j*3]; lPos[li++]=pos[j*3+1]; lPos[li++]=pos[j*3+2];
//           }
//         }
//       }
//       lGeo.attributes.position.needsUpdate = true;
//       lGeo.setDrawRange(0, li / 3);

//       ring.rotation.x += 0.002;
//       ring.rotation.y += 0.003;
//       camera.position.x += (mouse.x * 15 - camera.position.x) * 0.02;
//       camera.position.y += (-mouse.y * 15 - camera.position.y) * 0.02;
//       camera.lookAt(scene.position);
//       renderer.render(scene, camera);
//     };
//     animate();

//     const onResize = () => {
//       const w = mount.clientWidth, h = mount.clientHeight;
//       camera.aspect = w / h;
//       camera.updateProjectionMatrix();
//       renderer.setSize(w, h);
//     };
//     window.addEventListener("resize", onResize);

//     return () => {
//       cancelAnimationFrame(id);
//       window.removeEventListener("mousemove", onMouse);
//       window.removeEventListener("resize", onResize);
//       if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
//       renderer.dispose();
//     };
//   }, []);

//   return (
//     <div ref={mountRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />
//   );
// }

// =============================================================================
// VerifyOtpPage
// =============================================================================
export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  // Read email and purpose set by Register or ForgotPassword page
  const email = sessionStorage.getItem("pendingEmail") || "";
  const purpose = sessionStorage.getItem("otpPurpose") || "registration";

  const isRegistration = purpose === "registration";

  // 6 individual digit inputs
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Countdown timer for resend button
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Redirect away if no email in session (user landed here directly)
  useEffect(() => {
    if (!email) {
      toast.error("Session expired. Please start again.");
      navigate(isRegistration ? "/register" : "/forgot-password");
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Handle digit input
  const handleChange = (index, value) => {
    // Only allow single digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    // Auto-advance to next box
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are filled
    if (digit && index === 5) {
      const otp = [...newDigits.slice(0, 5), digit].join("");
      if (otp.length === 6) submitOtp(otp);
    }
  };

  // Handle backspace
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
    // Allow arrow keys to move between boxes
    if (e.key === "ArrowLeft" && index > 0)
      inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5)
      inputRefs.current[index + 1]?.focus();
  };

  // Handle paste — user can paste "482910" and it fills all boxes
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 0) return;
    const newDigits = ["", "", "", "", "", ""];
    pasted.split("").forEach((d, i) => {
      newDigits[i] = d;
    });
    setDigits(newDigits);
    // Focus last filled box
    const lastIndex = Math.min(pasted.length, 5);
    inputRefs.current[lastIndex]?.focus();
    // Auto-submit if 6 digits pasted
    if (pasted.length === 6) submitOtp(pasted);
  };

  // Submit OTP
  const submitOtp = async (otp) => {
    if (otp.length !== 6) {
      toast.error("Please enter the complete 6-digit OTP.");
      return;
    }
    setLoading(true);
    try {
      if (isRegistration) {
        const res = await verifyRegistrationOtp({ email, otp });
        const { user, accessToken } = res.data.data;

        // Auto-login after registration
        setAuth(user, accessToken);

        // Clean up session storage
        sessionStorage.removeItem("pendingEmail");
        sessionStorage.removeItem("otpPurpose");

        toast.success(`Welcome to Hulk Gym, ${user.firstName}!`);
        navigate("/");
      } else {
        // Forgot password flow — OTP verified, now go to reset password
        // Store verified status for reset password page
        sessionStorage.setItem("otpVerified", "true");
        toast.success("OTP verified! Set your new password.");
        navigate("/reset-password");
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || "Invalid OTP. Please try again.";
      toast.error(msg);
      // Clear all boxes on error so user can re-enter
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Manual submit (button click)
  const handleSubmit = () => {
    const otp = digits.join("");
    submitOtp(otp);
  };

  // Resend OTP
  const handleResend = async () => {
    if (!canResend) return;
    setResending(true);
    try {
      await resendRegistrationOtp({ email });
      toast.success("New OTP sent to your email!");
      // Reset countdown
      setCountdown(60);
      setCanResend(false);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to resend OTP.";
      toast.error(msg);
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
          <Mail size={40} strokeWidth={1.75} color="var(--yellow)" aria-hidden="true" />
        </div>

        <h1
          style={{
            fontSize: "24px",
            fontWeight: "700",
            marginBottom: "8px",
            letterSpacing: "-0.5px",
          }}
        >
          Check your email
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "rgba(255,255,255,0.62)",
            marginBottom: "8px",
            lineHeight: "1.6",
          }}
        >
          We sent a 6-digit verification code to
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

        {/* Verify Button */}
        <button
          onClick={handleSubmit}
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
            "Verify OTP →"
          )}
        </button>

        {/* Resend */}
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
              Resend OTP in{" "}
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

        {/* Info note */}
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

        {/* Back link */}
        <p style={{ marginTop: "24px" }}>
          <Link
            to={isRegistration ? "/register" : "/forgot-password"}
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
            ← {isRegistration ? "Back to register" : "Back to forgot password"}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
