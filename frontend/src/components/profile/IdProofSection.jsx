// =============================================================================
// src/components/profile/IdProofSection.jsx
// =============================================================================
// The member's government ID (any ID except Aadhaar).
//   locked   → "show your original ID at the front desk"; the desk unlocks it
//   unlocked → member types type + number (receptionist watches), reviews, saves
//   saved    → read-only, forever. The full number is never shown here.
// =============================================================================

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { IdCard, Lock, LockOpen, ShieldCheck, TriangleAlert } from "lucide-react";
import { getProfile, saveMyId } from "../../services/profileService.js";
import { ID_TYPE_OPTIONS, idTypeLabel, normaliseIdNumber, checkIdNumber } from "../../utils/idTypes.js";

const card = {
  padding: "24px",
  borderRadius: "16px",
  background: "var(--iron-850)",
  border: "1px solid #26262a",
};

const labelStyle = {
  fontSize: "14px",
  fontWeight: "600",
  color: "rgba(255,255,255,0.62)",
  letterSpacing: "0.5px",
  textTransform: "uppercase",
  display: "block",
  marginBottom: "8px",
};

const inputStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "10px",
  padding: "12px 14px",
  color: "#fff",
  fontSize: "17px",
  outline: "none",
  fontFamily: "inherit",
};

const minutesLeft = (until) => Math.max(0, Math.ceil((new Date(until).getTime() - Date.now()) / 60000));

export default function IdProofSection({ user, onUpdate }) {
  const status = user?.idStatus || { state: "locked" };

  const [docType, setDocType] = useState("");
  const [number, setNumber] = useState("");
  const [consent, setConsent] = useState(false);
  const [step, setStep] = useState("form"); // form → review
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [, tick] = useState(0);

  const refresh = async (quiet = true) => {
    if (!quiet) setChecking(true);
    try {
      const res = await getProfile();
      onUpdate(res.data.data.user);
    } catch {
      if (!quiet) toast.error("Couldn't check right now. Please try again.");
    } finally {
      if (!quiet) setChecking(false);
    }
  };

  // While waiting for the desk, quietly check every 10 seconds
  useEffect(() => {
    if (status.state !== "locked") return undefined;
    const t = setInterval(() => refresh(true), 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.state]);

  // While unlocked: update the countdown, and re-check once it runs out
  useEffect(() => {
    if (status.state !== "unlocked") return undefined;
    const t = setInterval(() => {
      tick((n) => n + 1);
      if (new Date(status.unlockedUntil).getTime() <= Date.now()) {
        setStep("form");
        refresh(true);
      }
    }, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.state, status.unlockedUntil]);

  const option = ID_TYPE_OPTIONS.find((o) => o.value === docType);
  const cleaned = normaliseIdNumber(number);

  const goReview = (e) => {
    e.preventDefault();
    const problem = checkIdNumber(docType, cleaned);
    if (problem) return setError(problem);
    if (!consent) return setError("Please tick the box to agree before continuing.");
    setError("");
    setStep("review");
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await saveMyId({ docType, number: cleaned, consent: true });
      onUpdate(res.data.data.user);
      setNumber("");
      setStep("form");
      toast.success("Your ID has been saved.");
    } catch (err) {
      setStep("form");
      setError(err.response?.data?.message || "Couldn't save your ID. Please try again.");
      refresh(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: "520px" }}>
      <h2 className="page-title page-title--sm">ID Proof</h2>
      <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.62)", marginBottom: "24px", lineHeight: "1.6" }}>
        The gym keeps one government ID number for every member. It is stored encrypted and only the gym's admin can see it.
      </p>

      {/* ── Saved ── */}
      {status.state === "saved" && (
        <div style={{ ...card, borderColor: "rgba(34,197,94,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <ShieldCheck size={22} color="#22c55e" aria-hidden="true" />
            <strong style={{ fontSize: "17px" }}>ID saved</strong>
          </div>
          <p style={{ fontSize: "16px", marginBottom: "4px" }}>{idTypeLabel(status.docType)}</p>
          <p style={{ fontSize: "20px", letterSpacing: "2px", fontWeight: "700", marginBottom: "10px" }}>
            ••••••{status.last4}
          </p>
          {status.savedAt && (
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", marginBottom: "14px" }}>
              Saved on {new Date(status.savedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.62)", lineHeight: "1.6" }}>
            For your safety this can't be changed. If there is a mistake, please speak to the front desk.
          </p>
        </div>
      )}

      {/* ── Locked ── */}
      {status.state === "locked" && (
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <Lock size={22} color="var(--yellow)" aria-hidden="true" />
            <strong style={{ fontSize: "17px" }}>Not added yet</strong>
          </div>
          <ol style={{ fontSize: "16px", lineHeight: "1.8", paddingLeft: "22px", marginBottom: "18px", color: "#edede8" }}>
            <li>Take your <strong>original</strong> government ID to the front desk (PAN, driving licence, Voter ID, passport or similar).</li>
            <li>The receptionist checks it and unlocks this page.</li>
            <li>Enter the details here while they watch.</li>
          </ol>
          <button type="button" className="btn-ghost" disabled={checking} onClick={() => refresh(false)}
            style={{ padding: "10px 20px", fontSize: "15px" }}>
            {checking ? "Checking…" : "Check if unlocked"}
          </button>
        </div>
      )}

      {/* ── Unlocked: form ── */}
      {status.state === "unlocked" && step === "form" && (
        <form onSubmit={goReview} style={{ ...card, borderColor: "rgba(243,212,0,0.3)" }} noValidate>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <LockOpen size={22} color="var(--yellow)" aria-hidden="true" />
            <strong style={{ fontSize: "17px" }}>Unlocked by the front desk</strong>
          </div>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.62)", marginBottom: "20px" }}>
            Open for about {minutesLeft(status.unlockedUntil)} more minute{minutesLeft(status.unlockedUntil) === 1 ? "" : "s"}. You can save only once.
          </p>

          <div style={{ marginBottom: "18px" }}>
            <label htmlFor="id-type" style={labelStyle}>ID type</label>
            <select id="id-type" value={docType} style={inputStyle}
              onChange={(e) => { setDocType(e.target.value); setError(""); }}>
              <option value="">Choose the ID you showed</option>
              {ID_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label htmlFor="id-number" style={labelStyle}>ID number</label>
            <input id="id-number" type="text" value={number} autoComplete="off" spellCheck={false}
              autoCapitalize="characters" maxLength={30}
              placeholder={option?.example ? `e.g. ${option.example}` : "Type the number exactly as printed"}
              style={{ ...inputStyle, textTransform: "uppercase", letterSpacing: "1px" }}
              onChange={(e) => { setNumber(e.target.value); setError(""); }} />
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", marginTop: "6px" }}>
              Aadhaar numbers are not accepted.
            </p>
          </div>

          <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "15px", lineHeight: "1.5", marginBottom: "18px", cursor: "pointer" }}>
            <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setError(""); }}
              style={{ marginTop: "4px", width: "18px", height: "18px", accentColor: "#f3d400", flexShrink: 0 }} />
            <span>
              I agree that the gym may store this ID number securely for member verification, as described in the{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--yellow)", textDecoration: "underline" }}>Privacy Policy</a>.
              The receptionist has checked my original ID.
            </span>
          </label>

          {error && <p role="alert" style={{ fontSize: "15px", color: "#ef4444", marginBottom: "14px" }}>{error}</p>}

          <button type="submit" className="btn-gold" style={{ width: "100%", padding: "13px", fontSize: "16px" }}>
            Review
          </button>
        </form>
      )}

      {/* ── Unlocked: review ── */}
      {status.state === "unlocked" && step === "review" && (
        <div style={{ ...card, borderColor: "rgba(243,212,0,0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <IdCard size={22} color="var(--yellow)" aria-hidden="true" />
            <strong style={{ fontSize: "17px" }}>Check carefully with the receptionist</strong>
          </div>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.62)", marginBottom: "6px" }}>{idTypeLabel(docType)}</p>
          <p style={{ fontSize: "26px", fontWeight: "800", letterSpacing: "3px", wordBreak: "break-all", marginBottom: "16px" }}>
            {cleaned}
          </p>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "12px 14px", borderRadius: "10px", background: "rgba(229,72,43,0.1)", border: "1px solid rgba(229,72,43,0.35)", marginBottom: "18px" }}>
            <TriangleAlert size={20} color="#e5482b" style={{ flexShrink: 0, marginTop: "2px" }} aria-hidden="true" />
            <p style={{ fontSize: "15px", lineHeight: "1.5" }}>
              Once saved, this <strong>cannot be changed</strong> by you or the gym. Make sure every character matches the original ID.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button type="button" className="btn-ghost" disabled={saving} onClick={() => setStep("form")}
              style={{ flex: 1, padding: "12px", fontSize: "15px" }}>
              Go back and edit
            </button>
            <button type="button" className="btn-gold" disabled={saving} onClick={save}
              style={{ flex: 1, width: "auto", padding: "12px", fontSize: "15px" }}>
              {saving ? "Saving…" : "Save permanently"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
