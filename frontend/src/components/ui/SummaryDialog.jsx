// =============================================================================
// src/components/ui/SummaryDialog.jsx
// =============================================================================
// "Check before saving" box shown before ANY payment or membership is recorded
// at the desk. Lists what will be saved; the admin confirms or goes back.
//
//   <AnimatePresence>
//     {show && (
//       <SummaryDialog
//         subtitle="Logic Mantraa · Basic · Monthly"
//         rows={[["Plan price", "₹999"], ["Received today (cash)", "₹500"]]}
//         note={{ tone: "warn", text: "₹499 stays pending." }}
//         saving={saving}
//         onBack={() => setShow(false)}
//         onConfirm={save}
//       />
//     )}
//   </AnimatePresence>
//
// `children` goes between the rows and the note (e.g. an installment list).
// =============================================================================

import Modal from "./Modal.jsx";

const NOTE_COLORS = { ok: "#22c55e", warn: "#f97316" };

export default function SummaryDialog({
  title = "Check before saving",
  subtitle,
  rows = [],
  children,
  note,
  confirmLabel = "Confirm & activate",
  savingLabel = "Recording...",
  saving = false,
  onBack,
  onConfirm,
}) {
  return (
    <Modal label={title} zIndex={400} maxWidth="480px" backdrop="rgba(0,0,0,0.8)" padding="clamp(18px, 5vw, 28px)">
      <h3 style={{ fontSize: "19px", fontWeight: 700, marginBottom: "4px" }}>{title}</h3>
      {subtitle && (
        <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.62)", marginBottom: "16px" }}>{subtitle}</p>
      )}

      {rows.map(([label, value]) => (
        <div
          key={label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            fontSize: "15px",
            padding: "6px 0",
            borderBottom: "1px solid #26262a",
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.62)" }}>{label}</span>
          <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
        </div>
      ))}

      {children}

      {note && (
        <p style={{ fontSize: "14px", color: NOTE_COLORS[note.tone] || NOTE_COLORS.ok, margin: "14px 0 16px", lineHeight: 1.45 }}>
          {note.text}
        </p>
      )}

      <div style={{ display: "flex", gap: "12px", marginTop: note ? 0 : "16px", flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn-ghost"
          onClick={onBack}
          disabled={saving}
          style={{ flex: "1 1 150px", padding: "12px", minHeight: "44px" }}
        >
          Go back
        </button>
        <button
          type="button"
          className="btn-gold"
          onClick={onConfirm}
          disabled={saving}
          style={{ flex: "1 1 150px", minHeight: "44px" }}
        >
          {saving ? savingLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
