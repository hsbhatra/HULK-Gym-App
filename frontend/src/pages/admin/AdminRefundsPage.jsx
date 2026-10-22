// =============================================================================
// src/pages/admin/AdminRefundsPage.jsx
// =============================================================================
// Duplicate online payments (member paid while already holding a plan).
// "Pending" can be refunded in one click through Razorpay; "History" keeps a
// record of every refund sent from the app.
// =============================================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ExternalLink, RefreshCw, RotateCcw } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout.jsx";
import ConfirmDialog from "../../components/ui/ConfirmDialog.jsx";
import api from "../../services/api.js";

const formatCurrency = (paise) => `₹${((paise || 0) / 100).toLocaleString("en-IN")}`;
const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";

const razorpayLink = (paymentId) => `https://dashboard.razorpay.com/app/payments/${paymentId}`;

const memberName = (p) =>
  [p.userId?.firstName, p.userId?.lastName].filter(Boolean).join(" ") || "Deleted member";

// Tells the sidebar badge the latest pending count
const notifyRefundsChanged = (pending) =>
  window.dispatchEvent(new CustomEvent("hg:refunds-changed", { detail: { pending } }));

export default function AdminRefundsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState({ due: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [target, setTarget] = useState(null);
  const [refundingId, setRefundingId] = useState(null);

  const fetchRefunds = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get("/admin/refunds");
      setData(res.data.data);
      notifyRefundsChanged(res.data.data?.due?.length || 0);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const issueRefund = async (payment) => {
    setTarget(null);
    setRefundingId(payment._id);
    try {
      const res = await api.post(`/admin/payments/${payment._id}/refund`);
      toast.success(res.data?.message || "Refund initiated.");
      fetchRefunds();
    } catch (err) {
      toast.error(err.response?.data?.message || "Refund failed. Please try again.");
      fetchRefunds();
    } finally {
      setRefundingId(null);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const { due, history } = data;

  return (
    <AdminLayout>
      {target && (
        <ConfirmDialog
          message={`Refund ${formatCurrency(target.amountPaid)} to ${memberName(target)}? The money goes back to their original payment method through Razorpay and they'll get an email. This can't be undone.`}
          confirmLabel="Yes, refund"
          cancelLabel="Not now"
          onConfirm={() => issueRefund(target)}
          onCancel={() => setTarget(null)}
        />
      )}

      <div className="refunds-head">
        <div>
          <h1 className="page-title">Refunds</h1>
          <p className="refunds-sub">
            When a member pays online while they already have an active plan, no extra membership is given and the
            payment shows up here to be refunded.
          </p>
        </div>
        <button type="button" onClick={fetchRefunds} className="btn-ghost btn-sm" disabled={loading}>
          <RefreshCw size={15} aria-hidden="true" /> Refresh
        </button>
      </div>

      {error && !loading && (
        <div className="refund-empty">
          Couldn’t load refunds.{" "}
          <button type="button" className="consent-link" onClick={fetchRefunds} style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}>
            Try again
          </button>
        </div>
      )}

      {/* ── Pending ── */}
      <section aria-labelledby="pending-h" style={{ marginBottom: "40px" }}>
        <h2 id="pending-h" className="refunds-h2">
          Pending {due.length > 0 && <span className="refund-count">{due.length}</span>}
        </h2>

        {loading && due.length === 0 ? (
          <div className="refund-empty">Loading…</div>
        ) : due.length === 0 ? (
          <div className="refund-empty">No refunds pending. Nothing to do here.</div>
        ) : (
          <div className="refund-list">
            {due.map((p) => (
              <article key={p._id} className="refund-row refund-row--due">
                <div className="refund-main">
                  <button
                    type="button"
                    className="refund-name"
                    onClick={() => p.userId?._id && navigate(`/admin/members/${p.userId._id}`)}
                    disabled={!p.userId?._id}
                  >
                    {memberName(p)}
                  </button>
                  <p className="refund-meta">
                    {p.planId?.name ? `${p.planId.name} · ` : ""}Paid {formatDate(p.paidAt)}
                    {p.razorpay?.method ? ` · ${p.razorpay.method.toUpperCase()}` : ""}
                  </p>
                  {p.razorpay?.paymentId && (
                    <a className="refund-rzp" href={razorpayLink(p.razorpay.paymentId)} target="_blank" rel="noopener noreferrer">
                      {p.razorpay.paymentId} <ExternalLink size={13} aria-hidden="true" />
                    </a>
                  )}
                </div>
                <div className="refund-side">
                  <span className="refund-amount">{formatCurrency(p.amountPaid)}</span>
                  <button
                    type="button"
                    className="btn-danger"
                    disabled={refundingId === p._id}
                    onClick={() => setTarget(p)}
                  >
                    <RotateCcw size={16} aria-hidden="true" />
                    {refundingId === p._id ? "Refunding…" : "Refund"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ── History ── */}
      <section aria-labelledby="history-h">
        <h2 id="history-h" className="refunds-h2">History</h2>
        {history.length === 0 ? (
          <div className="refund-empty">{loading ? "Loading…" : "No refunds sent yet."}</div>
        ) : (
          <div className="refund-list">
            {history.map((p) => (
              <article key={p._id} className="refund-row">
                <div className="refund-main">
                  <span className="refund-name refund-name--static">{memberName(p)}</span>
                  <p className="refund-meta">
                    Refunded {formatDate(p.refund?.initiatedAt)}
                    {p.refund?.initiatedBy?.firstName ? ` by ${p.refund.initiatedBy.firstName}` : ""}
                    {p.refund?.status ? ` · ${p.refund.status}` : ""}
                  </p>
                  {p.refund?.refundId && <p className="refund-meta refund-mono">{p.refund.refundId}</p>}
                </div>
                <div className="refund-side">
                  <span className="refund-amount refund-amount--done">{formatCurrency(p.refund?.amount ?? p.amountPaid)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
