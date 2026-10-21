// =============================================================================
// src/pages/PlanDetailPage.jsx
// =============================================================================

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import ParticleBackground from "../components/three/ParticleBackground.jsx";
import Navbar from "../components/layout/Navbar.jsx";
import { useAuthStore } from "../store/authStore.js";
import { useRazorpay } from "../hooks/useRazorpay.js";
import { getPlanBySlug } from "../services/planService.js";
import {
  initiateSubscription,
  verifySubscription,
  getMyActiveSubscription,
} from "../services/subscriptionService.js";
import { scaleIn } from "../utils/animations.js";

const DURATION_OPTIONS = [
  { days: 30, label: "Monthly" },
  { days: 90, label: "Quarterly" },
  { days: 180, label: "Half-Yearly" },
  { days: 365, label: "Annual" },
];

export default function PlanDetailPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const razorpayReady = useRazorpay();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(
    Number(searchParams.get("duration")) || 30,
  );

  useEffect(() => {
    fetchPlan();
  }, [slug]);

  // Members who already hold an active plan can't buy another (backend
  // rejects it). Tell them up front instead of after they click Pay.
  const [activeSub, setActiveSub] = useState(null);
  useEffect(() => {
    if (!isAuthenticated) return;
    getMyActiveSubscription()
      .then((res) => setActiveSub(res.data.data?.subscription || null))
      .catch(() => {});
  }, [isAuthenticated]);

  const fetchPlan = async () => {
    try {
      const res = await getPlanBySlug(slug);
      const fetched = res.data.data.plan;
      setPlan(fetched);
      // A stale/edited link (?duration=999) must not leave the page with no
      // tier selected — fall back to monthly, else the first available tier.
      const tiers = fetched?.pricingTiers || [];
      if (tiers.length && !tiers.some((t) => t.durationDays === selectedDuration)) {
        const fallback = tiers.find((t) => t.durationDays === 30) || tiers[0];
        setSelectedDuration(fallback.durationDays);
      }
    } catch {
      // Fixed id → toast is shown once even if the effect runs twice
      toast.error("Plan not found.", { id: "plan-not-found" });
      navigate("/#pricing", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const getActiveTier = () => {
    if (!plan) return null;
    const tier = plan.pricingTiers.find(
      (t) => t.durationDays === selectedDuration,
    );
    if (!tier) return null;
    const now = new Date();
    const hasOffer =
      tier.offerPrice &&
      (!tier.offerValidUntil || new Date(tier.offerValidUntil) > now);
    return {
      ...tier,
      effectivePrice: hasOffer ? tier.offerPrice : tier.price,
      originalPrice: hasOffer ? tier.price : null,
    };
  };

  const handlePayNow = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to purchase a membership.");
      navigate(
        `/login?redirect=${encodeURIComponent(`/plans/${slug}?duration=${selectedDuration}`)}`,
      );
      return;
    }

    if (!razorpayReady) {
      toast.error("Payment system is loading. Please try again in a moment.");
      return;
    }

    const tier = getActiveTier();
    if (!tier) return;

    setPaying(true);
    try {
      // Step 1: Create Razorpay order on our backend
      const res = await initiateSubscription(plan._id, selectedDuration);

      const orderData = res.data.data;

      // Step 2: Open Razorpay checkout modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "HULK Gym",
        description: `${orderData.planName} — ${orderData.durationLabel}`,
        order_id: orderData.razorpayOrderId,
        prefill: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          // Without this Razorpay reuses whatever number was last used in
          // this browser (e.g. another member's) for the payment.
          ...(user.phoneNumber && { contact: `+91${user.phoneNumber}` }),
        },
        theme: { color: "#e8c44a" },
        modal: {
          ondismiss: () => {
            setPaying(false);
            toast.error("Payment cancelled.");
          },
        },

        // Step 3: Handler called ONLY on successful payment
        handler: async (response) => {
          try {
            // Verify payment on our backend
            const vr = await verifySubscription({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            const result = vr.data.data || {};

            // Paid again while already having an active plan → refund
            if (result.duplicate) {
              toast.error(vr.data.message, { duration: 8000 });
              navigate("/profile");
              return;
            }

            navigate(
              `/subscription/success?plan=${encodeURIComponent(orderData.planName)}&duration=${encodeURIComponent(orderData.durationLabel)}${result.receiptNumber ? `&receipt=${encodeURIComponent(result.receiptNumber)}` : ""}`,
            );
          } catch (err) {
            // Money may already be deducted — reassure instead of alarming.
            // Clicking Pay again is safe: the server checks Razorpay first and
            // activates the earlier payment rather than charging twice.
            toast.error(
              err.response?.status === 401 && /Signature/i.test(err.response?.data?.message || "")
                ? "Payment could not be verified. If money was deducted, contact the gym with your transaction ID."
                : "We couldn't confirm your payment yet. If money was deducted, do NOT pay again — just click Pay once more and we'll find it, or check My Profile in a minute.",
              { duration: 10000 },
            );
            setPaying(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response) => {
        toast.error(`Payment failed: ${response.error.description}`);
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to initiate payment.";
      if (err.response?.status === 409) {
        // Already active (or an earlier payment was just recovered) —
        // refresh so the page shows the membership and disables Pay.
        toast.success(msg, { duration: 6000 });
        getMyActiveSubscription()
          .then((r) => setActiveSub(r.data.data?.subscription || null))
          .catch(() => {});
      } else {
        toast.error(msg);
      }
      setPaying(false);
    }
  };

  const tier = getActiveTier();
  const displayPrice = tier
    ? `₹${(tier.effectivePrice / 100).toLocaleString("en-IN")}`
    : "—";
  const originalPrice = tier?.originalPrice
    ? `₹${(tier.originalPrice / 100).toLocaleString("en-IN")}`
    : null;

  const labelStyle = {
    fontSize: "12px",
    fontWeight: "600",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    display: "block",
    marginBottom: "6px",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        position: "relative",
      }}
    >
      <ParticleBackground particleCount={70} />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background:
            "radial-gradient(ellipse at 40% 40%, rgba(232,196,74,0.04) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />

      <Navbar />

      <div
        style={{
          paddingTop: "100px",
          paddingBottom: "60px",
          padding: "100px 24px 60px",
          position: "relative",
          zIndex: 1,
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            Loading plan details...
          </div>
        ) : !plan ? null : (
          <div className="plan-detail-grid">
            {/* Left — Plan Details */}
            <motion.div
              initial={scaleIn.initial}
              animate={scaleIn.animate}
              transition={scaleIn.transition}
            >
              {plan.isFeatured && (
                <div
                  style={{
                    display: "inline-block",
                    background: "#e8c44a",
                    color: "#0a0a0a",
                    fontSize: "11px",
                    fontWeight: "800",
                    letterSpacing: "1px",
                    padding: "5px 16px",
                    borderRadius: "100px",
                    marginBottom: "20px",
                  }}
                >
                  ★ Most Popular
                </div>
              )}

              <h1
                style={{
                  fontSize: "36px",
                  fontWeight: "800",
                  marginBottom: "8px",
                  letterSpacing: "-1px",
                }}
              >
                {plan.name} Plan
              </h1>
              <p
                style={{
                  fontSize: "15px",
                  color: "rgba(255,255,255,0.5)",
                  marginBottom: "28px",
                  lineHeight: "1.7",
                }}
              >
                {plan.description}
              </p>

              {/* Features */}
              <div style={{ marginBottom: "28px" }}>
                <p style={labelStyle}>What's included</p>
                {plan.features.map((f) => (
                  <div
                    key={f}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "12px",
                    }}
                  >
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: "rgba(232,196,74,0.1)",
                        border: "1px solid rgba(232,196,74,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ color: "#e8c44a", fontSize: "11px" }}>
                        ✓
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "14px",
                        color: "rgba(255,255,255,0.7)",
                      }}
                    >
                      {f}
                    </span>
                  </div>
                ))}
              </div>

              {/* Grace Period note */}
              <div
                style={{
                  padding: "14px 16px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.35)",
                    lineHeight: "1.6",
                  }}
                >
                  ℹ️ Includes a{" "}
                  <strong style={{ color: "rgba(255,255,255,0.5)" }}>
                    {plan.gracePeriodDays || 3}-day grace period
                  </strong>{" "}
                  after expiry. Payments are non-refundable.
                </p>
              </div>
            </motion.div>

            {/* Right — Duration + Price + Pay */}
            <motion.div
              initial={scaleIn.initial}
              animate={scaleIn.animate}
              transition={{ ...scaleIn.transition, delay: 0.1 }}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "20px",
                padding: "28px",
                position: "sticky",
                top: "90px",
              }}
            >
              <p style={labelStyle}>Select duration</p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  marginBottom: "24px",
                }}
              >
                {DURATION_OPTIONS.map((opt) => {
                  const t = plan.pricingTiers.find(
                    (pt) => pt.durationDays === opt.days,
                  );
                  if (!t) return null;
                  const now = new Date();
                  const hasOffer =
                    t.offerPrice &&
                    (!t.offerValidUntil || new Date(t.offerValidUntil) > now);
                  const price = hasOffer ? t.offerPrice : t.price;
                  const isActive = selectedDuration === opt.days;

                  return (
                    <button
                      key={opt.days}
                      onClick={() => setSelectedDuration(opt.days)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 16px",
                        borderRadius: "10px",
                        cursor: "pointer",
                        background: isActive
                          ? "rgba(232,196,74,0.08)"
                          : "rgba(255,255,255,0.02)",
                        border: `1.5px solid ${isActive ? "rgba(232,196,74,0.4)" : "rgba(255,255,255,0.06)"}`,
                        transition: "all 0.2s",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "14px",
                          color: isActive ? "#e8c44a" : "rgba(255,255,255,0.6)",
                          fontWeight: isActive ? "600" : "400",
                        }}
                      >
                        {opt.label}
                      </span>
                      <div style={{ textAlign: "right" }}>
                        {hasOffer && (
                          <span
                            style={{
                              fontSize: "11px",
                              color: "rgba(255,255,255,0.3)",
                              textDecoration: "line-through",
                              marginRight: "6px",
                            }}
                          >
                            ₹{(t.price / 100).toLocaleString("en-IN")}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: "700",
                            color: isActive ? "#e8c44a" : "#fff",
                          }}
                        >
                          ₹{(price / 100).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Price summary */}
              <div
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  paddingTop: "20px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)" }}
                  >
                    Total
                  </span>
                  <div style={{ textAlign: "right" }}>
                    {originalPrice && (
                      <span
                        style={{
                          fontSize: "14px",
                          color: "rgba(255,255,255,0.3)",
                          textDecoration: "line-through",
                          marginRight: "8px",
                        }}
                      >
                        {originalPrice}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: "28px",
                        fontWeight: "900",
                        letterSpacing: "-1px",
                        color: "#e8c44a",
                      }}
                    >
                      {displayPrice}
                    </span>
                  </div>
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.3)",
                    marginTop: "6px",
                    textAlign: "right",
                  }}
                >
                  {
                    DURATION_OPTIONS.find((d) => d.days === selectedDuration)
                      ?.label
                  }{" "}
                  membership
                </p>
              </div>

              {activeSub && (
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    marginBottom: "12px",
                    background: "rgba(34,197,94,0.08)",
                    border: "1px solid rgba(34,197,94,0.2)",
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.7)",
                    lineHeight: 1.5,
                  }}
                >
                  You already have an active{" "}
                  <strong style={{ color: "#22c55e" }}>
                    {activeSub.planSnapshot?.planName}
                  </strong>{" "}
                  membership until{" "}
                  {new Date(activeSub.endDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  . You can purchase a new plan after it expires.{" "}
                  <span
                    onClick={() => navigate("/profile")}
                    style={{ color: "#e8c44a", cursor: "pointer", textDecoration: "underline" }}
                  >
                    View my membership
                  </span>
                </div>
              )}

              {/* Pay button */}
              <button
                onClick={handlePayNow}
                disabled={paying || !razorpayReady || !!activeSub || !tier}
                className="btn-gold"
                style={{
                  fontSize: "15px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                }}
              >
                {paying ? (
                  <>
                    <span className="spinner" />
                    Processing...
                  </>
                ) : (
                  `Pay ${displayPrice} →`
                )}
              </button>

              <p
                style={{
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.25)",
                  textAlign: "center",
                  marginTop: "14px",
                }}
              >
                🔒 Secured by Razorpay · UPI · Cards · Net Banking
              </p>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
