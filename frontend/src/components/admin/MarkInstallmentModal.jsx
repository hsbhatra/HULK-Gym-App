// =============================================================================
// src/components/admin/MarkInstallmentModal.jsx
// =============================================================================
// Pop-up for recording that an installment (or what is left of it) was paid at
// the desk. A summary is shown before anything is saved.
// =============================================================================

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api from "../../services/api.js";
import Modal from "../ui/Modal.jsx";
import SummaryDialog from "../ui/SummaryDialog.jsx";
import PaymentModePicker, { paymentModeLabel } from "./PaymentModePicker.jsx";
import { inr, formatDate } from "../../utils/format.js";

export default function MarkInstallmentModal({ installment, onClose, onSaved }) {
  const [paymentMode, setPaymentMode] = useState("cash");
  const [saving, setSaving] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  // Pay only what's left — the backend adds to any earlier partial payment
  const paidBefore = installment.amountPaid || 0;
  const remainingPaise = installment.amountDue - paidBefore;

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
      setShowSummary(false);
      toast.error(err.response?.data?.message || "Failed to mark installment as paid.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal label="Mark installment paid" zIndex={300} maxWidth="400px" backdrop="rgba(0,0,0,0.8)">
        <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "6px" }}>Mark Installment Paid</h3>
        <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.62)", marginBottom: "24px" }}>
          Installment {installment.installmentNumber} — {inr(remainingPaise)}
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
        <div style={{ marginBottom: "24px" }}>
          <PaymentModePicker value={paymentMode} onChange={setPaymentMode} />
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={onClose} className="btn-ghost" style={{ flex: 1, padding: "12px" }}>
            Cancel
          </button>
          <button onClick={() => setShowSummary(true)} disabled={saving || remainingPaise <= 0} className="btn-gold" style={{ flex: 1 }}>
            Review & confirm
          </button>
        </div>
      </Modal>

      <AnimatePresence>
        {showSummary && (
          <SummaryDialog
            subtitle={`Installment ${installment.installmentNumber}${installment.dueDate ? ` · due ${formatDate(installment.dueDate)}` : ""}`}
            rows={[
              ["Installment amount", inr(installment.amountDue)],
              ...(paidBefore > 0 ? [["Paid earlier", inr(paidBefore)]] : []),
              [`Receiving now (${paymentModeLabel(paymentMode)})`, inr(remainingPaise)],
            ]}
            note={{ tone: "ok", text: "This installment will be marked fully paid and a receipt is emailed to the member." }}
            confirmLabel="Confirm payment"
            saving={saving}
            onBack={() => setShowSummary(false)}
            onConfirm={handleSubmit}
          />
        )}
      </AnimatePresence>
    </>
  );
}
