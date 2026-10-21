// =============================================================================
// src/pages/SubscriptionSuccessPage.jsx
// =============================================================================

import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ParticleBackground from "../components/three/ParticleBackground.jsx";
import { heroContainer, heroItem } from "../utils/animations.js";

export default function SubscriptionSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const planName = searchParams.get("plan") || "Membership";
  const duration = searchParams.get("duration") || "Monthly";
  const receiptNo = searchParams.get("receipt");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
      }}
    >
      <ParticleBackground particleCount={60} />

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background:
            "radial-gradient(ellipse at center, rgba(34,197,94,0.06) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        variants={heroContainer}
        initial="initial"
        animate="animate"
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          maxWidth: "520px",
          width: "100%",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "24px",
          padding: "48px 36px",
          backdropFilter: "blur(40px)",
        }}
      >
        {/* Success Icon */}
        <motion.div variants={heroItem}>
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              margin: "0 auto 28px",
            }}
          >
            ✅
          </div>
        </motion.div>

        {/* Heading */}
        <motion.div variants={heroItem}>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: "800",
              marginBottom: "12px",
              letterSpacing: "-0.5px",
            }}
          >
            You're in! 💪
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: "rgba(255,255,255,0.5)",
              lineHeight: "1.7",
              marginBottom: "28px",
            }}
          >
            Your{" "}
            <strong style={{ color: "#e8c44a" }}>
              {planName} — {duration}
            </strong>{" "}
            membership is now active. A receipt has been sent to your email.
          </p>
          {receiptNo && /^[A-Za-z0-9-]+$/.test(receiptNo) && (
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", marginTop: "-16px", marginBottom: "24px" }}>
              Receipt No. <strong style={{ color: "#fff" }}>{receiptNo}</strong>
            </p>
          )}
        </motion.div>

        {/* Divider */}
        <motion.div variants={heroItem}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              margin: "0 0 28px",
            }}
          >
            <div
              style={{
                flex: 1,
                height: "1px",
                background: "rgba(255,255,255,0.06)",
              }}
            />
            <span style={{ fontSize: "20px" }}>🏋️</span>
            <div
              style={{
                flex: 1,
                height: "1px",
                background: "rgba(255,255,255,0.06)",
              }}
            />
          </div>
        </motion.div>

        {/* What's next */}
        <motion.div variants={heroItem}>
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "14px",
              padding: "20px",
              marginBottom: "28px",
              textAlign: "left",
            }}
          >
            <p
              style={{
                fontSize: "13px",
                fontWeight: "700",
                color: "rgba(255,255,255,0.5)",
                letterSpacing: "1px",
                textTransform: "uppercase",
                marginBottom: "14px",
              }}
            >
              What's next
            </p>
            {[
              "Visit the gym — your membership is active immediately",
              "Check your email for your payment receipt",
              "View your membership details in your profile",
            ].map((item, i) => (
              <div
                key={i}
                style={{ display: "flex", gap: "10px", marginBottom: "10px" }}
              >
                <span
                  style={{ color: "#e8c44a", fontWeight: "700", flexShrink: 0 }}
                >
                  {i + 1}.
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.5)",
                    lineHeight: "1.6",
                  }}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          variants={heroItem}
          style={{ display: "flex", gap: "12px" }}
        >
          <button
            onClick={() => navigate("/profile")}
            className="btn-gold"
            style={{ flex: 1, fontSize: "14px" }}
          >
            View Profile →
          </button>
          <button
            onClick={() => navigate("/")}
            className="btn-ghost"
            style={{ flex: 1, padding: "12px", fontSize: "14px" }}
          >
            Go Home
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
