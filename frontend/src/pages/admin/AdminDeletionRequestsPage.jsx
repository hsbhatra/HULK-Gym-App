// =============================================================================
// src/pages/admin/AdminDeletionRequestsPage.jsx
// =============================================================================
// Members ask to delete their account; the admin decides here.
//   Approve → erases name, contact details, photo and ID, signs the member out
//             everywhere, emails them. Payment records stay.
//   Reject  → account unchanged; the member is emailed the reason you write.
// =============================================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { RefreshCw, TriangleAlert, UserX } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout.jsx";
import ConfirmDialog from "../../components/ui/ConfirmDialog.jsx";
import api from "../../services/api.js";
import { Tip } from "../../components/ui/Tip.jsx";

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const daysWaiting = (date) => Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));

const nameOf = (r) =>
  [r.userId?.firstName, r.userId?.lastName].filter(Boolean).join(" ") || r.memberName || "Deleted member";

const STATUS_LABEL = { approved: "Approved", rejected: "Rejected", cancelled: "Cancelled by member" };

// Tells the sidebar badge the latest pending count
const notifyChanged = (pending) =>
  window.dispatchEvent(new CustomEvent("hg:deletions-changed", { detail: { pending } }));

export default function AdminDeletionRequestsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState({ pending: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [approving, setApproving] = useState(null); // request waiting for confirmation
  const [rejecting, setRejecting] = useState(null); // request being rejected
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get("/admin/deletion-requests");
      setData(res.data.data);
      notifyChanged(res.data.data?.pending?.length || 0);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (r) => {
    setApproving(null);
    setBusyId(r._id);
    try {
      const res = await api.post(`/admin/deletion-requests/${r._id}/approve`);
      toast.success(res.data?.message || "Approved.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't approve. Please try again.");
    } finally {
      setBusyId(null);
      load();
    }
  };

  const reject = async (e) => {
    e.preventDefault();
    const r = rejecting;
    if (note.trim().length < 3) return toast.error("Please write a short reason for the member.");
    setBusyId(r._id);
    try {
      const res = await api.post(`/admin/deletion-requests/${r._id}/reject`, { note: note.trim() });
      toast.success(res.data?.message || "Rejected.");
      setRejecting(null);
      setNote("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't reject. Please try again.");
    } finally {
      setBusyId(null);
      load();
    }
  };

  const { pending, history } = data;

  return (
    <AdminLayout>
      {approving && (
        <ConfirmDialog
          message={`Delete ${nameOf(approving)}'s account? Their name, contact details, photo and ID details are erased for good, they are signed out everywhere, and they get an email. Payment receipts stay, without their personal details. This can't be undone.`}
          confirmLabel="Yes, delete account"
          cancelLabel="Not now"
          onConfirm={() => approve(approving)}
          onCancel={() => setApproving(null)}
        />
      )}

      {rejecting && (
        <div className="modal-backdrop" role="presentation" onClick={() => !busyId && setRejecting(null)}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-title"
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            onSubmit={reject}
          >
            <TriangleAlert size={32} color="var(--yellow)" aria-hidden="true" />
            <h3 id="reject-title" className="danger-title" style={{ marginTop: "12px" }}>
              Reject {nameOf(rejecting)}'s request?
            </h3>
            <p className="danger-copy">
              Their account stays as it is. They will be emailed the reason below, so keep it short and clear.
            </p>
            <label htmlFor="reject-note" className="danger-label">Reason for the member</label>
            <textarea
              id="reject-note"
              className="input-dark"
              rows={3}
              maxLength={300}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              autoFocus
              style={{ resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: "10px", marginTop: "20px", flexWrap: "wrap" }}>
              <button type="button" className="btn-ghost" disabled={!!busyId} onClick={() => { setRejecting(null); setNote(""); }} style={{ flex: "1 1 120px" }}>
                Go back
              </button>
              <button type="submit" className="btn-gold" disabled={!!busyId} style={{ flex: "1 1 160px", width: "auto" }}>
                {busyId ? "Sending…" : "Reject and email"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="refunds-head">
        <div>
          <h1 className="page-title">Deletion requests</h1>
          <p className="refunds-sub">
            Members who asked to delete their account. Please decide within 7 days — that is what the Privacy Policy promises.
          </p>
        </div>
        <button type="button" onClick={load} className="btn-ghost btn-sm" disabled={loading}>
          <RefreshCw size={15} aria-hidden="true" /> Refresh
        </button>
      </div>

      {error && !loading && (
        <div className="refund-empty">
          Couldn’t load requests.{" "}
          <button type="button" className="consent-link" onClick={load} style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}>
            Try again
          </button>
        </div>
      )}

      {/* ── Waiting ── */}
      <section aria-labelledby="del-pending-h" style={{ marginBottom: "40px" }}>
        <h2 id="del-pending-h" className="refunds-h2">
          Waiting for you {pending.length > 0 && <span className="refund-count">{pending.length}</span>}
        </h2>

        {loading && pending.length === 0 ? (
          <div className="refund-empty">Loading…</div>
        ) : pending.length === 0 ? (
          <div className="refund-empty">No deletion requests waiting. Nothing to do here.</div>
        ) : (
          <div className="refund-list">
            {pending.map((r) => {
              const blocked = r.blockers?.length > 0;
              const waited = daysWaiting(r.createdAt);
              return (
                <article key={r._id} className="refund-row refund-row--due">
                  <div className="refund-main">
                    <button
                      type="button"
                      className="refund-name"
                      onClick={() => r.userId?._id && navigate(`/admin/members/${r.userId._id}`)}
                      disabled={!r.userId?._id}
                    >
                      {nameOf(r)}
                    </button>
                    <p className="refund-meta">
                      {r.memberCode ? `${r.memberCode} · ` : ""}Asked on {formatDate(r.createdAt)}
                      {waited >= 1 ? ` · waiting ${waited} day${waited === 1 ? "" : "s"}` : " · today"}
                    </p>
                    {r.reason && <p className="refund-meta">Their reason: “{r.reason}”</p>}
                    {blocked && (
                      <p className="refund-meta" style={{ color: "var(--ember)", fontWeight: 600 }}>
                        Can't approve yet: {r.blockers.join(" ")}
                      </p>
                    )}
                  </div>
                  <div className="refund-side" style={{ gap: "10px", flexWrap: "wrap" }}>
                    <Tip text="Keeps the account as it is and emails the member the reason you write.">
                      <button type="button" className="btn-ghost btn-sm" disabled={busyId === r._id} onClick={() => { setNote(""); setRejecting(r); }}>
                        Reject
                      </button>
                    </Tip>
                    <Tip text={blocked ? "Sort out the problem shown in red first, or reject the request." : "Permanently erases this member's name, contact details, photo and ID, signs them out everywhere and emails them. Payment records stay."}>
                      <button type="button" className="btn-danger" disabled={blocked || busyId === r._id} onClick={() => setApproving(r)}>
                        <UserX size={16} aria-hidden="true" />
                        {busyId === r._id ? "Working…" : "Approve deletion"}
                      </button>
                    </Tip>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ── History ── */}
      <section aria-labelledby="del-history-h">
        <h2 id="del-history-h" className="refunds-h2">History</h2>
        {history.length === 0 ? (
          <div className="refund-empty">{loading ? "Loading…" : "No decisions yet."}</div>
        ) : (
          <div className="refund-list">
            {history.map((r) => (
              <article key={r._id} className="refund-row">
                <div className="refund-main">
                  <span className="refund-name refund-name--static">
                    {r.status === "approved" ? "Deleted member" : r.memberName || "Member"}
                    {r.memberCode ? ` · ${r.memberCode}` : ""}
                  </span>
                  <p className="refund-meta">
                    {STATUS_LABEL[r.status] || r.status} {formatDate(r.decidedAt || r.updatedAt)}
                    {r.decidedByName ? ` by ${r.decidedByName}` : ""}
                  </p>
                  {r.status === "rejected" && r.decisionNote && (
                    <p className="refund-meta">Reason sent: “{r.decisionNote}”</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
