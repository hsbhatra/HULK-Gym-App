// =============================================================================
// src/components/ui/PasswordStrength.jsx
// =============================================================================

export default function PasswordStrength({ password }) {
  if (!password) return null;

  const checks = [
    { label: "8+ characters",     pass: password.length >= 8 },
    { label: "Uppercase letter",  pass: /[A-Z]/.test(password) },
    { label: "Number",            pass: /\d/.test(password) },
    { label: "Special character", pass: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];

  const score  = checks.filter((c) => c.pass).length;
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e"];

  return (
    <div style={{ marginTop: "10px" }}>

      {/* Strength bar */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{
            flex        : 1,
            height      : "3px",
            borderRadius: "2px",
            background  : i < score ? colors[score - 1] : "rgba(255,255,255,0.08)",
            transition  : "background 0.3s",
          }} />
        ))}
      </div>

      {/* Check badges */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {checks.map((c) => (
          <span key={c.label} style={{
            fontSize  : "13px",
            padding   : "2px 8px",
            borderRadius: "100px",
            background: c.pass ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)",
            color     : c.pass ? "#22c55e" : "#8c8c86",
            border    : `1px solid ${c.pass ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)"}`,
            transition: "all 0.3s",
          }}>
            {c.pass ? "✓" : "·"} {c.label}
          </span>
        ))}
      </div>

    </div>
  );
}
