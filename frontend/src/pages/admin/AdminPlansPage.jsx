// =============================================================================
// src/pages/admin/AdminPlansPage.jsx
// =============================================================================
// Plans appear on the website in the order shown here (top = first).
// Reorder by dragging the handle or with the ↑ / ↓ buttons — saved instantly.
// =============================================================================

import { useState, useEffect, useRef } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import toast from "react-hot-toast";
import AdminLayout from "../../components/layout/AdminLayout.jsx";
import PlanFormModal from "../../components/admin/PlanFormModal.jsx";
import ConfirmDialog from "../../components/ui/ConfirmDialog.jsx";
import {
  getAllPlansAdmin,
  updatePlanStatus,
  archivePlan,
  reorderPlans,
} from "../../services/planService.js";

const sameOrder = (a, b) => a.length === b.length && a.every((p, i) => p._id === b[i]._id);

const statusBadge = (status) => {
  const colors = {
    active  : { bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.2)",  text: "#22c55e" },
    inactive: { bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.2)", text: "#f97316" },
    archived: { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", text: "rgba(255,255,255,0.4)" },
  };
  const c = colors[status] || colors.archived;
  return (
    <span style={{
      fontSize: "13px", padding: "3px 10px", borderRadius: "100px",
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px",
    }}>
      {status}
    </span>
  );
};

function PlanRow({ plan, index, count, busy, onMove, onDragEnd, onToggle, onEdit, onArchive }) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={plan}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className="plan-row"
      style={{ position: "relative" }}
      whileDrag={{ scale: 1.01, boxShadow: "0 18px 40px rgba(0,0,0,0.55)", zIndex: 5 }}
    >
      {/* Order controls */}
      <div className="plan-order">
        <button
          type="button"
          className="plan-handle"
          aria-label={`Drag to reorder ${plan.name}`}
          title="Drag to reorder"
          disabled={busy}
          onPointerDown={(e) => !busy && controls.start(e)}
        >
          <GripVertical size={20} aria-hidden="true" />
        </button>
        <span className="plan-pos" aria-label={`Position ${index + 1}`}>{index + 1}</span>
        <div className="plan-arrows">
          <button type="button" aria-label={`Move ${plan.name} up`} disabled={busy || index === 0} onClick={() => onMove(index, -1)}>
            <ArrowUp size={16} aria-hidden="true" />
          </button>
          <button type="button" aria-label={`Move ${plan.name} down`} disabled={busy || index === count - 1} onClick={() => onMove(index, 1)}>
            <ArrowDown size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Plan info */}
      <div style={{ flex: 1, minWidth: "200px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
          <h3 style={{ fontSize: "17px", fontWeight: "700" }}>{plan.name}</h3>
          {statusBadge(plan.status)}
          {plan.isFeatured && (
            <span style={{ fontSize: "13px", padding: "3px 10px", borderRadius: "100px", background: "rgba(243,212,0,0.1)", border: "1px solid rgba(243,212,0,0.2)", color: "#f3d400", fontWeight: "600" }}>
              ★ Featured
            </span>
          )}
        </div>
        <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.62)", marginBottom: "10px" }}>{plan.description}</p>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          {plan.pricingTiers.map((t) => (
            <span key={t.durationDays} style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>
              {t.label}: <strong style={{ color: "#f3d400" }}>₹{t.price / 100}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {plan.status !== "archived" && (
          <button onClick={() => onToggle(plan)}
            style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: "14px", cursor: "pointer" }}>
            {plan.status === "active" ? "Deactivate" : "Activate"}
          </button>
        )}
        <button onClick={() => onEdit(plan)}
          style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(243,212,0,0.2)", background: "rgba(243,212,0,0.08)", color: "#f3d400", fontSize: "14px", cursor: "pointer" }}>
          Edit
        </button>
        {plan.status !== "archived" && (
          <button onClick={() => onArchive(plan)}
            style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.2)", background: "transparent", color: "#ef4444", fontSize: "14px", cursor: "pointer" }}>
            Archive
          </button>
        )}
        {plan.status === "archived" && (
          <button onClick={() => onToggle({ ...plan, status: "inactive" })}
            style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(34,197,94,0.25)", background: "rgba(34,197,94,0.08)", color: "#22c55e", fontSize: "14px", cursor: "pointer" }}>
            Restore
          </button>
        )}
      </div>
    </Reorder.Item>
  );
}

export default function AdminPlansPage() {
  const [plans, setPlans]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [confirmArchive, setConfirmArchive] = useState(null);

  // Latest list (drag callbacks fire after state updates) + last saved order
  const plansRef = useRef([]);
  const savedRef = useRef([]);
  useEffect(() => { plansRef.current = plans; }, [plans]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await getAllPlansAdmin();
      setPlans(res.data.data.plans);
      savedRef.current = res.data.data.plans;
    } catch {
      toast.error("Failed to load plans.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  const saveOrder = async (next) => {
    if (sameOrder(next, savedRef.current)) return;
    const previous = savedRef.current;
    setSaving(true);
    try {
      const res = await reorderPlans(next.map((p) => p._id));
      savedRef.current = res.data.data.plans;
      setPlans(res.data.data.plans);
      toast.success("Order saved. The website shows plans in this order.");
    } catch (err) {
      setPlans(previous); // put it back the way it was
      toast.error(err.response?.data?.message || "Couldn't save the new order.");
    } finally {
      setSaving(false);
    }
  };

  const move = (index, dir) => {
    const next = [...plansRef.current];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setPlans(next);
    saveOrder(next);
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title">Membership Plans</h1>
          <p style={{ fontSize: "16px", color: "var(--text-2)" }}>
            {plans.length} plan{plans.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <button onClick={() => { setEditingPlan(null); setShowModal(true); }} className="btn-gold"
          style={{ width: "auto", padding: "11px 22px", fontSize: "16px" }}>
          + Create Plan
        </button>
      </div>

      {plans.length > 1 && (
        <p className="plan-order-hint">
          The website shows plans in this order, top first. Drag <GripVertical size={15} aria-hidden="true" /> or use the arrows to change it — it saves on its own.
          {saving && <span className="plan-saving"> Saving…</span>}
        </p>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.55)" }}>
          Loading plans...
        </div>
      ) : plans.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.55)" }}>
          No plans created yet. Click "Create Plan" to get started.
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={plans}
          onReorder={(next) => { plansRef.current = next; setPlans(next); }}
          style={{ display: "flex", flexDirection: "column", gap: "12px", listStyle: "none", padding: 0, margin: 0 }}
        >
          {plans.map((plan, index) => (
            <PlanRow
              key={plan._id}
              plan={plan}
              index={index}
              count={plans.length}
              busy={saving}
              onMove={move}
              onDragEnd={() => saveOrder(plansRef.current)}
              onToggle={handleToggleStatus}
              onEdit={(p) => { setEditingPlan(p); setShowModal(true); }}
              onArchive={setConfirmArchive}
            />
          ))}
        </Reorder.Group>
      )}
    </AdminLayout>
  );
}
