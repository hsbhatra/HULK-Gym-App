// =============================================================================
// src/components/admin/AnalyticsPanel.jsx — Revenue | Members | Dues | Renewals
// =============================================================================
// Every number comes from the backend (paise); this file only draws it.
import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import api from "../../services/api.js";
import DateInput, { isoToDmy } from "../ui/DateInput.jsx";
import { inr } from "../../utils/format.js";

const YELLOW = "#f3d400", EMBER = "#e5482b", STEEL = "#edede8", MUTED = "#8c8c86";

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const PRESETS = [
  { id: "month", label: "This month", get: () => { const n = new Date(); return [ymd(new Date(n.getFullYear(), n.getMonth(), 1)), ymd(n)]; } },
  { id: "30d", label: "Last 30 days", get: () => { const n = new Date(); return [ymd(new Date(n.getFullYear(), n.getMonth(), n.getDate() - 29)), ymd(n)]; } },
  { id: "90d", label: "3 months", get: () => { const n = new Date(); return [ymd(new Date(n.getFullYear(), n.getMonth(), n.getDate() - 89)), ymd(n)]; } },
  { id: "year", label: "This year", get: () => { const n = new Date(); return [ymd(new Date(n.getFullYear(), 0, 1)), ymd(n)]; } },
];

const axisRupees = (p) => { const neg = p < 0 ? "-" : ""; const r = Math.abs(p) / 100; return r >= 100000 ? `${neg}₹${+(r / 100000).toFixed(1)}L` : r >= 1000 ? `${neg}₹${+(r / 1000).toFixed(1)}k` : `${neg}₹${Math.round(r)}`; };
const keyLabel = (k) => (k.length === 7 ? new Date(`${k}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }) : `${k.slice(8)}-${k.slice(5, 7)}`);
const MODE_LABEL = { cash: "Cash", upi: "UPI", card: "Card", online: "Online" };

const card = { padding: "18px", borderRadius: "var(--radius-card)", background: "var(--iron-850)", border: "1px solid #26262a" };
const label = { fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.62)", letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 12px" };
const tip = { background: "#16161a", border: "1px solid #2e2e34", borderRadius: 8, color: "#edede8", fontSize: 13 };

function Stat({ title, value, sub, change, accent, negative }) {
  return (
    <div style={{ ...card, borderColor: accent ? "rgba(243,212,0,0.45)" : "#26262a" }}>
      <p style={{ ...label, marginBottom: 8, fontSize: 12 }}>{title}</p>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: negative ? EMBER : accent ? YELLOW : "var(--text-1)", fontFamily: "var(--font-display, inherit)" }}>{value}</p>
      <p style={{ margin: "6px 0 0", fontSize: 13, color: MUTED, minHeight: 18 }}>
        {change != null && <span style={{ color: change >= 0 ? "#6fd18a" : EMBER, fontWeight: 700 }}>{change >= 0 ? "▲" : "▼"} {Math.abs(change)}% </span>}
        {sub}
      </p>
    </div>
  );
}
const Grid = ({ children, min = 170 }) => <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))`, gap: 12, marginBottom: 16 }}>{children}</div>;
const Empty = ({ children }) => <p style={{ color: MUTED, fontSize: 14, margin: 0 }}>{children}</p>;

function Bars({ rows, fmt, color = YELLOW }) {
  const max = Math.max(1, ...rows.map((r) => r.amount));
  if (!rows.length) return <Empty>Nothing in this period.</Empty>;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {rows.map((r) => (
        <div key={r.key}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, gap: 8 }}>
            <span style={{ overflowWrap: "anywhere" }}>{r.label || r.key}</span>
            <span style={{ fontWeight: 700 }}>{fmt(r.amount)}<span style={{ color: MUTED, fontWeight: 400 }}> · {r.count}</span></span>
          </div>
          <div style={{ height: 6, borderRadius: 4, background: "#1e1e22", marginTop: 4 }}>
            <div style={{ height: 6, borderRadius: 4, background: color, width: `${Math.max(2, (r.amount / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Chart({ data, bars, lines, money }) {
  const d = data.map((x) => ({ ...x, name: keyLabel(x.key) }));
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <ComposedChart data={d} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="#222226" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 12 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={18} />
          <YAxis tick={{ fill: MUTED, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={money ? axisRupees : undefined} width={46} />
          <Tooltip contentStyle={tip} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={(v, n) => [money ? inr(v) : v, n]} />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          {bars.map((b) => <Bar key={b.key} dataKey={b.key} name={b.name} fill={b.color} radius={[3, 3, 0, 0]} />)}
          {lines.map((l) => <Line key={l.key} dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={2} dot={false} />)}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function Person({ p, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 0", borderTop: "1px solid #222226", fontSize: 14 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{p.name}</div>
        <div style={{ color: MUTED, fontSize: 13 }}>{[p.code, p.phone, p.plan].filter(Boolean).join(" · ")}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>{right}</div>
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
function RevenueTab({ d }) {
  return (
    <>
      <Grid>
        <Stat title="Total received" value={inr(d.received)} change={d.change.received} sub={`${d.payments} payment${d.payments === 1 ? "" : "s"}`} />
        <Stat title="Refunds" value={d.refunds ? `− ${inr(d.refunds)}` : inr(0)} negative={d.refunds > 0} sub="sent back to members" />
        <Stat accent title="Actual revenue" value={inr(d.actualRevenue)} change={d.change.actualRevenue} sub="received − refunds" />
        <Stat title="Average payment" value={inr(d.averagePayment)} sub="per payment" />
      </Grid>
      {d.heldForRefund.count > 0 && (
        <p style={{ ...card, borderColor: "rgba(229,72,43,0.5)", fontSize: 14, margin: "0 0 16px" }}>
          {inr(d.heldForRefund.amount)} from {d.heldForRefund.count} duplicate online payment{d.heldForRefund.count > 1 ? "s" : ""} is waiting for a refund. It is counted in “received” and will move to “refunds” once refunded.
        </p>
      )}
      <div style={{ ...card, marginBottom: 16 }}>
        <p style={label}>Received vs refunds</p>
        <Chart money data={d.series} bars={[{ key: "received", name: "Received", color: YELLOW }, { key: "refunds", name: "Refunds", color: EMBER }]} lines={[{ key: "net", name: "Actual revenue", color: STEEL }]} />
      </div>
      <Grid min={280}>
        <div style={card}><p style={label}>By plan</p><Bars rows={d.byPlan} fmt={inr} /></div>
        <div style={card}><p style={label}>By payment mode</p><Bars rows={d.byMode.map((m) => ({ ...m, label: MODE_LABEL[m.key] || m.key }))} fmt={inr} color={STEEL} /></div>
      </Grid>
    </>
  );
}

function MembersTab({ d }) {
  return (
    <>
      <Grid>
        <Stat accent title="Active now" value={d.activeNow} sub={`of ${d.totalMembers} registered`} />
        <Stat title="New sign-ups" value={d.signups} change={d.change.signups} />
        <Stat title="New memberships" value={d.newMemberships} change={d.change.newMemberships} sub="first-time buyers" />
        <Stat title="Renewals" value={d.renewals} change={d.change.renewals} sub="repeat memberships" />
      </Grid>
      <div style={{ ...card, marginBottom: 16 }}>
        <p style={label}>Joining and renewing</p>
        <Chart data={d.series} bars={[{ key: "newMemberships", name: "New", color: YELLOW }, { key: "renewals", name: "Renewed", color: STEEL }, { key: "signups", name: "Sign-ups", color: "#4a4a50" }]} lines={[{ key: "active", name: "Active members", color: EMBER }]} />
      </div>
      {d.complimentary > 0 && <p style={{ color: MUTED, fontSize: 13 }}>{d.complimentary} complimentary membership{d.complimentary > 1 ? "s" : ""} in this period are not counted above.</p>}
    </>
  );
}

function DuesTab({ d }) {
  return (
    <>
      <Grid>
        <Stat accent title="Outstanding" value={inr(d.outstanding)} sub={`${d.membersWithDues} member${d.membersWithDues === 1 ? "" : "s"}`} />
        <Stat title="Overdue" value={inr(d.overdue.amount)} negative={d.overdue.amount > 0} sub={`${d.overdue.count} installment${d.overdue.count === 1 ? "" : "s"} · ${d.overdue.members} member${d.overdue.members === 1 ? "" : "s"}`} />
        <Stat title="Due in 7 days" value={inr(d.upcoming.next7.amount)} sub={`${d.upcoming.next7.count} installment${d.upcoming.next7.count === 1 ? "" : "s"}`} />
        <Stat title="Collection rate" value={d.collection.rate == null ? "—" : `${d.collection.rate}%`} sub={d.collection.rate == null ? "nothing fell due" : `${inr(d.collection.collectedAmount)} of ${inr(d.collection.dueAmount)}`} />
      </Grid>
      <Grid min={280}>
        <div style={card}><p style={label}>Overdue by age</p><Bars rows={d.aging} fmt={inr} color={EMBER} /></div>
        <div style={card}>
          <p style={label}>Owe the most</p>
          {d.top.length === 0 ? <Empty>No pending dues. 🎉</Empty> : d.top.map((p) => (
            <Person key={p.id} p={p} right={<><div style={{ fontWeight: 700 }}>{inr(p.owed)}</div>{p.overdueCount > 0 && <div style={{ color: EMBER, fontSize: 12 }}>{p.oldestOverdueDays}d overdue</div>}</>} />
          ))}
        </div>
      </Grid>
    </>
  );
}

function RenewalsTab({ d }) {
  return (
    <>
      <Grid>
        <Stat accent title="Expiring in 7 days" value={d.expiring.next7} />
        <Stat title="In 15 days" value={d.expiring.next15} />
        <Stat title="In 30 days" value={d.expiring.next30} />
        <Stat title="Renewal rate" value={d.period.rate == null ? "—" : `${d.period.rate}%`} sub={`${d.period.renewed} renewed · ${d.period.lapsed} lapsed`} />
      </Grid>
      {d.period.undecided > 0 && <p style={{ color: MUTED, fontSize: 13, margin: "0 0 12px" }}>{d.period.undecided} membership{d.period.undecided > 1 ? "s" : ""} that ended in this period are still in the grace window, so they are not counted yet.</p>}
      <Grid min={280}>
        <div style={card}><p style={label}>Expiring soon (not renewed)</p>
          {d.expiringList.length === 0 ? <Empty>No one expiring in the next 30 days.</Empty> : d.expiringList.map((p) => <Person key={p.id + p.endDate} p={p} right={<span style={{ fontWeight: 700 }}>{isoToDmy(String(p.endDate).slice(0, 10))}</span>} />)}
        </div>
        <div style={card}><p style={label}>Lapsed in this period</p>
          {d.lapsedList.length === 0 ? <Empty>No lapsed memberships.</Empty> : d.lapsedList.map((p) => <Person key={p.id + p.endDate} p={p} right={<span style={{ color: EMBER, fontWeight: 700 }}>{isoToDmy(String(p.endDate).slice(0, 10))}</span>} />)}
        </div>
      </Grid>
    </>
  );
}

const BODY = { revenue: RevenueTab, members: MembersTab, dues: DuesTab, renewals: RenewalsTab };

export default function AnalyticsPanel({ tab }) {
  const [preset, setPreset] = useState("30d");
  const [[from, to], setRange] = useState(PRESETS[1].get());
  const [draft, setDraft] = useState([from, to]);
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const reqId = useRef(0);

  const pick = (p) => { setPreset(p.id); const r = p.get(); setRange(r); setDraft(r); };
  const customOk = draft[0] && draft[1] && draft[0] <= draft[1];

  useEffect(() => {
    const id = ++reqId.current;
    setState((s) => ({ ...s, loading: true, error: "" }));
    api.get(`/admin/analytics/${tab}`, { params: { from, to } })
      .then((res) => { if (id === reqId.current) setState({ loading: false, data: res.data.data, error: "" }); })
      .catch((e) => { if (id === reqId.current) setState({ loading: false, data: null, error: e?.response?.data?.message || "Could not load analytics." }); });
  }, [tab, from, to]);

  const Body = BODY[tab];
  const shown = useMemo(() => state.data, [state.data]);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {PRESETS.map((p) => (
          <button key={p.id} type="button" onClick={() => pick(p)} className={preset === p.id ? "btn-gold btn-sm" : "btn-ghost btn-sm"}>{p.label}</button>
        ))}
        <button type="button" onClick={() => setPreset("custom")} className={preset === "custom" ? "btn-gold btn-sm" : "btn-ghost btn-sm"}>Custom</button>
      </div>
      {preset === "custom" && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          <DateInput value={draft[0]} onChange={(v) => setDraft([v, draft[1]])} max={draft[1] || undefined} ariaLabel="From date" style={{ width: 150 }} />
          <span style={{ color: MUTED }}>to</span>
          <DateInput value={draft[1]} onChange={(v) => setDraft([draft[0], v])} min={draft[0] || undefined} ariaLabel="To date" style={{ width: 150 }} />
          <button type="button" className="btn-gold btn-sm" disabled={!customOk} onClick={() => setRange(draft)}>Apply</button>
        </div>
      )}
      <p style={{ color: MUTED, fontSize: 13, margin: "0 0 16px" }}>
        {isoToDmy(from)} to {isoToDmy(to)}
        {shown?.range && <> · compared with {isoToDmy(shown.range.previousFrom)} to {isoToDmy(shown.range.previousTo)}</>}
      </p>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: state.loading ? 0.5 : 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          {state.error ? (
            <p style={{ ...card, color: EMBER }}>{state.error}</p>
          ) : shown && shown.range ? (
            <Body d={shown} />
          ) : (
            <p style={{ color: MUTED }}>Loading…</p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
