// =============================================================================
// src/components/ui/ReceiptsList.jsx
// =============================================================================
// One row per payment received (online, offline, installment, balance).
// Used on the member's Membership tab and the admin's member detail.
// =============================================================================

const inr = (paise) => `₹${(paise / 100).toLocaleString("en-IN")}`;
const when = (d) =>
  new Date(d).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });

const MODE = {
  razorpay: "Online", card: "Card", upi: "UPI", netbanking: "Net Banking",
  wallet: "Wallet", cash: "Cash", emi: "EMI",
};
const TYPE = {
  online: "Online payment",
  offline: "Paid at gym",
  installment: "Installment",
  balance: "Balance payment",
};

export default function ReceiptsList({ receipts = [], emptyText = "No payments yet." }) {
  if (!receipts.length) {
    return <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)" }}>{emptyText}</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {receipts.map((r) => (
        <div
          key={r._id}
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            gap: "12px", flexWrap: "wrap",
            padding: "12px 14px", borderRadius: "10px",
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: "13px", fontWeight: 700, margin: 0 }}>
              {r.receiptNumber}
              <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.4)", marginLeft: "8px" }}>
                {r.planName} — {r.durationLabel}
              </span>
            </p>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", margin: "4px 0 0" }}>
              {when(r.paidAt)} · {TYPE[r.type] || r.type} · {MODE[r.paymentMode] || r.paymentMode}
              {r.note ? ` · ${r.note}` : ""}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "15px", fontWeight: 800, color: "#e8c44a", margin: 0 }}>{inr(r.amount)}</p>
            <p style={{ fontSize: "11px", margin: "4px 0 0", color: r.balanceAfter > 0 ? "#f97316" : "#22c55e" }}>
              {r.balanceAfter > 0 ? `Balance ${inr(r.balanceAfter)}` : "Fully paid"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
