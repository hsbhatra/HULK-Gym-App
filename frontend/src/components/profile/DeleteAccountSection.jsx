// =============================================================================
// src/components/profile/DeleteAccountSection.jsx
// =============================================================================
// "Danger zone" — the member ASKS to delete their account (DPDP right to
// erasure). Nothing is erased until the gym admin approves; the member keeps
// using the app meanwhile and is emailed the decision. Payment/receipt records
// are kept by the server as the law requires.
// =============================================================================

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Clock, TriangleAlert } from "lucide-react";
import {
  getDeletionRequest,
  requestAccountDeletion,
  cancelDeletionRequest,
} from "../../services/profileService.js";

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function DeleteAccountSection() {
  const [request, setRequest] = useState(null); // pending, or a recent rejection
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    getDeletionRequest()
      .then((res) => alive && setRequest(res.data.data.request))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setPassword("");
    setReason("");
    setError("");
  };

  const sendRequest = async (e) => {
    e.preventDefault();
    if (!password) {
      setError("Please enter your password to confirm.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await requestAccountDeletion({ password, reason: reason.trim() });
      setRequest(res.data.data.request);
      toast.success("Request sent. The gym will review it and email you.");
      setOpen(false);
      setPassword("");
      setReason("");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send your request. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const cancelRequest = async () => {
    setCancelling(true);
    try {
      await cancelDeletionRequest();
      setRequest(null);
      toast.success("Your deletion request has been cancelled.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't cancel the request. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const pending = request?.status === "pending";
  const declined = request?.status === "rejected";

  return (
    <section aria-labelledby="danger-title" className="danger-zone">
      <h3 id="danger-title" className="danger-title">
        {pending ? "Deletion requested" : "Delete account"}
      </h3>

      {pending ? (
        <>
          <p className="danger-copy" style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <Clock size={20} aria-hidden="true" style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>
              You asked to delete your account on {formatDate(request.requestedAt)}. The gym reviews
              requests, usually within 7 days, and will email you the decision. Until then your account
              works as normal.
            </span>
          </p>
          <button type="button" className="btn-ghost" onClick={cancelRequest} disabled={cancelling}>
            {cancelling ? "Cancelling…" : "Cancel my request"}
          </button>
        </>
      ) : (
        <>
          {declined && (
            <p role="status" className="danger-copy" style={{ color: "var(--text-1)" }}>
              Your last request ({formatDate(request.decidedAt)}) was declined: “{request.decisionNote}”
            </p>
          )}
          <p className="danger-copy">
            You can ask the gym to permanently remove your name, email, phone, photo, government ID
            details and profile details. The gym reviews every request — usually within 7 days — and
            emails you the decision. Once approved you are logged out everywhere. Your payment
            receipts are kept for the gym's tax records, without your personal details.
          </p>
          <button type="button" className="btn-danger" onClick={() => setOpen(true)}>
            Request account deletion
          </button>
        </>
      )}

      {open && (
        <div className="modal-backdrop" role="presentation" onClick={close}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            onSubmit={sendRequest}
          >
            <TriangleAlert size={36} color="var(--ember)" aria-hidden="true" />
            <h3 id="delete-dialog-title" className="danger-title" style={{ marginTop: "12px" }}>
              Request account deletion?
            </h3>
            <p className="danger-copy">
              Nothing is deleted yet. The gym will review your request and email you. If you have an
              active membership or unpaid installments, please sort them out with the gym first.
            </p>
            <label htmlFor="delete-reason" className="danger-label">
              Reason (optional)
            </label>
            <textarea
              id="delete-reason"
              className="input-dark"
              rows={2}
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ resize: "vertical", marginBottom: "14px" }}
            />
            <label htmlFor="delete-password" className="danger-label">
              Enter your password to confirm
            </label>
            <input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              className="input-dark"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {error && (
              <p role="alert" style={{ color: "#ef4444", fontSize: "15px", marginTop: "8px" }}>
                {error}
              </p>
            )}
            <div style={{ display: "flex", gap: "10px", marginTop: "20px", flexWrap: "wrap" }}>
              <button type="button" className="btn-ghost" onClick={close} disabled={busy} style={{ flex: "1 1 120px" }}>
                Keep my account
              </button>
              <button type="submit" className="btn-danger" disabled={busy} style={{ flex: "1 1 160px" }}>
                {busy ? "Sending…" : "Send request"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
