// =============================================================================
// src/components/admin/CollectBalanceForm.jsx
// =============================================================================
// Form for collecting (part of) the unpaid balance of a membership at the desk.
// A summary is shown before anything is saved. The server re-checks everything.
// =============================================================================

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api from "../../services/api.js";
import SummaryDialog from "../ui/SummaryDialog.jsx";
import { inputStyle, labelStyleTight } from "../ui/formStyles.js";
import PaymentModePicker, { paymentModeLabel } from "./PaymentModePicker.jsx";
import { inr } from "../../utils/format.js";
import { isMoneyInput, toPaise } from "../../utils/installmentPlan.js";

export default function CollectBalanceForm({ subscription, payment, onSuccess, onCancel }) {
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [saving, setSaving] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const maxPaise = payment.amountDue - payment.amountPaid;
  const amountPaise = toPaise(amount);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isMoneyInput(amount)) return toast.error("Enter the amount in rupees (up to 2 decimals).");
    if (amountPaise <= 0) return toast.error("Amount must be above ₹0.");
    if (amountPaise > maxPaise) return toast.error(`Amount exceeds the balance of ${inr(maxPaise)}.`);
    setShowSummary(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.post(`/admin/subscriptions/${subscription._id}/collect`, {
        amountPaid: Number(amount),
        paymentMode,
      });
      const rn = res.data.data?.receipt?.receiptNumber;
      toast.success(`Payment recorded.${rn ? ` Receipt ${rn} emailed.` : ""}`);
      onSuccess();
    } catch (err) {
      setShowSummary(false);
      toast.error(err.response?.data?.message || "Failed to record payment.");
    } finally {
      setSaving(false);
    }
  };

  const field = { ...inputStyle, padding: "10px 14px" };
  const remainingAfter = maxPaise - amountPaise;

  return (
    <>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label style={labelStyleTight}>Amount (₹) — max {inr(maxPaise)}</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            style={field}
            placeholder={`Up to ${inr(maxPaise)}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            max={maxPaise / 100}
          />
        </div>
        <div>
          <label style={labelStyleTight}>Payment Mode</label>
          <PaymentModePicker value={paymentMode} onChange={setPaymentMode} />
        </div>
        <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
          <button type="button" onClick={onCancel} className="btn-ghost" style={{ flex: 1, padding: "11px" }}>
            Cancel
          </button>
          <button type="submit" className="btn-gold" disabled={saving} style={{ flex: 1 }}>
            Review & record
          </button>
        </div>
      </form>

      <AnimatePresence>
        {showSummary && (
          <SummaryDialog
            subtitle="Collecting the unpaid balance"
            rows={[
              ["Membership total", inr(payment.amountDue)],
              ["Paid so far", inr(payment.amountPaid)],
              [`Receiving now (${paymentModeLabel(paymentMode)})`, inr(amountPaise)],
              ["Still to pay after this", inr(remainingAfter)],
            ]}
            note={
              remainingAfter === 0
                ? { tone: "ok", text: "This clears the balance. A receipt is emailed to the member." }
                : { tone: "warn", text: `${inr(remainingAfter)} will still be pending. A receipt is emailed to the member.` }
            }
            confirmLabel="Confirm payment"
            saving={saving}
            onBack={() => setShowSummary(false)}
            onConfirm={save}
          />
        )}
      </AnimatePresence>
    </>
  );
}
