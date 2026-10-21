// =============================================================================
// src/components/profile/MembershipSection.jsx
// =============================================================================

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getMyActiveSubscription,
  getMySubscriptions,
  getMyReceipts,
} from "../../services/subscriptionService.js";
import ReceiptsList from "../ui/ReceiptsList.jsx";

function PaymentsSection({ receipts }) {
  if (!receipts.length) return null;
  return (
    <div style={{ marginTop: "32px" }}>
      <h3
        style={{
          fontSize: "13px", fontWeight: "700", color: "rgba(255,255,255,0.4)",
          letterSpacing: "1px", textTransform: "uppercase", marginBottom: "14px",
        }}
      >
        Payments &amp; Receipts
      </h3>
      <ReceiptsList receipts={receipts} />
      <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "10px" }}>
        A receipt for each payment was emailed to you.
      </p>
    </div>
  );
}

// Add this above the MembershipSection component:
function SubscriptionHistory({ history, formatDate }) {
  const statusColors = {
    active: "#22c55e", grace: "#f97316", expired: "rgba(255,255,255,0.4)",
    cancelled: "#ef4444", complimentary: "#a78bfa", pending: "#e8c44a",
  };

  return (
    <div style={{ marginTop: "28px" }}>
      <p style={{ fontSize: "12px", fontWeight: "700", color: "rgba(255,255,255,0.4)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "14px" }}>
        Subscription History
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {history.map((sub) => {
          const isCancelled = sub.status === "cancelled";
          const color = statusColors[sub.status] || "rgba(255,255,255,0.4)";
          return (
            <div key={sub._id} style={{ padding: "14px 16px", borderRadius: "10px", background: "rgba(255,255,255,0.02)", border: `1px solid ${isCancelled ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: "600" }}>
                    {sub.planSnapshot.planName} — {sub.planSnapshot.durationLabel}
                  </p>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "3px" }}>
                    {formatDate(sub.startDate)} → {formatDate(sub.endDate)}
                  </p>
                  {isCancelled && sub.cancelReason && (
                    <p style={{ fontSize: "12px", color: "rgba(239,68,68,0.6)", marginTop: "4px" }}>
                      ↳ {sub.cancelReason}
                    </p>
                  )}
                  {isCancelled && sub.cancelledAt && (
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: "2px" }}>
                      Cancelled on {formatDate(sub.cancelledAt)}
                    </p>
                  )}
                </div>
                <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "100px", background: `${color}18`, border: `1px solid ${color}33`, color, fontWeight: "700", textTransform: "uppercase", flexShrink: 0, marginLeft: "12px" }}>
                  {sub.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MembershipSection() {
  const navigate = useNavigate();
  const [data, setData] = useState(null); // { subscription, payment, installments }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await getMyActiveSubscription();
      const { subscription, payment, installments } = res.data.data;
      setData(subscription ? { subscription, payment, installments } : null);
    } catch {
      toast.error("Failed to load membership.");
    } finally {
      setLoading(false);
    }
  };

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [receipts, setReceipts] = useState([]);

  useEffect(() => {
    fetchSubscription();
    fetchHistory();
    getMyReceipts()
      .then((res) => setReceipts(res.data.data.receipts || []))
      .catch(() => {}); // non-critical
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await getMySubscriptions();
      setHistory(res.data.data.subscriptions || []);
    } catch {
      // non-critical — don't show error
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const getDaysRemaining = (endDate) =>
    Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));

  const labelStyle = {
    fontSize: "12px",
    fontWeight: "600",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    display: "block",
    marginBottom: "6px",
  };

  if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "48px",
          color: "rgba(255,255,255,0.3)",
        }}
      >
        <div
          className="spinner"
          style={{
            borderColor: "rgba(255,255,255,0.1)",
            borderTopColor: "#e8c44a",
            margin: "0 auto 12px",
          }}
        />
        Loading membership...
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <h2
          style={{ fontSize: "18px", fontWeight: "700", marginBottom: "6px" }}
        >
          Membership
        </h2>
        <p
          style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.4)",
            marginBottom: "32px",
          }}
        >
          You don't have an active membership plan.
        </p>
        <div
          style={{
            padding: "40px",
            borderRadius: "16px",
            textAlign: "center",
            background: "rgba(232,196,74,0.03)",
            border: "1px dashed rgba(232,196,74,0.2)",
          }}
        >
          <p style={{ fontSize: "32px", marginBottom: "16px" }}>🏋️</p>
          <h3
            style={{ fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}
          >
            No active membership
          </h3>
          <p
            style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.4)",
              marginBottom: "24px",
            }}
          >
            Choose a plan to get full access to HULK Gym.
          </p>
          <button
            onClick={() => {
              navigate("/");
              setTimeout(
                () =>
                  document
                    .getElementById("pricing")
                    ?.scrollIntoView({ behavior: "smooth" }),
                300,
              );
            }}
            className="btn-gold"
            style={{ width: "auto", padding: "12px 28px", fontSize: "14px" }}
          >
            View Plans →
          </button>
        </div>

        <PaymentsSection receipts={receipts} />
        {history.length > 0 && <SubscriptionHistory history={history} formatDate={formatDate} />}
      </div>
    );
  }

  const { subscription, payment, installments } = data;
  const daysRemaining = getDaysRemaining(subscription.endDate);
  const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;
  const isInGrace = daysRemaining <= 0;
  const isPartial = payment?.status === "partial";

  return (
    <div>
      <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "6px" }}>
        Membership
      </h2>
      <p
        style={{
          fontSize: "13px",
          color: "rgba(255,255,255,0.4)",
          marginBottom: "28px",
        }}
      >
        Your current membership plan and status.
      </p>

      {/* Expiry Warning Banners */}
      {isExpiringSoon && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "12px",
            marginBottom: "20px",
            background: "rgba(249,115,22,0.08)",
            border: "1px solid rgba(249,115,22,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span>⚠️</span>
          <div style={{ flex: 1 }}>
            <p
              style={{ fontSize: "13px", fontWeight: "600", color: "#f97316" }}
            >
              Membership expiring in {daysRemaining} day
              {daysRemaining !== 1 ? "s" : ""}
            </p>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
              Renew now to avoid losing access.
            </p>
          </div>
          <button
            onClick={() => {
              navigate("/");
              setTimeout(
                () =>
                  document
                    .getElementById("pricing")
                    ?.scrollIntoView({ behavior: "smooth" }),
                300,
              );
            }}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              background: "rgba(249,115,22,0.15)",
              border: "1px solid rgba(249,115,22,0.3)",
              color: "#f97316",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Renew Now
          </button>
        </div>
      )}

      {isInGrace && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "12px",
            marginBottom: "20px",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span>🔴</span>
          <div>
            <p
              style={{ fontSize: "13px", fontWeight: "600", color: "#ef4444" }}
            >
              Membership expired — Grace period active
            </p>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
              Renew immediately to continue your access.
            </p>
          </div>
        </div>
      )}

      {/* Cancellation notice */}
      {subscription.status === "cancelled" && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "12px",
            marginBottom: "20px",
            background: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.15)",
          }}
        >
          <p
            style={{
              fontSize: "13px",
              fontWeight: "600",
              color: "#ef4444",
              marginBottom: "4px",
            }}
          >
            Membership Cancelled
          </p>
          {subscription.cancelReason && (
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
              Reason: {subscription.cancelReason}
            </p>
          )}
          {subscription.cancelledAt && (
            <p
              style={{
                fontSize: "12px",
                color: "rgba(255,255,255,0.3)",
                marginTop: "4px",
              }}
            >
              Cancelled on {formatDate(subscription.cancelledAt)}
            </p>
          )}
        </div>
      )}

      {/* Plan Card */}
      <div
        style={{
          padding: "24px",
          borderRadius: "16px",
          marginBottom: "20px",
          background:
            "linear-gradient(135deg, rgba(232,196,74,0.08), rgba(232,196,74,0.02))",
          border: "1px solid rgba(232,196,74,0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "20px",
          }}
        >
          <div>
            <h3
              style={{
                fontSize: "22px",
                fontWeight: "800",
                marginBottom: "4px",
              }}
            >
              {subscription.planSnapshot.planName}
            </h3>
            <p
              style={{ fontSize: "13px", color: "#e8c44a", fontWeight: "600" }}
            >
              {subscription.planSnapshot.durationLabel} Plan
            </p>
          </div>
          <span
            style={{
              fontSize: "11px",
              padding: "4px 12px",
              borderRadius: "100px",
              fontWeight: "700",
              background: isInGrace
                ? "rgba(239,68,68,0.1)"
                : isExpiringSoon
                  ? "rgba(249,115,22,0.1)"
                  : "rgba(34,197,94,0.1)",
              border: `1px solid ${isInGrace ? "rgba(239,68,68,0.3)" : isExpiringSoon ? "rgba(249,115,22,0.3)" : "rgba(34,197,94,0.3)"}`,
              color: isInGrace
                ? "#ef4444"
                : isExpiringSoon
                  ? "#f97316"
                  : "#22c55e",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            {isInGrace ? "Grace Period" : subscription.status}
          </span>
        </div>

        {/* Dates + amount grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <div>
            <span style={labelStyle}>Start Date</span>
            <p style={{ fontSize: "14px", fontWeight: "600" }}>
              {formatDate(subscription.startDate)}
            </p>
          </div>
          <div>
            <span style={labelStyle}>Valid Until</span>
            <p
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: isExpiringSoon ? "#f97316" : "#fff",
              }}
            >
              {formatDate(subscription.endDate)}
            </p>
          </div>
          <div>
            <span style={labelStyle}>Amount Paid</span>
            <p
              style={{ fontSize: "14px", fontWeight: "600", color: "#e8c44a" }}
            >
              {payment
                ? payment.paymentMode === "complimentary"
                  ? "Complimentary"
                  : `₹${(payment.amountPaid / 100).toLocaleString("en-IN")}`
                : "—"}
            </p>
          </div>
          {isPartial && payment && (
            <div>
              <span style={labelStyle}>Balance Due</span>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#ef4444",
                }}
              >
                ₹
                {(
                  (payment.amountDue - payment.amountPaid) /
                  100
                ).toLocaleString("en-IN")}
              </p>
            </div>
          )}
          <div>
            <span style={labelStyle}>Days Remaining</span>
            <p
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: isExpiringSoon ? "#f97316" : "#fff",
              }}
            >
              {daysRemaining > 0 ? `${daysRemaining} days` : "Expired"}
            </p>
          </div>
          <div>
            <span style={labelStyle}>Payment Mode</span>
            <p
              style={{
                fontSize: "14px",
                fontWeight: "600",
                textTransform: "capitalize",
              }}
            >
              {subscription.paymentMode}
            </p>
          </div>
          {payment?.receiptNumber && (
            <div>
              <span style={labelStyle}>Receipt No.</span>
              <p style={{ fontSize: "14px", fontWeight: "600" }}>
                {payment.receiptNumber}
              </p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {(() => {
          const total = subscription.planSnapshot.durationDays;
          const elapsed = total - Math.max(daysRemaining, 0);
          const pct = Math.min((elapsed / total) * 100, 100);
          return (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
                <span
                  style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}
                >
                  Plan progress
                </span>
                <span
                  style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}
                >
                  {Math.round(pct)}% used
                </span>
              </div>
              <div
                style={{
                  height: "4px",
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: "2px",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: "2px",
                    width: `${pct}%`,
                    background: isExpiringSoon ? "#f97316" : "#e8c44a",
                    transition: "width 0.3s",
                  }}
                />
              </div>
            </div>
          );
        })()}
      </div>

      {/* Installments */}
      {installments && installments.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <p style={{ ...labelStyle, marginBottom: "12px" }}>
            Installment Schedule
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {installments.map((inst) => {
              const isPaid = inst.status === "paid";
              const isOverdue = inst.status === "overdue";
              const color = isPaid
                ? "#22c55e"
                : isOverdue
                  ? "#ef4444"
                  : "#f97316";

              return (
                <div
                  key={inst._id}
                  style={{
                    padding: "14px 16px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.02)",
                    border: `1px solid ${isPaid ? "rgba(34,197,94,0.1)" : isOverdue ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)"}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <span style={{ fontSize: "16px", color }}>
                        {isPaid ? "✓" : isOverdue ? "!" : "○"}
                      </span>
                      <div>
                        <p style={{ fontSize: "14px", fontWeight: "600" }}>
                          Installment {inst.installmentNumber}
                        </p>
                        <p
                          style={{
                            fontSize: "12px",
                            color: "rgba(255,255,255,0.4)",
                            marginTop: "2px",
                          }}
                        >
                          Due: {formatDate(inst.dueDate)}
                          {isPaid &&
                            inst.paidAt &&
                            ` · Paid: ${formatDate(inst.paidAt)}`}
                          {isPaid &&
                            inst.paymentMode &&
                            ` · ${inst.paymentMode.charAt(0).toUpperCase() + inst.paymentMode.slice(1)}`}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: "14px", fontWeight: "700" }}>
                        ₹{(inst.amountDue / 100).toLocaleString("en-IN")}
                      </p>
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "100px",
                          background: `${color}18`,
                          border: `1px solid ${color}33`,
                          color,
                          fontWeight: "600",
                          textTransform: "uppercase",
                        }}
                      >
                        {inst.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Features */}
      <div>
        <p style={{ ...labelStyle, marginBottom: "12px" }}>
          Included in your plan
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
          }}
        >
          {subscription.planSnapshot.features.map((f) => (
            <div
              key={f}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <span
                style={{ color: "#e8c44a", fontSize: "12px", flexShrink: 0 }}
              >
                ✓
              </span>
              <span
                style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}
              >
                {f}
              </span>
            </div>
          ))}
        </div>
      </div>

      <PaymentsSection receipts={receipts} />

      {/* Subscription History */}
      {history.length > 0 && <SubscriptionHistory history={history} formatDate={formatDate} />}
    </div>
  );
}
