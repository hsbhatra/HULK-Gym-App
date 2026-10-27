// =============================================================================
// src/components/ui/formStyles.js
// =============================================================================
// Shared look of form fields. Use as-is, or spread and override one thing:
//   style={{ ...inputStyle, padding: "10px 14px" }}
// =============================================================================

export const inputStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  padding: "11px 14px",
  color: "#fff",
  fontSize: "16px",
  outline: "none",
};

export const labelStyle = {
  fontSize: "14px",
  fontWeight: "600",
  color: "rgba(255,255,255,0.62)",
  letterSpacing: "0.5px",
  textTransform: "uppercase",
  display: "block",
  marginBottom: "8px",
};

// Same label with less space below (compact forms)
export const labelStyleTight = { ...labelStyle, marginBottom: "6px" };
