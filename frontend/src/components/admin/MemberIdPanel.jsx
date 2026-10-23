// =============================================================================
// src/components/admin/MemberIdPanel.jsx
// =============================================================================
// Admin → Members → (a member): the member's government ID.
//   • Type and the last 4 characters are always visible.
//   • The full number stays hidden until "Show ID number" is pressed (like a
//     password eye). It hides again after 30 seconds, and every view is logged.
//   • Nobody can edit it. If no ID is saved yet, "Unlock ID entry" lets the
//     member type it in from their own profile (once, for 30 minutes).
// =============================================================================

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Eye, EyeOff, IdCard, LockOpen } from "lucide-react";
import api from "../../services/api.js";
import { Tip } from "../ui/Tip.jsx";
import { idTypeLabel } from "../../utils/idTypes.js";

const AUTO_HIDE_MS = 30000;

const smallBtn = {
  padding: "8px 14px",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
};

const timeOf = (d) => new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

export default function MemberIdPanel({ member }) {
  const [status, setStatus] = useState(member.idStatus || { state: "locked" });
  const [revealed, setRevealed] = useState(null); // { number } while visible
  const [busy, setBusy] = useState(false);
  const hideTimer = useRef(null);

  const hide = () => {
    clearTimeout(hideTimer.current);
    setRevealed(null);
  };
  useEffect(() => () => clearTimeout(hideTimer.current), []);

  const show = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/admin/members/${member._id}/id/reveal`);
      setRevealed({ number: res.data.data.number });
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setRevealed(null), AUTO_HIDE_MS);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't load the ID number.");
    } finally {
      setBusy(false);
    }
  };

  const unlock = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/admin/members/${member._id}/id/unlock`);
      setStatus(res.data.data.idStatus);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't unlock ID entry.");
    } finally {
      setBusy(false);
    }
  };

  const checkAgain = async () => {
    setBusy(true);
    try {
      const res = await api.get(`/admin/members/${member._id}`);
      setStatus(res.data.data.user.idStatus);
    } catch {
      toast.error("Couldn't refresh.");
    } finally {
      setBusy(false);
    }
  };

  const unlocked = status.state === "unlocked" && new Date(status.unlockedUntil) > new Date();

  return (
    <div style={{ marginBottom: "20px" }}>
      <p style={{ fontSize: "14px", fontWeight: "700", color: "rgba(255,255,255,0.62)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px" }}>
        ID Proof
      </p>

      <div style={{ padding: "16px 20px", borderRadius: "14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
        {/* ── Saved ── */}
        {status.state === "saved" && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
              <IdCard size={22} color="var(--yellow)" aria-hidden="true" style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.62)" }}>{idTypeLabel(status.docType)}</p>
                <p aria-live="polite" style={{ fontSize: "19px", fontWeight: "700", letterSpacing: "2px", wordBreak: "break-all" }}>
                  {revealed ? revealed.number : `••••••${status.last4 || ""}`}
                </p>
              </div>
            </div>
            <button type="button" onClick={revealed ? hide : show} disabled={busy}
              style={{ ...smallBtn, border: "1px solid rgba(243,212,0,0.25)", background: "rgba(243,212,0,0.08)", color: "#f3d400" }}>
              {revealed ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              {revealed ? "Hide ID number" : busy ? "Loading…" : "Show ID number"}
            </button>
          </div>
        )}
        {status.state === "saved" && (
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "10px" }}>
            Saved{status.savedAt ? ` on ${new Date(status.savedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}. It can't be edited. Each time the number is shown, it is logged.
          </p>
        )}

        {/* ── Not saved yet ── */}
        {status.state !== "saved" && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>
                {unlocked ? "Waiting for the member to enter it" : "Not added yet"}
              </p>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.62)", lineHeight: "1.5", maxWidth: "460px" }}>
                {unlocked
                  ? `Unlocked until ${timeOf(status.unlockedUntil)}. Ask them to open Profile → ID Proof and enter their ID while you watch.`
                  : "Check the member's original ID first, then unlock. They enter the details on their own profile."}
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {unlocked && (
                <button type="button" onClick={checkAgain} disabled={busy}
                  style={{ ...smallBtn, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.7)" }}>
                  Check again
                </button>
              )}
              <Tip text="Lets this member type their ID into their own profile, once, for the next 30 minutes. Check their original ID at the desk first. After they save it, nobody can change it.">
                <button type="button" onClick={unlock} disabled={busy}
                  style={{ ...smallBtn, border: "1px solid rgba(243,212,0,0.25)", background: "rgba(243,212,0,0.08)", color: "#f3d400" }}>
                  <LockOpen size={16} aria-hidden="true" />
                  {unlocked ? "Unlock again" : "Unlock ID entry"}
                </button>
              </Tip>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
