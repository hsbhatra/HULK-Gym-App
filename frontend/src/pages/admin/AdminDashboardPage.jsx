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
import AdminLayout from "../../components/layout/AdminLayout.jsx";
import api from "../../services/api.js";
import toast from "react-hot-toast";

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatCurrency = (paise) =>
  `₹${(paise / 100).toLocaleString("en-IN")}`;

// Chart values are in paise → show compact rupees: ₹500, ₹12k, ₹1.5L
const formatAxisRupees = (paise) => {
  const r = paise / 100;
  if (r >= 100000) return `₹${+(r / 100000).toFixed(1)}L`;
  if (r >= 1000) return `₹${+(r / 1000).toFixed(1)}k`;
  return `₹${Math.round(r)}`;
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

const getDaysLeft = (endDate) =>
  Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));

const DONUT_COLORS = ["#e8c44a", "#a78bfa", "#22c55e", "#f97316", "#60a5fa"];

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, trend, loading }) {
  const trendPositive = trend > 0;
  // null = no baseline last month → a % change would be meaningless
  const trendNeutral  = trend == null || trend === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        padding     : "24px",
        borderRadius: "16px",
        background  : "rgba(255,255,255,0.02)",
        border      : "1px solid rgba(255,255,255,0.07)",
        display     : "flex",
        flexDirection: "column",
        gap         : "12px",
      }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: "24px" }}>{icon}</span>
        {!trendNeutral && (
          <span style={{
            fontSize  : "12px",
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
        <p style={{ fontSize: "28px", fontWeight: "800", letterSpacing: "-1px", margin: 0 }}>
          {value}
        </p>
      )}
      <div>
        <p style={{ fontSize: "13px", fontWeight: "600", color: "rgba(255,255,255,0.6)", margin: "0 0 2px" }}>
          {label}
        </p>
        {sub && (
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", margin: 0 }}>
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
      background  : "#1a1a1a",
      border      : "1px solid rgba(255,255,255,0.1)",
      borderRadius: "10px",
      padding     : "12px 16px",
    }}>
      <p style={{ margin: "0 0 4px", fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>{label}</p>
      <p style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#e8c44a" }}>
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
      background  : "#1a1a1a",
      border      : "1px solid rgba(255,255,255,0.1)",
      borderRadius: "10px",
      padding     : "12px 16px",
    }}>
      <p style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>
        {payload[0].name}: <span style={{ color: "#e8c44a" }}>{payload[0].value} members</span>
      </p>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const navigate      = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboard(); }, []);

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

  const kpis = data?.kpis || {};
  const sectionLabel = {
    fontSize     : "12px",
    fontWeight   : "700",
    color        : "rgba(255,255,255,0.4)",
    letterSpacing: "1px",
    textTransform: "uppercase",
    marginBottom : "14px",
  };

  return (
    <AdminLayout>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "4px" }}>Dashboard</h1>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <button onClick={fetchDashboard}
          style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: "13px", cursor: "pointer" }}>
          ↻ Refresh
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        <KpiCard
          icon="👥" label="Active Members"
          value={loading ? "—" : kpis.activeMembers ?? 0}
          sub={kpis.gracePeriodMembers ? `${kpis.gracePeriodMembers} in grace period` : `${kpis.totalMembers ?? 0} total registered`}
          loading={loading}
        />
        <KpiCard
          icon="💰" label="Revenue This Month"
          value={loading ? "—" : formatCurrency(kpis.revenueThisMonth ?? 0)}
          sub={`Last month: ${formatCurrency(kpis.revenueLastMonth ?? 0)}`}
          trend={kpis.revenueTrend}
          loading={loading}
        />
        <KpiCard
          icon="🆕" label="New Members This Month"
          value={loading ? "—" : kpis.newMembersThisMonth ?? 0}
          sub={`Last month: ${kpis.newMembersLastMonth ?? 0}`}
          trend={kpis.memberTrend}
          loading={loading}
        />
        <KpiCard
          icon="⏰" label="Expiring This Week"
          value={loading ? "—" : kpis.expiringThisWeek ?? 0}
          sub="Need renewal follow-up"
          loading={loading}
        />
      </div>

      {/* ── Refunds due (duplicate online payments) ── */}
      {data?.refundsDue?.length > 0 && (
        <div style={{ padding: "20px 24px", borderRadius: "16px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.25)", marginBottom: "28px" }}>
          <p style={{ ...sectionLabel, color: "#ef4444" }}>⚠ Refunds Due — Duplicate Payments</p>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", margin: "-6px 0 14px" }}>
            These members paid online while already having an active plan. No extra membership was given —
            click a payment ID to open it in Razorpay, then use "Issue refund".
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {data.refundsDue.map((p) => (
              <div key={p._id}
                onClick={() => navigate(`/admin/members/${p.userId?._id || ""}`)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", padding: "10px 14px", borderRadius: "10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer" }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: "600" }}>
                    {p.userId?.firstName} {p.userId?.lastName}
                  </p>
                  <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.4)", wordBreak: "break-all" }}>
                    {/* Direct link — Razorpay's own dashboard search is unreliable */}
                    <a
                      href={`https://dashboard.razorpay.com/app/payments/${p.razorpay?.paymentId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: "#60a5fa", textDecoration: "underline" }}
                    >
                      {p.razorpay?.paymentId} ↗
                    </a>{" "}
                    · {p.paidAt ? formatDate(p.paidAt) : ""}
                  </p>
                </div>
                <p style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#ef4444" }}>
                  {formatCurrency(p.amountPaid)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Charts ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "28px" }}
        className="dashboard-charts">

        {/* Revenue Bar Chart */}
        <div style={{ padding: "24px", borderRadius: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p style={sectionLabel}>Revenue — Last 6 Months</p>
          {loading ? (
            <div style={{ height: "220px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }} />
          ) : data?.revenueChart?.length === 0 ? (
            <div style={{ height: "220px", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.2)", fontSize: "13px" }}>
              No revenue data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.revenueChart || []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={formatAxisRupees} />
                <Tooltip content={<RevenueTooltip />} cursor={{ fill: "rgba(232,196,74,0.06)" }} />
                <Bar dataKey="revenue" fill="#e8c44a" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Plan Distribution Donut */}
        <div style={{ padding: "24px", borderRadius: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p style={sectionLabel}>Active Members by Plan</p>
          {loading ? (
            <div style={{ height: "220px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }} />
          ) : !data?.planDistribution?.length ? (
            <div style={{ height: "220px", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.2)", fontSize: "13px" }}>
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
                    <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>{value}</span>
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
        <div style={{ padding: "24px", borderRadius: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p style={sectionLabel}>Expiring This Week</p>
          {loading ? (
            <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "13px" }}>Loading...</p>
          ) : !data?.expiringSoon?.length ? (
            <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "13px" }}>No memberships expiring this week ✓</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {data.expiringSoon.map((sub) => {
                const days  = getDaysLeft(sub.endDate);
                const color = days <= 2 ? "#ef4444" : days <= 4 ? "#f97316" : "#e8c44a";
                return (
                  <div key={sub._id}
                    onClick={() => navigate(`/admin/members`)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: "10px", background: "rgba(255,255,255,0.02)", border: `1px solid ${color}22`, cursor: "pointer" }}>
                    <div>
                      <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: "600" }}>
                        {sub.userId?.firstName} {sub.userId?.lastName}
                      </p>
                      <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
                        {sub.planSnapshot?.planName} · {sub.planSnapshot?.durationLabel}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: "0 0 2px", fontSize: "12px", fontWeight: "700", color }}>
                        {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days`}
                      </p>
                      <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
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
        <div style={{ padding: "24px", borderRadius: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p style={sectionLabel}>Pending Installments</p>
          {loading ? (
            <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "13px" }}>Loading...</p>
          ) : !data?.pendingInstallments?.length ? (
            <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "13px" }}>No pending installments ✓</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {data.pendingInstallments.map((inst) => {
                const isOverdue = inst.status === "overdue";
                const color     = isOverdue ? "#ef4444" : "#f97316";
                return (
                  <div key={inst._id}
                    onClick={() => navigate(`/admin/members/${inst.userId?._id || ""}`)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: "10px", background: "rgba(255,255,255,0.02)", border: `1px solid ${color}22`, cursor: "pointer" }}>
                    <div>
                      <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: "600" }}>
                        {inst.userId?.firstName} {inst.userId?.lastName}
                      </p>
                      <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
                        Installment #{inst.installmentNumber}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: "700", color: "#e8c44a" }}>
                        {formatCurrency(inst.amountDue)}
                      </p>
                      <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "100px", background: `${color}18`, border: `1px solid ${color}33`, color, fontWeight: "600", textTransform: "uppercase" }}>
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
    </AdminLayout>
  );
}