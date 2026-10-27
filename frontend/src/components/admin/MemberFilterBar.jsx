// =============================================================================
// src/components/admin/MemberFilterBar.jsx
// =============================================================================
// Filters + sort for the admin Members list.
//   • "Filters" button opens a panel (a bottom sheet on phones) with status,
//     plan and dues choices; "Sort by" is a dropdown next to it.
//   • Chosen filters appear as removable chips with a "Clear all".
// The state is a plain object (see EMPTY_FILTERS); the page turns it into the
// query string the server understands and keeps it in the page URL.
// =============================================================================

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { subscriptionStatusColor } from "../../utils/format.js";
import { inputStyle } from "../ui/formStyles.js";

export const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "grace", label: "Grace period" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
  { value: "complimentary", label: "Complimentary" },
  { value: "none", label: "No membership" },
];

export const DUES_OPTIONS = [
  { value: "any", label: "Has dues" },
  { value: "overdue", label: "Overdue installment" },
  { value: "none", label: "No dues" },
];

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "expiry_soon", label: "Expiring soonest" },
  { value: "dues_high", label: "Highest dues" },
];

export const EMPTY_FILTERS = { status: [], plan: [], dues: "", idMissing: false };

const SORT_VALUES = SORT_OPTIONS.map((o) => o.value);
const csv = (v) => (v ? v.split(",").filter(Boolean) : []);

// URL ⇄ state (unknown values in a hand-edited URL are dropped)
export const readFilters = (sp) => ({
  filters: {
    status: csv(sp.get("status")).filter((s) => STATUS_OPTIONS.some((o) => o.value === s)),
    plan: csv(sp.get("plan")),
    dues: DUES_OPTIONS.some((o) => o.value === sp.get("dues")) ? sp.get("dues") : "",
    idMissing: sp.get("id") === "missing",
  },
  sort: SORT_VALUES.includes(sp.get("sort")) ? sp.get("sort") : "newest",
  query: (sp.get("q") || "").slice(0, 100),
});

export const writeParams = ({ filters, sort, query }) => {
  const p = new URLSearchParams();
  if (query) p.set("q", query);
  if (filters.status.length) p.set("status", filters.status.join(","));
  if (filters.plan.length) p.set("plan", filters.plan.join(","));
  if (filters.dues) p.set("dues", filters.dues);
  if (filters.idMissing) p.set("id", "missing");
  if (sort !== "newest") p.set("sort", sort);
  return p;
};

export const apiParams = ({ filters, sort, query, page, limit }) => {
  const p = new URLSearchParams({ q: query || "", page: String(page), limit: String(limit), sort });
  if (filters.status.length) p.set("status", filters.status.join(","));
  if (filters.plan.length) p.set("plan", filters.plan.join(","));
  if (filters.dues) p.set("dues", filters.dues);
  if (filters.idMissing) p.set("idMissing", "true");
  return p.toString();
};

export const countFilters = (f) => f.status.length + f.plan.length + (f.dues ? 1 : 0) + (f.idMissing ? 1 : 0);

const toggleIn = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

const chipStyle = (on, color = "var(--yellow)") => ({
  minHeight: "40px",
  padding: "6px 14px",
  borderRadius: "999px",
  fontSize: "15px",
  fontWeight: 600,
  cursor: "pointer",
  border: `1px solid ${on ? color : "rgba(255,255,255,0.14)"}`,
  background: on ? "rgba(243,212,0,0.12)" : "transparent",
  color: on ? color : "rgba(255,255,255,0.75)",
});

const groupLabel = {
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "0.6px",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.55)",
  margin: "14px 0 8px",
};

function useIsPhone() {
  const query = "(max-width: 640px)";
  const [phone, setPhone] = useState(() => (typeof window !== "undefined" ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setPhone(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return phone;
}

function Fields({ filters, onChange, plans }) {
  return (
    <>
      <p style={{ ...groupLabel, marginTop: 0 }}>Membership status</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {STATUS_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={filters.status.includes(o.value)}
            onClick={() => onChange({ ...filters, status: toggleIn(filters.status, o.value) })}
            style={chipStyle(filters.status.includes(o.value), subscriptionStatusColor(o.value, { admin: true }))}
          >
            {o.label}
          </button>
        ))}
      </div>

      {plans.length > 0 && (
        <>
          <p style={groupLabel}>Plan (current membership)</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {plans.map((p) => (
              <button
                key={p._id}
                type="button"
                aria-pressed={filters.plan.includes(p._id)}
                onClick={() => onChange({ ...filters, plan: toggleIn(filters.plan, p._id) })}
                style={chipStyle(filters.plan.includes(p._id))}
              >
                {p.name}
              </button>
            ))}
          </div>
        </>
      )}

      <p style={groupLabel}>Dues</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {DUES_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={filters.dues === o.value}
            onClick={() => onChange({ ...filters, dues: filters.dues === o.value ? "" : o.value })}
            style={chipStyle(filters.dues === o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>

      <p style={groupLabel}>Government ID</p>
      <button
        type="button"
        aria-pressed={filters.idMissing}
        onClick={() => onChange({ ...filters, idMissing: !filters.idMissing })}
        style={chipStyle(filters.idMissing)}
      >
        ID not added
      </button>
    </>
  );
}

export default function MemberFilterBar({ filters, sort, plans, total, onFilters, onSort }) {
  const [open, setOpen] = useState(false);
  const phone = useIsPhone();
  const reduce = useReducedMotion();
  const count = countFilters(filters);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const chips = [
    ...filters.status.map((v) => ({ key: `s-${v}`, label: STATUS_OPTIONS.find((o) => o.value === v)?.label || v, remove: () => onFilters({ ...filters, status: filters.status.filter((x) => x !== v) }) })),
    ...filters.plan.map((v) => ({ key: `p-${v}`, label: plans.find((p) => p._id === v)?.name || "Plan", remove: () => onFilters({ ...filters, plan: filters.plan.filter((x) => x !== v) }) })),
    ...(filters.dues ? [{ key: "dues", label: DUES_OPTIONS.find((o) => o.value === filters.dues)?.label, remove: () => onFilters({ ...filters, dues: "" }) }] : []),
    ...(filters.idMissing ? [{ key: "id", label: "ID not added", remove: () => onFilters({ ...filters, idMissing: false }) }] : []),
  ];

  const footer = (
    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "18px" }}>
      <button type="button" className="btn-ghost btn-sm" onClick={() => onFilters(EMPTY_FILTERS)} disabled={!count} style={{ flex: "1 1 120px", minHeight: "44px", opacity: count ? 1 : 0.5 }}>
        Clear all
      </button>
      <button type="button" className="btn-gold btn-sm" onClick={() => setOpen(false)} style={{ flex: "1 1 120px", minHeight: "44px" }}>
        Show {total} member{total === 1 ? "" : "s"}
      </button>
    </div>
  );

  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          style={{ ...chipStyle(open || count > 0), display: "inline-flex", alignItems: "center", gap: "8px", minHeight: "44px", borderRadius: "10px" }}
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filters{count ? ` (${count})` : ""}
        </button>
        <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", flex: "1 1 160px", minWidth: 0 }}>
          <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.62)", whiteSpace: "nowrap" }}>Sort by</span>
          <select
            aria-label="Sort members"
            value={sort}
            onChange={(e) => onSort(e.target.value)}
            style={{ ...inputStyle, padding: "9px 12px", minHeight: "44px", flex: 1, minWidth: 0 }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Chosen filters */}
      {chips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.remove}
              aria-label={`Remove filter ${c.label}`}
              style={{ ...chipStyle(true), minHeight: "34px", padding: "3px 10px", fontSize: "14px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              {c.label} <X size={14} aria-hidden="true" />
            </button>
          ))}
          <button type="button" onClick={() => onFilters(EMPTY_FILTERS)} style={{ background: "transparent", border: "none", color: "var(--ember)", fontWeight: 700, fontSize: "14px", cursor: "pointer", padding: "6px 8px" }}>
            Clear all
          </button>
        </div>
      )}

      {/* Panel: inline on larger screens, bottom sheet on phones */}
      <AnimatePresence>
        {open && !phone && (
          <motion.div
            key="inline"
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="card-iron" style={{ marginTop: "10px", padding: "16px" }} role="group" aria-label="Member filters">
              <Fields filters={filters} onChange={onFilters} plans={plans} />
              {footer}
            </div>
          </motion.div>
        )}
        {open && phone && (
          <motion.div key="sheet" style={{ position: "fixed", inset: 0, zIndex: 350 }} initial={{ opacity: 1 }} exit={{ opacity: 1 }}>
            <motion.div
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)" }}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Member filters"
              initial={reduce ? { opacity: 0 } : { y: "100%" }}
              animate={reduce ? { opacity: 1 } : { y: 0 }}
              exit={reduce ? { opacity: 0 } : { y: "100%" }}
              transition={{ duration: 0.26, ease: "easeOut" }}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                maxHeight: "85vh",
                overflowY: "auto",
                background: "var(--iron-850)",
                borderTop: "1px solid var(--iron-700)",
                borderRadius: "18px 18px 0 0",
                padding: "18px 16px calc(18px + env(safe-area-inset-bottom))",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: 700 }}>Filters</h2>
                <button type="button" aria-label="Close filters" onClick={() => setOpen(false)} style={{ background: "transparent", border: "none", color: "#fff", width: "44px", height: "44px", cursor: "pointer" }}>
                  <X size={22} />
                </button>
              </div>
              <Fields filters={filters} onChange={onFilters} plans={plans} />
              {footer}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
