// =============================================================================
// src/pages/admin/AdminMembersPage.jsx
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout.jsx";
import api from "../../services/api.js";
import ReceiptsList from "../../components/ui/ReceiptsList.jsx";
import { Search, TriangleAlert } from "lucide-react";
import { Tip, InfoTip } from "../../components/ui/Tip.jsx";

const ITEMS_PER_PAGE = 10;

// =============================================================================
// MarkInstallmentModal
// =============================================================================

function MarkInstallmentModal({ installment, onClose, onSaved }) {
  const [paymentMode, setPaymentMode] = useState("cash");
  const [saving, setSaving] = useState(false);
  // Pay only what's left — the backend adds to any earlier partial payment
  const remainingPaise = installment.amountDue - (installment.amountPaid || 0);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const res = await api.patch(`/admin/installments/${installment._id}`, {
        amountPaid: remainingPaise / 100,
        paymentMode,
      });
      const rn = res.data.data?.receiptNumber;
      toast.success(
        `Installment ${installment.installmentNumber} marked as paid.${rn ? ` Receipt ${rn} emailed.` : ""}`,
      );
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to mark installment as paid.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          background: "var(--iron-850)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px",
          padding: "32px",
          maxWidth: "400px",
          width: "100%",
        }}
      >
        <h3
          style={{ fontSize: "18px", fontWeight: "700", marginBottom: "6px" }}
        >
          Mark Installment Paid
        </h3>
        <p
          style={{
            fontSize: "15px",
            color: "rgba(255,255,255,0.62)",
            marginBottom: "24px",
          }}
        >
          Installment {installment.installmentNumber} — ₹
          {(remainingPaise / 100).toLocaleString("en-IN")}
        </p>

        <p
          style={{
            fontSize: "14px",
            fontWeight: "600",
            color: "rgba(255,255,255,0.62)",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            marginBottom: "10px",
          }}
        >
          Payment Mode
        </p>
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
          {["cash", "upi", "card"].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setPaymentMode(mode)}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "600",
                textTransform: "capitalize",
                border:
                  paymentMode === mode
                    ? "1px solid rgba(243,212,0,0.4)"
                    : "1px solid rgba(255,255,255,0.1)",
                background:
                  paymentMode === mode ? "rgba(243,212,0,0.1)" : "transparent",
                color:
                  paymentMode === mode ? "#f3d400" : "rgba(255,255,255,0.5)",
              }}
            >
              {mode === "cash"
                ? "Cash"
                : mode === "upi"
                  ? "UPI"
                  : "Card"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ flex: 1, padding: "12px" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="btn-gold"
            style={{ flex: 1 }}
          >
            {saving ? "Saving..." : "Confirm Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CollectBalanceForm
// =============================================================================
function CollectBalanceForm({ subscription, payment, onSuccess, onCancel }) {
  const [amount, setAmount]         = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [saving, setSaving]         = useState(false);
  const maxBalance = (payment.amountDue - payment.amountPaid) / 100;
  const fmt = (n) => n.toLocaleString("en-IN");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return toast.error("Enter a valid amount.");
    if (Number(amount) > maxBalance) return toast.error(`Amount exceeds balance of ₹${maxBalance}.`);
    setSaving(true);
    try {
      const res = await api.post(`/admin/subscriptions/${subscription._id}/collect`, {
        amountPaid : Number(amount),
        paymentMode,
      });
      const rn = res.data.data?.receipt?.receiptNumber;
      toast.success(`Payment recorded.${rn ? ` Receipt ${rn} emailed.` : ""}`);
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record payment.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "10px 14px", color: "#fff", fontSize: "16px", outline: "none" };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div>
        <label style={{ fontSize: "14px", fontWeight: "600", color: "rgba(255,255,255,0.62)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
          Amount (₹) — max ₹{fmt(maxBalance)}
        </label>
        <input type="number" style={inputStyle} placeholder={`Up to ₹${fmt(maxBalance)}`}
          value={amount} onChange={(e) => setAmount(e.target.value)} max={maxBalance} />
      </div>
      <div>
        <label style={{ fontSize: "14px", fontWeight: "600", color: "rgba(255,255,255,0.62)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Payment Mode</label>
        <div style={{ display: "flex", gap: "8px" }}>
          {["cash", "upi", "card"].map((mode) => (
            <button key={mode} type="button" onClick={() => setPaymentMode(mode)}
              style={{ flex: 1, padding: "9px", borderRadius: "8px", cursor: "pointer", fontSize: "15px", fontWeight: "600",
                border: paymentMode === mode ? "1px solid rgba(243,212,0,0.4)" : "1px solid rgba(255,255,255,0.1)",
                background: paymentMode === mode ? "rgba(243,212,0,0.1)" : "transparent",
                color: paymentMode === mode ? "#f3d400" : "rgba(255,255,255,0.5)" }}>
              {mode === "cash" ? "Cash" : mode === "upi" ? "UPI" : "Card"}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
        <button type="button" onClick={onCancel} className="btn-ghost" style={{ flex: 1, padding: "11px" }}>Cancel</button>
        <button type="submit" className="btn-gold" disabled={saving} style={{ flex: 1 }}>
          {saving ? "Recording..." : "Record Payment"}
        </button>
      </div>
    </form>
  );
}

// =============================================================================
// CashPaymentForm
// =============================================================================

function CashPaymentForm({ member, plans, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    planId: "",
    durationDays: "30",
    paymentMode: "cash",
    amountPaid: "",
    startDate: new Date().toISOString().split("T")[0],
    isComplimentary: false,
    notes: "",
  });
  const [useInstallments, setUseInstallments] = useState(false);
  const [installments, setInstallments] = useState([
    { amountDue: "", dueDate: "" },
    { amountDue: "", dueDate: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const selectedPlan = plans.find((p) => p._id === form.planId);
  const selectedTier = selectedPlan?.pricingTiers?.find(
    (t) => t.durationDays === Number(form.durationDays),
  );
  const planPrice = selectedTier ? selectedTier.price / 100 : 0;

  const durationOptions = [
    { days: "30", label: "Monthly (30 days)" },
    { days: "90", label: "Quarterly (90 days)" },
    { days: "180", label: "Half-Yearly (180 days)" },
    { days: "365", label: "Annual (365 days)" },
  ];

  const addInstallment = () =>
    setInstallments([...installments, { amountDue: "", dueDate: "" }]);
  const removeInstallment = (i) =>
    setInstallments(installments.filter((_, idx) => idx !== i));
  const updateInstallment = (i, field, value) => {
    const updated = [...installments];
    updated[i][field] = value;
    setInstallments(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.planId) return toast.error("Please select a plan.");
    if (!form.isComplimentary && !form.amountPaid)
      return toast.error("Please enter amount paid.");

    setSaving(true);
    try {
      const payload = {
        userId: member._id,
        planId: form.planId,
        durationDays: Number(form.durationDays),
        startDate: form.startDate,
        paymentMode: form.paymentMode,
        amountPaid: form.isComplimentary ? 0 : Number(form.amountPaid),
        isComplimentary: form.isComplimentary,
        notes: form.notes,
      };

      if (useInstallments && !form.isComplimentary) {
        const valid = installments.filter((i) => i.amountDue && i.dueDate);
        if (!valid.length) return toast.error("Add at least one installment.");
        payload.installments = valid;
      }

      const res = await api.post("/admin/subscriptions/offline", payload);
      toast.success(
        `${res.data.message}${res.data.data?.receipt ? ` Receipt ${res.data.data.receipt.receiptNumber} emailed.` : ""}`,
        { duration: 6000 },
      );
      onSuccess();
      onCancel();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record payment.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px",
    padding: "10px 14px",
    color: "#fff",
    fontSize: "16px",
    outline: "none",
  };
  const labelStyle = {
    fontSize: "14px",
    fontWeight: "600",
    color: "rgba(255,255,255,0.62)",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    display: "block",
    marginBottom: "6px",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          background: "var(--iron-850)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px",
          padding: "32px",
          maxWidth: "560px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "19px", fontWeight: "700" }}>
              Record Payment
            </h2>
            <p
              style={{
                fontSize: "15px",
                color: "rgba(255,255,255,0.62)",
                marginTop: "4px",
              }}
            >
              {member.firstName} {member.lastName} · {member.userId}
            </p>
          </div>
          <button aria-label="Close"
            onClick={onCancel}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.62)",
              fontSize: "20px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          {/* Complimentary */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
              padding: "12px 16px",
              background: "rgba(243,212,0,0.05)",
              borderRadius: "10px",
              border: "1px solid rgba(243,212,0,0.1)",
            }}
          >
            <input
              type="checkbox"
              checked={form.isComplimentary}
              onChange={(e) =>
                setForm({ ...form, isComplimentary: e.target.checked })
              }
              style={{ width: "16px", height: "16px", accentColor: "#f3d400" }}
            />
            <div>
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#f3d400",
                }}
              >
                Complimentary Membership{" "}
                <InfoTip text="A free membership. Nothing is charged, no receipt is made, and it adds nothing to revenue. The member gets a welcome email." />
              </span>
              <p
                style={{
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.62)",
                  marginTop: "2px",
                }}
              >
                Free — for staff, partners, compensation
              </p>
            </div>
          </label>

          {/* Plan */}
          <div>
            <label style={labelStyle}>Membership Plan</label>
            <select
              style={{ ...inputStyle, appearance: "none" }}
              value={form.planId}
              onChange={(e) => setForm({ ...form, planId: e.target.value })}
            >
              <option value="">Select a plan</option>
              {plans.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div>
            <label style={labelStyle}>Duration</label>
            <select
              style={{ ...inputStyle, appearance: "none" }}
              value={form.durationDays}
              onChange={(e) =>
                setForm({ ...form, durationDays: e.target.value })
              }
            >
              {durationOptions.map((o) => (
                <option key={o.days} value={o.days}>
                  {o.label}
                </option>
              ))}
            </select>
            {planPrice > 0 && (
              <p
                style={{ fontSize: "14px", color: "#f3d400", marginTop: "6px" }}
              >
                Plan price: ₹{planPrice.toLocaleString("en-IN")}
              </p>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label style={labelStyle}>Start Date</label>
            <input
              type="date"
              style={{ ...inputStyle, colorScheme: "dark" }}
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </div>

          {/* Payment details */}
          {!form.isComplimentary && (
            <>
              <div>
                <label style={labelStyle}>Payment Mode</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {["cash", "upi", "card"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setForm({ ...form, paymentMode: mode })}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "15px",
                        fontWeight: "600",
                        textTransform: "capitalize",
                        border:
                          form.paymentMode === mode
                            ? "1px solid rgba(243,212,0,0.4)"
                            : "1px solid rgba(255,255,255,0.1)",
                        background:
                          form.paymentMode === mode
                            ? "rgba(243,212,0,0.1)"
                            : "transparent",
                        color:
                          form.paymentMode === mode
                            ? "#f3d400"
                            : "rgba(255,255,255,0.5)",
                      }}
                    >
                      {mode === "cash"
                        ? "Cash"
                        : mode === "upi"
                          ? "UPI"
                          : "Card"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Amount Received (₹)</label>
                <input
                  type="number"
                  style={inputStyle}
                  placeholder={`Full amount: ₹${planPrice}`}
                  value={form.amountPaid}
                  onChange={(e) =>
                    setForm({ ...form, amountPaid: e.target.value })
                  }
                />
                {form.amountPaid && Number(form.amountPaid) < planPrice && (
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#f97316",
                      marginTop: "6px",
                    }}
                  >
                    Partial — Balance: ₹
                    {(planPrice - Number(form.amountPaid)).toLocaleString(
                      "en-IN",
                    )}
                  </p>
                )}
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={useInstallments}
                  onChange={(e) => setUseInstallments(e.target.checked)}
                  style={{
                    width: "16px",
                    height: "16px",
                    accentColor: "#f3d400",
                  }}
                />
                <span
                  style={{ fontSize: "15px", color: "rgba(255,255,255,0.6)" }}
                >
                  Create installment schedule{" "}
                  <InfoTip text="Split what is still unpaid into parts, each with a due date. The member sees what is due, and late parts are flagged as overdue." />
                </span>
              </label>

              {useInstallments && (
                <div
                  style={{
                    background: "var(--iron-850)",
                    borderRadius: "12px",
                    padding: "16px",
                    border: "1px solid #26262a",
                  }}
                >
                  <p style={{ ...labelStyle, marginBottom: "12px" }}>
                    Installment Schedule
                  </p>
                  {installments.map((inst, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: "8px",
                        marginBottom: "10px",
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="number"
                        style={{ ...inputStyle, padding: "8px 12px" }}
                        placeholder="Amount ₹"
                        value={inst.amountDue}
                        onChange={(e) =>
                          updateInstallment(i, "amountDue", e.target.value)
                        }
                      />
                      <input
                        type="date"
                        style={{
                          ...inputStyle,
                          padding: "8px 12px",
                          colorScheme: "dark",
                        }}
                        value={inst.dueDate}
                        onChange={(e) =>
                          updateInstallment(i, "dueDate", e.target.value)
                        }
                      />
                      {installments.length > 1 && (
                        <button aria-label="Remove installment"
                          type="button"
                          onClick={() => removeInstallment(i)}
                          style={{
                            background: "rgba(239,68,68,0.1)",
                            border: "1px solid rgba(239,68,68,0.2)",
                            color: "#ef4444",
                            borderRadius: "8px",
                            padding: "8px 12px",
                            cursor: "pointer",
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addInstallment}
                    style={{
                      background: "transparent",
                      border: "1px dashed rgba(255,255,255,0.15)",
                      color: "rgba(255,255,255,0.62)",
                      borderRadius: "8px",
                      padding: "8px 16px",
                      fontSize: "14px",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    + Add Installment
                  </button>
                </div>
              )}
            </>
          )}

          <div>
            <label style={labelStyle}>Notes (optional)</label>
            <textarea
              style={{ ...inputStyle, resize: "vertical" }}
              rows={2}
              placeholder="e.g. Paid at front desk..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="button"
              onClick={onCancel}
              className="btn-ghost"
              style={{ flex: 1, padding: "12px" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-gold"
              disabled={saving}
              style={{ flex: 1 }}
            >
              {saving ? "Recording..." : "Activate Membership"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// AdminMembersPage
// =============================================================================

export default function AdminMembersPage() {
  // ── Search state ────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [page, setPage] = useState(1);
  const [searching, setSearching] = useState(false);

  // ── Detail panel state ──────────────────────────────────────────────────────
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberDetail, setMemberDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [plans, setPlans] = useState([]);

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [markingInstallment, setMarkingInstallment] = useState(null);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [collectBalanceModal, setCollectBalanceModal] = useState(null);

  // Escape closes whichever popup is open
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setCollectBalanceModal(null);
      setMarkingInstallment(null);
      setCancelDialog(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Search ──────────────────────────────────────────────────────────────────
  const searchMembers = useCallback(async (q, pageNum = 1) => {
    setSearching(true);
    try {
      // Empty query → backend lists all members
      const effectiveQuery = q.trim();
      const res = await api.get(
        `/admin/members?q=${encodeURIComponent(effectiveQuery)}&page=${pageNum}&limit=${ITEMS_PER_PAGE}`,
      );
      setMembers(res.data.data.members);
      setTotalMembers(res.data.data.total || 0);
    } catch {
      toast.error("Search failed.");
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    searchMembers("", 1);
  }, []);

  const handleQueryChange = (value) => {
    setQuery(value);
    setPage(1);
    searchMembers(value || "", 1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    searchMembers(query || "", newPage);
  };

  // ── Member detail ────────────────────────────────────────────────────────────
  // /admin/members/:id opens that member directly (used by dashboard links)
  const { id: routeMemberId } = useParams();
  useEffect(() => {
    if (routeMemberId) loadMemberDetail({ _id: routeMemberId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeMemberId]);

  const loadMemberDetail = async (member) => {
    setSelectedMember(member);
    setLoadingDetail(true);
    try {
      const [memberRes, plansRes] = await Promise.all([
        api.get(`/admin/members/${member._id}`),
        api.get("/admin/plans"),
      ]);
      setMemberDetail(memberRes.data.data);
      // Deep links pass only { _id } — fill in name etc. for headers/dialogs
      setSelectedMember((prev) => ({ ...memberRes.data.data.user, ...prev, ...memberRes.data.data.user }));
      setPlans(plansRes.data.data.plans.filter((p) => p.status === "active"));
    } catch {
      toast.error("Failed to load member details.");
    } finally {
      setLoadingDetail(false);
    }
  };

  // ── Cancel subscription ──────────────────────────────────────────────────────
  const handleCancelSubscription = async () => {
    try {
      await api.patch(
        `/admin/subscriptions/${memberDetail.activeSubscription._id}/cancel`,
        {
          reason: cancelReason || "Cancelled by admin",
        },
      );
      toast.success("Subscription cancelled.");
      setCancelDialog(false);
      setCancelReason("");
      loadMemberDetail(selectedMember);
    } catch {
      toast.error("Failed to cancel subscription.");
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const statusColor = (status) =>
    ({
      active: "#22c55e",
      grace: "#f97316",
      expired: "#ef4444",
      cancelled: "#8c8c86",
      pending: "#f3d400",
      complimentary: "#a78bfa",
    })[status] || "#8c8c86";

  const totalPages = Math.ceil(totalMembers / ITEMS_PER_PAGE);

  return (
    <AdminLayout>
      {/* Modals */}
      {showPaymentForm && selectedMember && (
        <CashPaymentForm
          member={selectedMember}
          plans={plans}
          onSuccess={() => loadMemberDetail(selectedMember)}
          onCancel={() => setShowPaymentForm(false)}
        />
      )}

      {markingInstallment && (
        <MarkInstallmentModal
          installment={markingInstallment}
          onClose={() => setMarkingInstallment(null)}
          onSaved={() => loadMemberDetail(selectedMember)}
        />
      )}

      {collectBalanceModal && (
        <div
          onClick={() => setCollectBalanceModal(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--iron-850)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "20px", padding: "32px", maxWidth: "400px", width: "100%",
            }}
          >
            <h3 style={{ fontSize: "19px", fontWeight: "700", marginBottom: "6px" }}>
              Collect Outstanding Balance
            </h3>
            <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.62)", marginBottom: "20px" }}>
              Paid ₹{(collectBalanceModal.payment.amountPaid / 100).toLocaleString("en-IN")} of ₹
              {(collectBalanceModal.payment.amountDue / 100).toLocaleString("en-IN")}
            </p>
            <CollectBalanceForm
              subscription={collectBalanceModal.subscription}
              payment={collectBalanceModal.payment}
              onSuccess={() => {
                setCollectBalanceModal(null);
                loadMemberDetail(selectedMember);
              }}
              onCancel={() => setCollectBalanceModal(null)}
            />
          </div>
        </div>
      )}

      {cancelDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            style={{
              background: "var(--iron-850)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "20px",
              padding: "36px",
              maxWidth: "420px",
              width: "100%",
              textAlign: "center",
            }}
          >
            <div style={{ marginBottom: "16px" }}><TriangleAlert size={36} color="var(--yellow)" aria-hidden="true" /></div>
            <h3
              style={{
                fontSize: "19px",
                fontWeight: "700",
                marginBottom: "12px",
              }}
            >
              Cancel Membership?
            </h3>
            <p
              style={{
                fontSize: "16px",
                color: "rgba(255,255,255,0.5)",
                marginBottom: "20px",
                lineHeight: "1.6",
              }}
            >
              {selectedMember?.firstName}'s membership ends immediately. Any
              unpaid installments will be waived.
            </p>
            <textarea
              placeholder="Reason for cancellation (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                padding: "10px 14px",
                color: "#fff",
                fontSize: "15px",
                resize: "vertical",
                marginBottom: "20px",
                outline: "none",
              }}
              rows={2}
            />
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => {
                  setCancelDialog(false);
                  setCancelReason("");
                }}
                className="btn-ghost"
                style={{ flex: 1, padding: "12px" }}
              >
                No, keep it
              </button>
              <button
                onClick={handleCancelSubscription}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  border: "none",
                  background: "#ef4444",
                  color: "#fff",
                  fontWeight: "600",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: one column; when a member is open show only the detail */}
      <style>{`
        .members-back { display: none; }
        @media (max-width: 900px) {
          .members-layout { grid-template-columns: 1fr !important; }
          .members-layout.has-selection .members-list { display: none; }
          .members-back { display: inline-flex; }
        }
      `}</style>

      {/* Layout */}
      <div
        className={`members-layout${selectedMember ? " has-selection" : ""}`}
        style={{
          display: "grid",
          gridTemplateColumns: selectedMember ? "340px 1fr" : "1fr",
          gap: "24px",
          minHeight: "calc(100vh - 120px)",
        }}
      >
        {/* Left — Member List */}
        <div className="members-list" style={{ minWidth: 0 }}>
          <h1 className="page-title" style={{ marginBottom: "20px" }}>
            Members
          </h1>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <input
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                padding: "12px 40px 12px 40px",
                color: "#fff",
                fontSize: "16px",
                outline: "none",
              }}
              placeholder="Search by name, email, phone, ID..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
            />
            <span
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "rgba(255,255,255,0.55)",
                fontSize: "17px",
                pointerEvents: "none",
              }}
            >
              <Search size={16} aria-hidden="true" />
            </span>
            {query && (
              <button aria-label="Clear search"
                onClick={() => handleQueryChange("")}
                style={{
                  position: "absolute",
                  right: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.55)",
                  cursor: "pointer",
                  fontSize: "17px",
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Count */}
          <p
            style={{
              fontSize: "14px",
              color: "rgba(255,255,255,0.55)",
              marginBottom: "12px",
            }}
          >
            {searching
              ? "Searching..."
              : `${totalMembers} member${totalMembers !== 1 ? "s" : ""} found`}
          </p>

          {/* List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {members.length === 0 && !searching ? (
              <p
                style={{
                  fontSize: "15px",
                  color: "rgba(255,255,255,0.55)",
                  textAlign: "center",
                  padding: "20px",
                }}
              >
                No members found.
              </p>
            ) : (
              members.map((m) => (
                <div
                  key={m._id}
                  onClick={() => loadMemberDetail(m)}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    background:
                      selectedMember?._id === m._id
                        ? "rgba(243,212,0,0.08)"
                        : "rgba(255,255,255,0.02)",
                    border: `1px solid ${selectedMember?._id === m._id ? "rgba(243,212,0,0.2)" : "rgba(255,255,255,0.05)"}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    {m.profilePicture ? (
                      <img
                        src={m.profilePicture}
                        alt=""
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background: "rgba(243,212,0,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#f3d400",
                          fontWeight: "700",
                          flexShrink: 0,
                        }}
                      >
                        {m.firstName[0]}
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: "16px",
                          fontWeight: "600",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {m.firstName} {m.lastName}
                      </p>
                      <p
                        style={{
                          fontSize: "14px",
                          color: "rgba(255,255,255,0.62)",
                        }}
                      >
                        {m.userId} · {m.phoneNumber}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                marginTop: "16px",
              }}
            >
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                style={{
                  padding: "7px 14px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent",
                  color:
                    page === 1
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(255,255,255,0.6)",
                  cursor: page === 1 ? "not-allowed" : "pointer",
                  fontSize: "15px",
                }}
              >
                ← Prev
              </button>
              <span
                style={{ fontSize: "15px", color: "rgba(255,255,255,0.62)" }}
              >
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                style={{
                  padding: "7px 14px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent",
                  color:
                    page === totalPages
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(255,255,255,0.6)",
                  cursor: page === totalPages ? "not-allowed" : "pointer",
                  fontSize: "15px",
                }}
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Right — Member Detail */}
        {selectedMember && (
          <div style={{ minWidth: 0 }}>
            <button
              className="members-back"
              onClick={() => {
                setSelectedMember(null);
                setMemberDetail(null);
              }}
              style={{
                marginBottom: "16px", padding: "8px 14px", borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
                color: "rgba(255,255,255,0.6)", fontSize: "15px", cursor: "pointer",
              }}
            >
              ← All members
            </button>
            {loadingDetail ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                Loading...
              </div>
            ) : memberDetail ? (
              <>
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "24px",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                    }}
                  >
                    <div
                      style={{
                        width: "52px",
                        height: "52px",
                        borderRadius: "50%",
                        background: "rgba(243,212,0,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#f3d400",
                        fontSize: "20px",
                        fontWeight: "700",
                        flexShrink: 0,
                      }}
                    >
                      {memberDetail.user.firstName[0]}
                    </div>
                    <div>
                      <h2 style={{ fontSize: "19px", fontWeight: "700" }}>
                        {memberDetail.user.firstName}{" "}
                        {memberDetail.user.lastName}
                      </h2>
                      <p
                        style={{
                          fontSize: "15px",
                          color: "rgba(255,255,255,0.62)",
                        }}
                      >
                        {memberDetail.user.userId} · {memberDetail.user.email}
                      </p>
                    </div>
                  </div>
                  <Tip text={memberDetail.activeSubscription ? "This member already has an active plan. Collect any balance, or cancel the plan first." : null}><button
                    onClick={() => setShowPaymentForm(true)}
                    className="btn-gold"
                    // One active plan per member (backend enforces it) — say so
                    // up front instead of after the admin fills the whole form.
                    disabled={!!memberDetail.activeSubscription}
                    style={{
                      width: "auto",
                      padding: "10px 20px",
                      fontSize: "15px",
                      flexShrink: 0,
                      opacity: memberDetail.activeSubscription ? 0.45 : 1,
                      cursor: memberDetail.activeSubscription ? "not-allowed" : "pointer",
                    }}
                  >
                    + New Membership
                  </button></Tip>
                </div>

                {/* Active Subscription */}
                <div style={{ marginBottom: "20px" }}>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "700",
                      color: "rgba(255,255,255,0.62)",
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                      marginBottom: "12px",
                    }}
                  >
                    Current Membership
                  </p>

                  {memberDetail.activeSubscription ? (
                    <div
                      style={{
                        padding: "20px",
                        borderRadius: "14px",
                        background: "rgba(34,197,94,0.04)",
                        border: "1px solid rgba(34,197,94,0.15)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "16px",
                        }}
                      >
                        <div>
                          <p style={{ fontSize: "17px", fontWeight: "700" }}>
                            {
                              memberDetail.activeSubscription.planSnapshot
                                .planName
                            }
                          </p>
                          <p
                            style={{
                              fontSize: "15px",
                              color: "rgba(255,255,255,0.62)",
                            }}
                          >
                            {
                              memberDetail.activeSubscription.planSnapshot
                                .durationLabel
                            }{" "}
                            · Expires{" "}
                            {formatDate(
                              memberDetail.activeSubscription.endDate,
                            )}
                          </p>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "13px",
                              padding: "3px 10px",
                              borderRadius: "100px",
                              background: "rgba(34,197,94,0.1)",
                              border: "1px solid rgba(34,197,94,0.2)",
                              color: "#22c55e",
                              fontWeight: "700",
                              textTransform: "uppercase",
                            }}
                          >
                            Active
                          </span>
                          
                          {/* Show Collect Balance button only when balance exists */}
                          {(() => {
                            const payment = memberDetail.paymentHistory?.find(
                              (p) =>
                                p.subscriptionId?.toString() ===
                                memberDetail.activeSubscription._id?.toString(),
                            );
                            const hasBalance =
                              payment && payment.status === "partial";
                            return hasBalance ? (
                              <Tip text="Record money this member still owes on their plan. It goes to the earliest unpaid installments and a receipt is emailed to them."><button
                                onClick={() =>
                                  setCollectBalanceModal({
                                    subscription:
                                      memberDetail.activeSubscription,
                                    payment,
                                  })
                                }
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: "8px",
                                  border: "1px solid rgba(243,212,0,0.2)",
                                  background: "rgba(243,212,0,0.08)",
                                  color: "#f3d400",
                                  fontSize: "14px",
                                  cursor: "pointer",
                                }}
                              >
                                Collect Balance
                              </button></Tip>
                            ) : null;
                          })()}
                          
                          <Tip text="Ends this membership now and drops any unpaid installments. Money already paid is not refunded by this button."><button
                            onClick={() => setCancelDialog(true)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "8px",
                              border: "1px solid rgba(239,68,68,0.2)",
                              background: "transparent",
                              color: "#ef4444",
                              fontSize: "14px",
                              cursor: "pointer",
                            }}
                          >
                            Cancel membership
                          </button></Tip>
                        </div>
                      </div>

                      {/* Payment summary */}
                      {(() => {
                        const payment = memberDetail.paymentHistory?.find(
                          (p) =>
                            p.subscriptionId?.toString() ===
                            memberDetail.activeSubscription._id?.toString(),
                        );
                        const subInstallments = (
                          memberDetail.installments || []
                        ).filter(
                          (i) =>
                            i.subscriptionId?.toString() ===
                            memberDetail.activeSubscription._id?.toString(),
                        );
                        const isPartial = payment?.status === "partial";

                        return (
                          <>
                            <div
                              style={{
                                display: "flex",
                                gap: "24px",
                                flexWrap: "wrap",
                                marginBottom:
                                  subInstallments.length > 0 ? "16px" : "0",
                              }}
                            >
                              <div>
                                <p
                                  style={{
                                    fontSize: "13px",
                                    color: "rgba(255,255,255,0.6)",
                                  }}
                                >
                                  AMOUNT PAID
                                </p>
                                <p
                                  style={{
                                    fontSize: "16px",
                                    fontWeight: "700",
                                    color: "#f3d400",
                                  }}
                                >
                                  {payment?.paymentMode === "complimentary"
                                    ? "Complimentary"
                                    : payment
                                      ? `₹${(payment.amountPaid / 100).toLocaleString("en-IN")}`
                                      : "—"}
                                </p>
                              </div>
                              {isPartial && payment && (
                                <div>
                                  <p
                                    style={{
                                      fontSize: "13px",
                                      color: "rgba(255,255,255,0.6)",
                                    }}
                                  >
                                    BALANCE DUE
                                  </p>
                                  <p
                                    style={{
                                      fontSize: "16px",
                                      fontWeight: "700",
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
                                <p
                                  style={{
                                    fontSize: "13px",
                                    color: "rgba(255,255,255,0.6)",
                                  }}
                                >
                                  PAYMENT MODE
                                </p>
                                <p
                                  style={{
                                    fontSize: "16px",
                                    fontWeight: "700",
                                    textTransform: "capitalize",
                                  }}
                                >
                                  {memberDetail.activeSubscription.paymentMode}
                                </p>
                              </div>
                            </div>

                            {/* Installments */}
                            {subInstallments.length > 0 && (
                              <div
                                style={{
                                  borderTop: "1px solid #26262a",
                                  paddingTop: "14px",
                                }}
                              >
                                <p
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: "700",
                                    color: "rgba(255,255,255,0.6)",
                                    letterSpacing: "1px",
                                    textTransform: "uppercase",
                                    marginBottom: "10px",
                                  }}
                                >
                                  Installment Schedule
                                </p>
                                {subInstallments.map((inst) => {
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
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "10px 0",
                                        borderBottom:
                                          "1px solid rgba(255,255,255,0.04)",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "flex-start",
                                          gap: "10px",
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontSize: "16px",
                                            color,
                                            marginTop: "1px",
                                          }}
                                        >
                                          {isPaid ? "✓" : isOverdue ? "!" : "○"}
                                        </span>
                                        <div>
                                          <p
                                            style={{
                                              fontSize: "15px",
                                              fontWeight: "600",
                                            }}
                                          >
                                            Installment {inst.installmentNumber}
                                          </p>
                                          <p
                                            style={{
                                              fontSize: "14px",
                                              color: "rgba(255,255,255,0.6)",
                                              marginTop: "2px",
                                            }}
                                          >
                                            Due: {formatDate(inst.dueDate)}
                                          </p>
                                          {isPaid && (
                                            <p
                                              style={{
                                                fontSize: "14px",
                                                color: "rgba(34,197,94,0.7)",
                                                marginTop: "2px",
                                              }}
                                            >
                                              Paid:{" "}
                                              {inst.paidAt
                                                ? formatDate(inst.paidAt)
                                                : "—"}
                                              {inst.paymentMode &&
                                                ` · ${inst.paymentMode.charAt(0).toUpperCase() + inst.paymentMode.slice(1)}`}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "10px",
                                        }}
                                      >
                                        <div style={{ textAlign: "right" }}>
                                          <p
                                            style={{
                                              fontSize: "15px",
                                              fontWeight: "600",
                                            }}
                                          >
                                            ₹
                                            {(
                                              inst.amountDue / 100
                                            ).toLocaleString("en-IN")}
                                          </p>
                                          {!isPaid && inst.amountPaid > 0 && (
                                            <p style={{ fontSize: "13px", color: "#22c55e", margin: "2px 0" }}>
                                              ₹{(inst.amountPaid / 100).toLocaleString("en-IN")} paid
                                            </p>
                                          )}
                                          <span
                                            style={{
                                              fontSize: "13px",
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
                                        {!isPaid && (
                                          <Tip text="Record that this installment was paid at the desk. You enter the amount (part payment is fine) and a receipt is emailed to the member."><button
                                            onClick={() =>
                                              setMarkingInstallment(inst)
                                            }
                                            style={{
                                              padding: "5px 10px",
                                              borderRadius: "6px",
                                              border:
                                                "1px solid rgba(243,212,0,0.2)",
                                              background:
                                                "rgba(243,212,0,0.08)",
                                              color: "#f3d400",
                                              fontSize: "13px",
                                              cursor: "pointer",
                                              whiteSpace: "nowrap",
                                            }}
                                          >
                                            Mark Paid
                                          </button></Tip>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "20px",
                        borderRadius: "14px",
                        background: "var(--iron-850)",
                        border: "1px dashed rgba(255,255,255,0.1)",
                        textAlign: "center",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "15px",
                          color: "rgba(255,255,255,0.6)",
                        }}
                      >
                        No active membership
                      </p>
                      <button
                        onClick={() => setShowPaymentForm(true)}
                        style={{
                          marginTop: "12px",
                          padding: "8px 18px",
                          borderRadius: "8px",
                          border: "1px solid rgba(243,212,0,0.2)",
                          background: "rgba(243,212,0,0.08)",
                          color: "#f3d400",
                          fontSize: "15px",
                          cursor: "pointer",
                        }}
                      >
                        + Assign Plan
                      </button>
                    </div>
                  )}
                </div>

                {/* Cancellation info */}
                {memberDetail.subscriptionHistory?.find(
                  (s) => s.status === "cancelled" && s.cancelReason,
                ) &&
                  (() => {
                    const cancelled = memberDetail.subscriptionHistory.find(
                      (s) => s.status === "cancelled",
                    );
                    return cancelled?.cancelReason ? (
                      <div
                        style={{
                          padding: "14px 16px",
                          borderRadius: "12px",
                          marginBottom: "20px",
                          background: "rgba(239,68,68,0.05)",
                          border: "1px solid rgba(239,68,68,0.15)",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "14px",
                            fontWeight: "700",
                            color: "rgba(255,255,255,0.62)",
                            letterSpacing: "1px",
                            textTransform: "uppercase",
                            marginBottom: "6px",
                          }}
                        >
                          Last Cancellation Reason
                        </p>
                        <p
                          style={{
                            fontSize: "15px",
                            color: "rgba(255,255,255,0.6)",
                          }}
                        >
                          {cancelled.cancelReason}
                        </p>
                        {cancelled.cancelledAt && (
                          <p
                            style={{
                              fontSize: "14px",
                              color: "rgba(255,255,255,0.55)",
                              marginTop: "4px",
                            }}
                          >
                            {formatDate(cancelled.cancelledAt)}
                          </p>
                        )}
                      </div>
                    ) : null;
                  })()}

                {/* Receipts — one per payment received */}
                {memberDetail.receipts?.length > 0 && (
                  <div style={{ marginBottom: "24px" }}>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: "700",
                        color: "rgba(255,255,255,0.62)",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        marginBottom: "12px",
                      }}
                    >
                      Payments &amp; Receipts
                    </p>
                    <ReceiptsList receipts={memberDetail.receipts} />
                  </div>
                )}

                {/* Subscription History */}
                {memberDetail.subscriptionHistory?.length > 0 && (
                  <div>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: "700",
                        color: "rgba(255,255,255,0.62)",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        marginBottom: "12px",
                      }}
                    >
                      Subscription History
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      {memberDetail.subscriptionHistory.map((sub) => (
                        <div
                          key={sub._id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "14px 16px",
                            borderRadius: "10px",
                            background: "var(--iron-850)",
                            border: "1px solid #26262a",
                          }}
                        >
                          <div>
                            <p style={{ fontSize: "16px", fontWeight: "600" }}>
                              {sub.planSnapshot.planName} —{" "}
                              {sub.planSnapshot.durationLabel}
                            </p>
                            <p
                              style={{
                                fontSize: "14px",
                                color: "rgba(255,255,255,0.6)",
                                marginTop: "2px",
                              }}
                            >
                              {formatDate(sub.startDate)} →{" "}
                              {formatDate(sub.endDate)}
                            </p>
                            {sub.cancelReason && (
                              <p
                                style={{
                                  fontSize: "14px",
                                  color: "rgba(239,68,68,0.7)",
                                  marginTop: "2px",
                                }}
                              >
                                ↳ {sub.cancelReason}
                              </p>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: "13px",
                              padding: "3px 10px",
                              borderRadius: "100px",
                              border: `1px solid ${statusColor(sub.status)}33`,
                              color: statusColor(sub.status),
                              fontWeight: "700",
                              textTransform: "uppercase",
                              flexShrink: 0,
                            }}
                          >
                            {sub.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
