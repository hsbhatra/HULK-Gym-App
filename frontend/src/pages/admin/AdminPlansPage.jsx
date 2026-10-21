// =============================================================================
// src/pages/admin/AdminPlansPage.jsx
// =============================================================================

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import AdminLayout from "../../components/layout/AdminLayout.jsx";
import PlanFormModal from "../../components/admin/PlanFormModal.jsx";
import ConfirmDialog from "../../components/ui/ConfirmDialog.jsx";
import {
  getAllPlansAdmin,
  updatePlanStatus,
  archivePlan,
} from "../../services/planService.js";

export default function AdminPlansPage() {
  const [plans, setPlans]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [confirmArchive, setConfirmArchive] = useState(null);

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await getAllPlansAdmin();
      setPlans(res.data.data.plans);
    } catch {
      toast.error("Failed to load plans.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (plan) => {
    const newStatus = plan.status === "active" ? "inactive" : "active";
    try {
      await updatePlanStatus(plan._id, newStatus);
      toast.success(`Plan is now ${newStatus}.`);
      fetchPlans();
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const handleArchive = async () => {
    try {
      const res = await archivePlan(confirmArchive._id);
      toast.success(res.data.message);
      setConfirmArchive(null);
      fetchPlans();
    } catch {
      toast.error("Failed to archive plan.");
    }
  };

  const statusBadge = (status) => {
    const colors = {
      active  : { bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.2)",  text: "#22c55e" },
      inactive: { bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.2)", text: "#f97316" },
      archived: { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", text: "rgba(255,255,255,0.4)" },
    };
    const c = colors[status] || colors.archived;
    return (
      <span style={{
        fontSize: "11px", padding: "3px 10px", borderRadius: "100px",
        background: c.bg, border: `1px solid ${c.border}`, color: c.text,
        fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px",
      }}>
        {status}
      </span>
    );
  };

  return (
    <AdminLayout>
      {showModal && (
        <PlanFormModal
          existingPlan={editingPlan}
          onClose={() => { setShowModal(false); setEditingPlan(null); }}
          onSaved={fetchPlans}
        />
      )}

      {confirmArchive && (
        <ConfirmDialog
          message={`Archive "${confirmArchive.name}"? Existing subscribers keep their plan, but no new members can purchase it.`}
          confirmLabel="Yes, archive"
          onConfirm={handleArchive}
          onCancel={() => setConfirmArchive(null)}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "4px" }}>Membership Plans</h1>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
            {plans.length} plan{plans.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <button onClick={() => { setEditingPlan(null); setShowModal(true); }} className="btn-gold"
          style={{ width: "auto", padding: "11px 22px", fontSize: "14px" }}>
          + Create Plan
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.3)" }}>
          Loading plans...
        </div>
      ) : plans.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.3)" }}>
          No plans created yet. Click "Create Plan" to get started.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {plans.map((plan) => (
            <div key={plan._id} style={{
              padding: "20px 24px", borderRadius: "14px",
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px", flexWrap: "wrap",
            }}>
              {/* Plan info */}
              <div style={{ flex: 1, minWidth: "200px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "700" }}>{plan.name}</h3>
                  {statusBadge(plan.status)}
                  {plan.isFeatured && (
                    <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "100px", background: "rgba(232,196,74,0.1)", border: "1px solid rgba(232,196,74,0.2)", color: "#e8c44a", fontWeight: "600" }}>
                      ★ Featured
                    </span>
                  )}
                </div>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginBottom: "10px" }}>{plan.description}</p>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  {plan.pricingTiers.map((t) => (
                    <span key={t.durationDays} style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                      {t.label}: <strong style={{ color: "#e8c44a" }}>₹{t.price / 100}</strong>
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {plan.status !== "archived" && (
                  <button onClick={() => handleToggleStatus(plan)}
                    style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: "12px", cursor: "pointer" }}>
                    {plan.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                )}
                <button onClick={() => { setEditingPlan(plan); setShowModal(true); }}
                  style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(232,196,74,0.2)", background: "rgba(232,196,74,0.08)", color: "#e8c44a", fontSize: "12px", cursor: "pointer" }}>
                  Edit
                </button>
                {plan.status !== "archived" && (
                  <button onClick={() => setConfirmArchive(plan)}
                    style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.2)", background: "transparent", color: "#ef4444", fontSize: "12px", cursor: "pointer" }}>
                    Archive
                  </button>
                )}
                {plan.status === "archived" && (
                  <button onClick={() => handleToggleStatus({ ...plan, status: "inactive" })}
                    style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(34,197,94,0.25)", background: "rgba(34,197,94,0.08)", color: "#22c55e", fontSize: "12px", cursor: "pointer" }}>
                    Restore
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}