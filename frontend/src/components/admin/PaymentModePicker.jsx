// =============================================================================
// src/components/admin/PaymentModePicker.jsx
// =============================================================================
// Cash / UPI / Card chooser used by every desk-payment form.
// =============================================================================

export const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
];

export const paymentModeLabel = (value) => PAYMENT_MODES.find((m) => m.value === value)?.label || value;

export default function PaymentModePicker({ value, onChange, disabled = false }) {
  return (
    <div role="radiogroup" aria-label="Payment mode" style={{ display: "flex", gap: "8px" }}>
      {PAYMENT_MODES.map((mode) => {
        const active = value === mode.value;
        return (
          <button
            key={mode.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(mode.value)}
            style={{
              flex: 1,
              minHeight: "44px",
              padding: "9px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "600",
              border: active ? "1px solid rgba(243,212,0,0.4)" : "1px solid rgba(255,255,255,0.1)",
              background: active ? "rgba(243,212,0,0.1)" : "transparent",
              color: active ? "#f3d400" : "rgba(255,255,255,0.5)",
            }}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
