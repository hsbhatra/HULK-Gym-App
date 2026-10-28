// =============================================================================
// src/pages/admin/AdminDashboardPage.jsx
// =============================================================================

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import AnalyticsPanel from "../../components/admin/AnalyticsPanel.jsx";
import AdminLayout from "../../components/layout/AdminLayout.jsx";
import api from "../../services/api.js";
import toast from "react-hot-toast";
import { ArrowRight, CalendarClock, IndianRupee, RefreshCw, TriangleAlert, UserPlus, Users } from "lucide-react";
import { inr, formatDate } from "../../utils/format.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatCurrency = inr;

// Chart values are in paise → show compact rupees: ₹500, ₹12k, ₹1.5L
const formatAxisRupees = (paise) => {
  const r = paise / 100;
  if (r >= 100000) return `₹${+(r / 100000).toFixed(1)}L`;
  if (r >= 1000) return `₹${+(r / 1000).toFixed(1)}k`;
  return `₹${Math.round(r)}`;
};


const getDaysLeft = (endDate) =>
  Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));

// Brand palette — yellow, ember, then steel tones (distinct in lightness, not hue alone)
const DONUT_COLORS = ["#f3d400", "#e5482b", "#edede8", "#8c8c86", "#9e2c17"];

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, trend, loading, accent = false }) {
  const trendPositive = trend > 0;
  // null = no baseline last month → a % change would be meaningless
  const trendNeutral  = trend == null || trend === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        padding     : "22px",
        borderRadius: "var(--radius-card)",
        background  : "var(--iron-850)",
        border      : "1px solid #26262a",
        display     : "flex",
        flexDirection: "column",
        gap         : "12px",
      }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span className="perk-icon" style={{ width: "40px", height: "40px", borderRadius: "10px" }}>{icon}</span>
        {!trendNeutral && (
          <span style={{
            fontSize  : "14px",
            fontWeight: "600",
            padding   : "3px 8px",
            borderRadius: "100px",
            background: trendPositive ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            color     : trendPositive ? "#22c55e" : "#ef4444",
          }}>
            {trendPositive ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      {loading ? (
        <div style={{ height: "32px", background: "rgba(255,255,255,0.05)", borderRadius: "6px" }} />
      ) : (
        <p className="font-display" style={{ fontSize: "clamp(36px, 4vw, 48px)", lineHeight: 1, margin: 0, color: accent ? "var(--yellow)" : "var(--text-1)" }}>
          {value}
        </p>
      )}
      <div>
        <p style={{ fontSize: "15px", fontWeight: "600", color: "rgba(255,255,255,0.6)", margin: "0 0 2px" }}>
          {label}
        </p>
        {sub && (
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", margin: 0 }}>
            {sub}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ── Custom Tooltip for Bar Chart ──────────────────────────────────────────────

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background  : "var(--iron-850)",
      border      : "1px solid rgba(255,255,255,0.1)",
      borderRadius: "10px",
      padding     : "12px 16px",
    }}>
      <p style={{ margin: "0 0 4px", fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>{label}</p>
      <p style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#f3d400" }}>
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

// ── Custom Tooltip for Donut ──────────────────────────────────────────────────

function PlanTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background  : "var(--iron-850)",
      border      : "1px solid rgba(255,255,255,0.1)",
      borderRadius: "10px",
      padding     : "12px 16px",
    }}>
      <p style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>
        {payload[0].name}: <span style={{ color: "#f3d400" }}>{payload[0].value} members</span>
      </p>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const navigate      = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("overview");


  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/dashboard");
      setData(res.data.data);
    } catch {
      toast.error("Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const kpis = data?.kpis || {};
  const sectionLabel = {
    fontSize     : "14px",
    fontWeight   : "700",
    color        : "rgba(255,255,255,0.62)",
    letterSpacing: "1px",
    textTransform: "uppercase",
    marginBottom : "14px",
  };

  return (
    <AdminLayout>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "28px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: "8px" }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <h1 className="page-title">Floor report</h1>
        </div>
        <button type="button" onClick={fetchDashboard} className="btn-ghost btn-sm" disabled={loading}>
          <RefreshCw size={15} aria-hidden="true" /> Refresh
        </button>
      </div>

      {data?.refundsDue?.length > 0 && (
        <button type="button" className="refund-alert" onClick={() => navigate("/admin/refunds")}>
          <TriangleAlert size={20} aria-hidden="true" />
          <span>
            <strong>
              {data.refundsDue.length} refund{data.refundsDue.length > 1 ? "s" : ""} pending
            </strong>{" "}
            — {data.refundsDue.length > 1 ? "members" : "a member"} paid twice. Review and refund
          </span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      )}

      {/* Tabs: Overview is the original dashboard, the rest are analytics */}
      <div role="tablist" aria-label="Dashboard sections" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 20 }}>
        {[["overview", "Overview"], ["revenue", "Revenue"], ["members", "Members"]].map(([id, text]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={tab === id ? "btn-gold btn-sm" : "btn-ghost btn-sm"} style={{ flexShrink: 0 }}>{text}</button>
        ))}
      </div>

      {tab !== "overview" ? (
        <AnalyticsPanel tab={tab} />
      ) : (
      <>
      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))", gap: "12px", marginBottom: "28px" }}>
        <KpiCard
          accent
          icon={<Users size={20} aria-hidden="true" />} label="Active Members"
          value={loading ? "—" : kpis.activeMembers ?? 0}
          sub={kpis.gracePeriodMembers ? `${kpis.gracePeriodMembers} in grace period` : `${kpis.totalMembers ?? 0} total registered`}
          loading={loading}
        />
        <KpiCard
          icon={<IndianRupee size={22} aria-hidden="true" />} label="Revenue This Month"
          value={loading ? "—" : formatCurrency(kpis.revenueThisMonth ?? 0)}
          sub={`Last month: ${formatCurrency(kpis.revenueLastMonth ?? 0)}`}
          trend={kpis.revenueTrend}
          loading={loading}
        />
        <KpiCard
          icon={<UserPlus size={22} aria-hidden="true" />} label="New Members This Month"
          value={loading ? "—" : kpis.newMembersThisMonth ?? 0}
          sub={`Last month: ${kpis.newMembersLastMonth ?? 0}`}
          trend={kpis.memberTrend}
          loading={loading}
        />
        <KpiCard
          icon={<CalendarClock size={22} aria-hidden="true" />} label="Expiring This Week"
          value={loading ? "—" : kpis.expiringThisWeek ?? 0}
          sub="Need renewal follow-up"
          loading={loading}
        />
      </div>

      {/* ── Refunds due (duplicate online payments) ── */}
      {/* ── Charts ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "28px" }}
        className="dashboard-charts">

        {/* Revenue Bar Chart */}
        <div style={{ padding: "24px", borderRadius: "16px", background: "var(--iron-850)", border: "1px solid #26262a" }}>
          <p style={sectionLabel}>Revenue — Last 6 Months</p>
          {loading ? (
            <div style={{ height: "220px", background: "var(--iron-850)", borderRadius: "8px" }} />
          ) : data?.revenueChart?.length === 0 ? (
            <div style={{ height: "220px", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)", fontSize: "15px" }}>
              No revenue data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.revenueChart || []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: "#8c8c86", fontSize: 13 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8c8c86", fontSize: 13 }} axisLine={false} tickLine={false}
                  tickFormatter={formatAxisRupees} />
                <Tooltip content={<RevenueTooltip />} cursor={{ fill: "rgba(243,212,0,0.06)" }} />
                <Bar dataKey="revenue" fill="#f3d400" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Plan Distribution Donut */}
        <div style={{ padding: "24px", borderRadius: "16px", background: "var(--iron-850)", border: "1px solid #26262a" }}>
          <p style={sectionLabel}>Active Members by Plan</p>
          {loading ? (
            <div style={{ height: "220px", background: "var(--iron-850)", borderRadius: "8px" }} />
          ) : !data?.planDistribution?.length ? (
            <div style={{ height: "220px", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)", fontSize: "15px" }}>
              No active subscriptions yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.planDistribution}
                  dataKey="count"
                  nameKey="plan"
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={90}
                  paddingAngle={3}>
                  {data.planDistribution.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PlanTooltip />} />
                <Legend
                  iconType="circle" iconSize={8}
                  formatter={(value) => (
                    <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px" }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Tables ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}
        className="dashboard-tables">

        {/* Expiring Soon */}
        <div style={{ padding: "24px", borderRadius: "16px", background: "var(--iron-850)", border: "1px solid #26262a" }}>
          <p style={sectionLabel}>Expiring This Week</p>
          {loading ? (
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "15px" }}>Loading...</p>
          ) : !data?.expiringSoon?.length ? (
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "15px" }}>No memberships expiring this week ✓</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {data.expiringSoon.map((sub) => {
                const days  = getDaysLeft(sub.endDate);
                const color = days <= 2 ? "#ef4444" : days <= 4 ? "#f97316" : "#f3d400";
                return (
                  <div key={sub._id}
                    onClick={() => navigate(`/admin/members`)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: "10px", background: "var(--iron-850)", border: `1px solid ${color}22`, cursor: "pointer" }}>
                    <div>
                      <p style={{ margin: "0 0 2px", fontSize: "15px", fontWeight: "600" }}>
                        {sub.userId?.firstName} {sub.userId?.lastName}
                      </p>
                      <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>
                        {sub.planSnapshot?.planName} · {sub.planSnapshot?.durationLabel}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: "0 0 2px", fontSize: "14px", fontWeight: "700", color }}>
                        {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days`}
                      </p>
                      <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>
                        {formatDate(sub.endDate)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Installments */}
        <div style={{ padding: "24px", borderRadius: "16px", background: "var(--iron-850)", border: "1px solid #26262a" }}>
          <p style={sectionLabel}>Pending Installments</p>
          {loading ? (
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "15px" }}>Loading...</p>
          ) : !data?.pendingInstallments?.length ? (
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "15px" }}>No pending installments ✓</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {data.pendingInstallments.map((inst) => {
                const isOverdue = inst.status === "overdue";
                const color     = isOverdue ? "#ef4444" : "#f97316";
                return (
                  <div key={inst._id}
                    onClick={() => navigate(`/admin/members/${inst.userId?._id || ""}`)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: "10px", background: "var(--iron-850)", border: `1px solid ${color}22`, cursor: "pointer" }}>
                    <div>
                      <p style={{ margin: "0 0 2px", fontSize: "15px", fontWeight: "600" }}>
                        {inst.userId?.firstName} {inst.userId?.lastName}
                      </p>
                      <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>
                        Installment #{inst.installmentNumber}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: "0 0 2px", fontSize: "15px", fontWeight: "700", color: "#f3d400" }}>
                        {formatCurrency(inst.amountDue)}
                      </p>
                      <span style={{ fontSize: "13px", padding: "2px 8px", borderRadius: "100px", background: `${color}18`, border: `1px solid ${color}33`, color, fontWeight: "600", textTransform: "uppercase" }}>
                        {inst.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
      </>
      )}
    </AdminLayout>
  );
}
