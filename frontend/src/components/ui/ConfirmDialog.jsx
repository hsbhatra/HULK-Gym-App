// =============================================================================
// src/components/ui/ConfirmDialog.jsx
// =============================================================================

import { TriangleAlert } from "lucide-react";
import Modal from "./Modal.jsx";

export default function ConfirmDialog({
  message,
  confirmLabel = "Yes, proceed",
  cancelLabel = "No, cancel",
  danger = true, // true → red confirm button, false → gold
  onConfirm,
  onCancel,
}) {
  return (
    <Modal label="Please confirm" zIndex={400} maxWidth="400px" padding="clamp(20px, 6vw, 36px)" panelStyle={{ textAlign: "center" }}>
        {/* Icon */}
        <div style={{ marginBottom: "16px" }}><TriangleAlert size={40} color="var(--yellow)" aria-hidden="true" /></div>

        {/* Title */}
        <h3
          style={{
            fontSize: "19px",
            fontWeight: "700",
            marginBottom: "12px",
          }}
        >
          Are you sure?
        </h3>

        {/* Message */}
        <p
          style={{
            fontSize: "16px",
            color: "rgba(255,255,255,0.5)",
            marginBottom: "28px",
            lineHeight: "1.6",
          }}
        >
          {message}
        </p>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={onCancel}
            className="btn-ghost"
            style={{ flex: 1, padding: "12px" }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "10px",
              border: "none",
              background: danger ? "#ef4444" : "#f3d400",
              color: danger ? "#ffffff" : "#0a0a0a",
              fontWeight: "600",
              fontSize: "16px",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = danger ? "#dc2626" : "#ffe45c";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = danger ? "#ef4444" : "#f3d400";
            }}
          >
            {confirmLabel}
          </button>
        </div>
    </Modal>
  );
}
