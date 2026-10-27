// =============================================================================
// src/components/admin/RecordPaymentForm.jsx
// =============================================================================
// Record Payment pop-up: activates a membership at the desk (full, part, installments or free) and shows a summary before saving.
// =============================================================================

import { AnimatePresence } from "framer-motion";
import Modal from "../ui/Modal.jsx";
import SummaryDialog from "../ui/SummaryDialog.jsx";
import PaymentModePicker from "./PaymentModePicker.jsx";
import DateInput, { isoToDmy } from "../ui/DateInput";
import { inputStyle as baseInput, labelStyleTight } from "../ui/formStyles.js";
import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import api from "../../services/api.js";
import { InfoTip } from "../ui/Tip.jsx";
import {
  GAP_OPTIONS,
  LAST_DUE_LEAD_DAYS,
  addGap,
  buildSchedule,
  duplicateDates,
  effectiveTierPricePaise,
  fitCount,
  isMoneyInput,
  lastAllowedDueDate,
  localISODate,
  maxInstallmentsFor,
  membershipEndDate,
  paiseToRupeeString,
  rowProblem,
  sortByDueDate,
  suggestSchedule,
  sumPaise,
  toPaise,
  validateSchedule,
} from "../../utils/installmentPlan.js";
import { inr } from "../../utils/format.js";

export default function RecordPaymentForm({ member, plans, onSuccess, onCancel, canComplimentary = true }) {
  const [form, setForm] = useState({
    planId: "",
    durationDays: "30",
    paymentMode: "cash",
    amountPaid: "",
    startDate: localISODate(),
    isComplimentary: false,
    notes: "",
  });
  const [useInstallments, setUseInstallments] = useState(false);
  // Installment auto-calculator. Count and gap are suggested from the plan's
  // length ("" = use the suggestion); the admin can override either, and the
  // first due date. Amounts and dates fill themselves.
  const [instCount, setInstCount] = useState("");
  const [instGap, setInstGap] = useState("");
  const [firstDueOverride, setFirstDueOverride] = useState("");
  const [showSummary, setShowSummary] = useState(false); // confirm box before saving instalments
  // Hand edits to single rows; dropped automatically when the calculator
  // inputs change (the signature no longer matches).
  const [edits, setEdits] = useState({ sig: "", map: {} });
  const [saving, setSaving] = useState(false);

  const selectedPlan = plans.find((p) => p._id === form.planId);
  const selectedTier = selectedPlan?.pricingTiers?.find(
    (t) => t.durationDays === Number(form.durationDays),
  );
  // The server charges the offer price while an offer is valid
  const planPricePaise = effectiveTierPricePaise(selectedTier);
  const planPrice = planPricePaise / 100;

  // What is still unpaid after today's payment → what the installments split
  const receivedPaise = form.amountPaid === "" ? NaN : toPaise(form.amountPaid);
  const balancePaise =
    !form.isComplimentary && planPricePaise > 0 && Number.isFinite(receivedPaise) && receivedPaise >= 0 && receivedPaise < planPricePaise
      ? planPricePaise - receivedPaise
      : 0;
  // Where the membership ends decides what installments can fit
  const days = Number(form.durationDays);
  const today = localISODate();
  const endDate = membershipEndDate(form.startDate, days);
  const lastAllowed = lastAllowedDueDate(form.startDate, days);
  const suggestion = useMemo(() => suggestSchedule(form.startDate, days), [form.startDate, days]);
  const gap = instGap || suggestion.gap;
  const firstDueAuto = addGap(form.startDate, gap, 1);
  const firstDue = firstDueOverride || firstDueAuto;
  const fit = fitCount(firstDue, gap, lastAllowed);
  const maxCount = Math.min(maxInstallmentsFor(balancePaise), fit);
  const count = Math.min(instCount ? Number(instCount) : suggestion.count, maxCount);
  const sig = `${balancePaise}|${count}|${gap}|${firstDue}`;
  const ctx = { today, lastAllowed, end: endDate };

  const generatedRows = useMemo(
    () => (balancePaise > 0 && count >= 1 ? buildSchedule({ balancePaise, count, gap, firstDue }) : []),
    [balancePaise, count, gap, firstDue],
  );
  const rows = generatedRows.map((row, i) => (edits.sig === sig && edits.map[i] ? { ...row, ...edits.map[i] } : row));
  const hasEdits = edits.sig === sig && Object.keys(edits.map).length > 0;
  const diffPaise = balancePaise - sumPaise(rows);
  const rowIssues = rows.map((r) => rowProblem(r, ctx));
  const sameDates = duplicateDates(rows);
  // A different plan, length or start date changes what fits → start from the suggestion again
  const resetCalculator = () => {
    setInstCount("");
    setInstGap("");
    setFirstDueOverride("");
  };

  const durationOptions = [
    { days: "30", label: "Monthly (30 days)" },
    { days: "90", label: "Quarterly (90 days)" },
    { days: "180", label: "Half-Yearly (180 days)" },
    { days: "365", label: "Annual (365 days)" },
  ];

  const editRow = (i, field, value) =>
    setEdits((prev) => {
      const current = prev.sig === sig ? prev.map : {};
      return { sig, map: { ...current, [i]: { ...current[i], [field]: value } } };
    });
  const resetRows = () => setEdits({ sig: "", map: {} });
  // Puts whatever is left over (or too much) into the last installment
  const fixLastRow = () => {
    const last = rows.length - 1;
    const lastPaise = toPaise(rows[last].amountDue) || 0;
    editRow(last, "amountDue", paiseToRupeeString(Math.max(0, lastPaise + diffPaise)));
  };

  const wantsInstallments = useInstallments && !form.isComplimentary && balancePaise > 0;

  // Returns the message to show when the form can't be saved yet
  const formProblem = () => {
    if (!form.planId) return "Please select a plan.";
    if (!form.isComplimentary) {
      if (!isMoneyInput(form.amountPaid)) return "Enter the amount received in rupees (up to 2 decimals).";
      const paid = toPaise(form.amountPaid);
      if (paid <= 0) return "Amount received must be above ₹0. For a free membership tick Complimentary.";
      if (paid > planPricePaise) return `Amount received cannot be more than the plan price (₹${paiseToRupeeString(planPricePaise)}).`;
    }
    if (wantsInstallments) return validateSchedule(rows, balancePaise, ctx);
    return "";
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        userId: member._id,
        planId: form.planId,
        durationDays: Number(form.durationDays),
        startDate: form.startDate,
        paymentMode: form.paymentMode,
        amountPaid: form.isComplimentary ? 0 : Number(form.amountPaid),
        isComplimentary: form.isComplimentary,
        notes: form.notes,
      };

      if (wantsInstallments) {
        payload.installments = sortByDueDate(rows).map((row) => ({
          amountDue: Number(row.amountDue),
          dueDate: row.dueDate,
        }));
      }

      const res = await api.post("/admin/subscriptions/offline", payload);
      toast.success(
        `${res.data.message}${res.data.data?.receipt ? ` Receipt ${res.data.data.receipt.receiptNumber} emailed.` : ""}`,
        { duration: 6000 },
      );
      onSuccess();
      onCancel();
    } catch (err) {
      setShowSummary(false);
      toast.error(err.response?.data?.message || "Failed to record payment.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const problem = formProblem();
    if (problem) return toast.error(problem);
    // Every desk record (full, part, installments, free) is checked once more before it is saved
    setShowSummary(true);
  };

  const inputStyle = { ...baseInput, padding: "10px 14px" };
  const labelStyle = labelStyleTight;

  return (
    <>
      <Modal label="Record payment" zIndex={200}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "19px", fontWeight: "700" }}>
              Record Payment
            </h2>
            <p
              style={{
                fontSize: "15px",
                color: "rgba(255,255,255,0.62)",
                marginTop: "4px",
              }}
            >
              {member.firstName} {member.lastName} · {member.userId}
            </p>
          </div>
          <button aria-label="Close"
            onClick={onCancel}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.62)",
              fontSize: "20px",
              cursor: "pointer",
              padding: "8px 12px",
            }}
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          {/* Complimentary (admin only — the server refuses it for a receptionist) */}
          {canComplimentary && <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
              padding: "12px 16px",
              background: "rgba(243,212,0,0.05)",
              borderRadius: "10px",
              border: "1px solid rgba(243,212,0,0.1)",
            }}
          >
            <input
              type="checkbox"
              checked={form.isComplimentary}
              onChange={(e) =>
                setForm({ ...form, isComplimentary: e.target.checked })
              }
              style={{ width: "16px", height: "16px", accentColor: "#f3d400" }}
            />
            <div>
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#f3d400",
                }}
              >
                Complimentary Membership{" "}
                <InfoTip text="A free membership. Nothing is charged, no receipt is made, and it adds nothing to revenue. The member gets a welcome email." />
              </span>
              <p
                style={{
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.62)",
                  marginTop: "2px",
                }}
              >
                Free — for staff, partners, compensation
              </p>
            </div>
          </label>}

          {/* Plan */}
          <div>
            <label style={labelStyle}>Membership Plan</label>
            <select
              style={{ ...inputStyle, appearance: "none" }}
              value={form.planId}
              onChange={(e) => {
                resetCalculator();
                setForm({ ...form, planId: e.target.value });
              }}
            >
              <option value="">Select a plan</option>
              {plans.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div>
            <label style={labelStyle}>Duration</label>
            <select
              style={{ ...inputStyle, appearance: "none" }}
              value={form.durationDays}
              onChange={(e) => {
                resetCalculator();
                setForm({ ...form, durationDays: e.target.value });
              }}
            >
              {durationOptions.map((o) => (
                <option key={o.days} value={o.days}>
                  {o.label}
                </option>
              ))}
            </select>
            {planPrice > 0 && (
              <p
                style={{ fontSize: "14px", color: "#f3d400", marginTop: "6px" }}
              >
                Plan price: ₹{planPrice.toLocaleString("en-IN")}
              </p>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label style={labelStyle}>Start Date</label>
            <DateInput
              ariaLabel="Start date"
              value={form.startDate}
              onChange={(v) => {
                resetCalculator();
                setForm({ ...form, startDate: v });
              }}
            />
          </div>

          {/* Payment details */}
          {!form.isComplimentary && (
            <>
              <div>
                <label style={labelStyle}>Payment Mode</label>
                <PaymentModePicker value={form.paymentMode} onChange={(mode) => setForm({ ...form, paymentMode: mode })} />
              </div>

              <div>
                <label style={labelStyle}>Amount Received (₹)</label>
                <input
                  type="number"
                  style={inputStyle}
                  placeholder={`Full amount: ₹${planPrice}`}
                  value={form.amountPaid}
                  onChange={(e) =>
                    setForm({ ...form, amountPaid: e.target.value })
                  }
                />
                {form.amountPaid && Number(form.amountPaid) < planPrice && (
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#f97316",
                      marginTop: "6px",
                    }}
                  >
                    Partial — Balance: ₹
                    {(planPrice - Number(form.amountPaid)).toLocaleString(
                      "en-IN",
                    )}
                  </p>
                )}
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={useInstallments}
                  onChange={(e) => setUseInstallments(e.target.checked)}
                  style={{
                    width: "16px",
                    height: "16px",
                    accentColor: "#f3d400",
                  }}
                />
                <span
                  style={{ fontSize: "15px", color: "rgba(255,255,255,0.6)" }}
                >
                  Create installment schedule{" "}
                  <InfoTip text="Splits what is still unpaid into equal parts (the last one takes any odd rupees). Choose how many parts and how far apart; you can still change any amount or date. The member sees what is due, and late parts are flagged as overdue." />
                </span>
              </label>

              {useInstallments && (
                <div
                  style={{
                    background: "var(--iron-850)",
                    borderRadius: "12px",
                    padding: "16px",
                    border: "1px solid #26262a",
                  }}
                >
                  <p style={{ ...labelStyle, marginBottom: "12px" }}>
                    Installment Schedule
                  </p>

                  {balancePaise <= 0 ? (
                    <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.62)", lineHeight: 1.5 }}>
                      Enter the amount received today (less than the plan price).
                      The balance that is left is split into installments for you.
                    </p>
                  ) : (
                    <>
                      <p style={{ fontSize: "15px", color: "#f3d400", marginBottom: "6px" }}>
                        Balance to split: {inr(balancePaise)}
                      </p>
                      <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.62)", marginBottom: "14px", lineHeight: 1.5 }}>
                        Membership: {isoToDmy(form.startDate) || "—"} → {isoToDmy(endDate) || "—"}. Every installment must be on or before{" "}
                        <strong style={{ color: "rgba(255,255,255,0.85)" }}>{isoToDmy(lastAllowed) || "—"}</strong>{" "}
                        ({LAST_DUE_LEAD_DAYS} days before it ends).
                      </p>

                      {maxCount < 1 && (
                        <p role="alert" style={{ fontSize: "14px", color: "#f97316", marginBottom: "12px", lineHeight: 1.5 }}>
                          No installment fits before {isoToDmy(lastAllowed) || "the membership ends"} with this gap and first date.
                          Pick a shorter gap or an earlier first date, or collect the full amount.
                        </p>
                      )}

                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
                        <div style={{ flex: "1 1 130px" }}>
                          <label htmlFor="inst-count" style={labelStyle}>Installments</label>
                          <select
                            id="inst-count"
                            style={{ ...inputStyle, appearance: "none", padding: "8px 12px" }}
                            value={String(count)}
                            onChange={(e) => setInstCount(e.target.value)}
                            disabled={maxCount < 1}
                          >
                            {maxCount < 1 && <option value="0">None fit</option>}
                            {Array.from({ length: maxCount }, (_, k) => k + 1).map((n) => (
                              <option key={n} value={n}>
                                {n} {n === 1 ? "installment" : "installments"}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div style={{ flex: "1 1 130px" }}>
                          <label htmlFor="inst-gap" style={labelStyle}>Gap between</label>
                          <select
                            id="inst-gap"
                            style={{ ...inputStyle, appearance: "none", padding: "8px 12px" }}
                            value={gap}
                            onChange={(e) => setInstGap(e.target.value)}
                          >
                            {GAP_OPTIONS.map((g) => {
                              const first = firstDueOverride || addGap(form.startDate, g.value, 1);
                              const fits = fitCount(first, g.value, lastAllowed) >= 1;
                              return (
                                <option key={g.value} value={g.value} disabled={!fits && g.value !== gap}>
                                  {g.label}{fits ? "" : " — too long for this plan"}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>

                      {rows.map((row, i) => (
                        <div key={i} style={{ marginBottom: "10px" }}>
                          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.62)", marginBottom: "4px" }}>
                            Installment {i + 1}
                            {i === 0 && (
                              <>
                                {" "}
                                <InfoTip text="Starts one gap after the start date. Pick another date if you like — the later installments follow from it." />
                              </>
                            )}
                          </p>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.01"
                              aria-label={`Installment ${i + 1} amount in rupees`}
                              style={{ ...inputStyle, padding: "8px 12px", flex: "1 1 100px", width: "auto" }}
                              placeholder="Amount ₹"
                              value={row.amountDue}
                              onChange={(e) => editRow(i, "amountDue", e.target.value)}
                            />
                            <div style={{ flex: "1 1 160px" }}>
                              <DateInput
                                ariaLabel={`Installment ${i + 1} due date`}
                                style={{ padding: "8px 12px" }}
                                value={row.dueDate}
                                onChange={(v) => (i === 0 ? setFirstDueOverride(v) : editRow(i, "dueDate", v))}
                              />
                            </div>
                          </div>
                          {rowIssues[i] && (
                            <p role="alert" style={{ fontSize: "14px", color: "#ef4444", margin: "6px 0 0", lineHeight: 1.4 }}>
                              {rowIssues[i]}
                            </p>
                          )}
                          {i === 0 && firstDueOverride && (
                            <button
                              type="button"
                              onClick={() => setFirstDueOverride("")}
                              style={{ background: "transparent", border: "none", color: "#f3d400", fontSize: "14px", cursor: "pointer", padding: "6px 0 0" }}
                            >
                              Use automatic date
                            </button>
                          )}
                        </div>
                      ))}

                      {sameDates.length > 0 && (
                        <p role="status" style={{ fontSize: "14px", color: "#f97316", margin: "0 0 6px", lineHeight: 1.4 }}>
                          More than one installment falls on {sameDates.join(", ")}. Give each installment its own date — saving is blocked until then.
                        </p>
                      )}

                      <p
                        role="status"
                        style={{
                          fontSize: "14px",
                          marginTop: "4px",
                          color: diffPaise === 0 ? "#22c55e" : "#f97316",
                        }}
                      >
                        {diffPaise === 0
                          ? `Total ${inr(sumPaise(rows))} matches the balance ✓`
                          : diffPaise > 0
                            ? `${inr(diffPaise)} of the balance is not assigned yet.`
                            : `${inr(-diffPaise)} more than the balance.`}
                      </p>

                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
                        {diffPaise !== 0 && (
                          <button
                            type="button"
                            onClick={fixLastRow}
                            style={{ background: "transparent", border: "1px dashed rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", borderRadius: "8px", padding: "8px 14px", fontSize: "14px", cursor: "pointer" }}
                          >
                            Put the difference in the last installment
                          </button>
                        )}
                        {hasEdits && (
                          <button
                            type="button"
                            onClick={resetRows}
                            style={{ background: "transparent", border: "1px dashed rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", borderRadius: "8px", padding: "8px 14px", fontSize: "14px", cursor: "pointer" }}
                          >
                            Recalculate automatically
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          <div>
            <label style={labelStyle}>Notes (optional)</label>
            <textarea
              style={{ ...inputStyle, resize: "vertical" }}
              rows={2}
              placeholder="e.g. Paid at front desk..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="button"
              onClick={onCancel}
              className="btn-ghost"
              style={{ flex: 1, padding: "12px" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-gold"
              disabled={saving}
              style={{ flex: 1 }}
            >
              {saving ? "Recording..." : "Activate Membership"}
            </button>
          </div>
        </form>
      </Modal>

      <AnimatePresence>
        {showSummary && (
          <SummaryDialog
            subtitle={`${member.firstName} ${member.lastName} · ${selectedPlan?.name} · ${durationOptions.find((d) => d.days === form.durationDays)?.label}`}
            rows={[
              ["Membership", `${isoToDmy(form.startDate)} → ${isoToDmy(endDate)}`],
              ["Plan price", inr(planPricePaise)],
              form.isComplimentary
                ? ["Payment", "Free — complimentary"]
                : [`Received today (${form.paymentMode})`, inr(toPaise(form.amountPaid))],
              ...(form.isComplimentary ? [] : [["Still to pay", inr(balancePaise)]]),
            ]}
            note={
              wantsInstallments
                ? { tone: "ok", text: `Installments add up to ${inr(sumPaise(rows))} = the balance ✓` }
                : form.isComplimentary
                  ? { tone: "ok", text: "No money is collected. The membership is given free of charge." }
                  : balancePaise <= 0
                    ? { tone: "ok", text: "Paid in full — nothing is left to collect." }
                    : { tone: "warn", text: `No installment schedule — ${inr(balancePaise)} stays pending and can be collected later.` }
            }
            saving={saving}
            onBack={() => setShowSummary(false)}
            onConfirm={save}
          >
            {wantsInstallments && (
              <>
                <p style={{ fontSize: "14px", fontWeight: 700, color: "rgba(255,255,255,0.62)", letterSpacing: "1px", textTransform: "uppercase", margin: "16px 0 6px" }}>
                  Installments
                </p>
                {sortByDueDate(rows).map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", padding: "6px 0" }}>
                    <span>{i + 1}. {isoToDmy(row.dueDate)}</span>
                    <span style={{ fontWeight: 600, color: "#f3d400" }}>{inr(toPaise(row.amountDue))}</span>
                  </div>
                ))}
              </>
            )}
          </SummaryDialog>
        )}
      </AnimatePresence>
    </>
  );
}

