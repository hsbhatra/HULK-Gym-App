// =============================================================================
// src/components/profile/DeleteAccountSection.jsx
// =============================================================================
// "Danger zone" — lets a member erase their account (DPDP right to erasure).
// Payment/receipt records are kept by the server as the law requires.
// =============================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { TriangleAlert } from "lucide-react";
import { deleteMyAccount } from "../../services/profileService.js";
import { useAuthStore } from "../../store/authStore.js";

export default function DeleteAccountSection() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    if (busy) return;
    setOpen(false);
    setPassword("");
    setError("");
  };

  const confirmDelete = async (e) => {
    e.preventDefault();
    if (!password) {
      setError("Please enter your password to confirm.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await deleteMyAccount(password);
      logout({ manual: true });
      toast.success("Your account has been deleted.");
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't delete your account. Please try again.");
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="danger-title" className="danger-zone">
      <h3 id="danger-title" className="danger-title">Delete account</h3>
      <p className="danger-copy">
        This permanently removes your name, email, phone, photo, government ID details and profile
        details, and logs you out everywhere. Your payment receipts are kept for the gym's tax records, without your
        personal details.
      </p>
      <button type="button" className="btn-danger" onClick={() => setOpen(true)}>
        Delete my account
      </button>

      {open && (
        <div className="modal-backdrop" role="presentation" onClick={close}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            onSubmit={confirmDelete}
          >
            <TriangleAlert size={36} color="var(--ember)" aria-hidden="true" />
            <h3 id="delete-dialog-title" className="danger-title" style={{ marginTop: "12px" }}>
              Delete your account?
            </h3>
            <p className="danger-copy">
              This can't be undone. If you have an active membership or unpaid installments, please
              sort them out with the gym first.
            </p>
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
                {busy ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
