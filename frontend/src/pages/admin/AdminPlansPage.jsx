// =============================================================================
// src/pages/admin/AdminPlansPage.jsx
// =============================================================================
// Three lists: "Landing page plans" (active, shown on the home page, in the
// order shown here), "Other plans" (active — given at the desk or opened by
// direct link — but not on the home page) and "Band plans" (switched off).
// Each active list has its own order: drag the handle or use ↑ / ↓ — saved
// instantly. One "Active" switch turns a plan on or off (there is no Archive).
// =============================================================================

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion, Reorder, useDragControls, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import toast from "react-hot-toast";
import AdminLayout from "../../components/layout/AdminLayout.jsx";
import PlanFormModal from "../../components/admin/PlanFormModal.jsx";
import ConfirmDialog from "../../components/ui/ConfirmDialog.jsx";
import { Tip } from "../../components/ui/Tip.jsx";
import {
  getAllPlansAdmin,
  updatePlanStatus,
  reorderPlans,
  setLandingVisibility,
} from "../../services/planService.js";

const TABS = [
  { key: "landing", label: "Landing page plans" },
  { key: "other", label: "Other plans" },
  { key: "band", label: "Band plans" },
];
const isLanding = (p) => p.showOnLanding !== false;
const isOn = (p) => p.status === "active";
const inTab = (p, tab) =>
  tab === "band" ? !isOn(p) : isOn(p) && (tab === "landing" ? isLanding(p) : !isLanding(p));

const sameOrder = (a, b) => a.length === b.length && a.every((p, i) => p._id === b[i]._id);

const offBadge = (
  <span style={{
    fontSize: "13px", padding: "3px 10px", borderRadius: "100px",
    background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", color: "#f97316",
    fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px",
  }}>
    Band
  </span>
);

function PlanRow({ plan, index, count, busy, reorderable, onMove, onDragEnd, onToggle, onEdit, onLanding }) {
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
      {reorderable && <div className="plan-order">
        <Tip touch={false} text="Press and drag to change the order plans appear on the website.">
          <button
            type="button"
            className="plan-handle"
            aria-label={`Drag to reorder ${plan.name}`}
            disabled={busy}
            onPointerDown={(e) => !busy && controls.start(e)}
          >
            <GripVertical size={20} aria-hidden="true" />
          </button>
        </Tip>
        <div className="plan-arrows">
          <Tip touch={false} text="Move this plan one place up on the website.">
            <button type="button" aria-label={`Move ${plan.name} up`} disabled={busy || index === 0} onClick={() => onMove(index, -1)}>
              <ArrowUp size={16} aria-hidden="true" />
            </button>
          </Tip>
          <Tip touch={false} text="Move this plan one place down on the website.">
            <button type="button" aria-label={`Move ${plan.name} down`} disabled={busy || index === count - 1} onClick={() => onMove(index, 1)}>
              <ArrowDown size={16} aria-hidden="true" />
            </button>
          </Tip>
        </div>
      </div>}

      {/* Plan info */}
      <div style={{ flex: 1, minWidth: "200px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
          <h3 style={{ fontSize: "17px", fontWeight: "700" }}>{plan.name}</h3>
          {!isOn(plan) && offBadge}
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
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <Tip text={isOn(plan)
          ? "Plan is ON: it is on the website and can be given at the desk. Switch off to take it away — members who already have it keep it."
          : "Plan is OFF: nobody can buy it or be given it. Switch on to bring it back."}>
          <button
            type="button"
            role="switch"
            aria-checked={isOn(plan)}
            aria-label={`${plan.name} is ${isOn(plan) ? "on" : "off"}`}
            disabled={busy}
            onClick={() => onToggle(plan)}
            className="plan-switch"
            data-on={isOn(plan)}
          >
            <span className="plan-switch-track"><span className="plan-switch-knob" /></span>
            <span className="plan-switch-label">Active</span>
          </button>
        </Tip>
        {isOn(plan) && (
          <Tip text={isLanding(plan)
            ? "This plan is listed on the landing page. Switch off to move it to 'Other plans' — it stays active and can still be given at the desk or opened by its link."
            : "This plan is not listed on the landing page. Switch on to list it there."}>
            <button
              type="button"
              role="switch"
              aria-checked={isLanding(plan)}
              aria-label={`Show ${plan.name} on the landing page`}
              disabled={busy}
              onClick={() => onLanding(plan)}
              className="plan-switch"
              data-on={isLanding(plan)}
            >
              <span className="plan-switch-track"><span className="plan-switch-knob" /></span>
              <span className="plan-switch-label">On landing page</span>
            </button>
          </Tip>
        )}
        <button onClick={() => onEdit(plan)}
          style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(243,212,0,0.2)", background: "rgba(243,212,0,0.08)", color: "#f3d400", fontSize: "14px", cursor: "pointer" }}>
          Edit
        </button>
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
  const [confirmOff, setConfirmOff] = useState(null);
  const [confirmHide, setConfirmHide] = useState(null);
  const [tab, setTab] = useState("landing");
  const reduceMotion = useReducedMotion();

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

  const landingPlans = plans.filter((p) => inTab(p, "landing"));
  const otherPlans = plans.filter((p) => inTab(p, "other"));
  const bandPlans = plans.filter((p) => inTab(p, "band"));
  const tabPlans = tab === "landing" ? landingPlans : tab === "other" ? otherPlans : bandPlans;

  // Puts one list's new order back into the slots that list already holds
  const mergeTab = (list, tabKey, next) => {
    const queue = [...next];
    return list.map((p) => (inTab(p, tabKey) ? queue.shift() : p));
  };

  const saveOrder = async (tabKey) => {
    const next = plansRef.current.filter((p) => inTab(p, tabKey));
    const before = savedRef.current.filter((p) => inTab(p, tabKey));
    if (sameOrder(next, before)) return;
    const previous = savedRef.current;
    setSaving(true);
    try {
      // The server wants the whole group; switched-off plans of that group follow, in their current order
      const off = plansRef.current.filter((p) => !isOn(p) && (tabKey === "landing" ? isLanding(p) : !isLanding(p)));
      const res = await reorderPlans([...next, ...off].map((p) => p._id), tabKey);
      savedRef.current = res.data.data.plans;
      setPlans(res.data.data.plans);
      toast.success(tabKey === "landing" ? "Order saved. The landing page shows plans in this order." : "Order saved.");
    } catch (err) {
      setPlans(previous); // put it back the way it was
      toast.error(err.response?.data?.message || "Couldn't save the new order.");
    } finally {
      setSaving(false);
    }
  };

  const move = (index, dir) => {
    const list = plansRef.current.filter((p) => inTab(p, tab));
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    const merged = mergeTab(plansRef.current, tab, list);
    plansRef.current = merged;
    setPlans(merged);
    saveOrder(tab);
  };

  const applyStatus = async (plan, newStatus) => {
    setSaving(true);
    try {
      await updatePlanStatus(plan._id, newStatus);
      toast.success(newStatus === "active" ? `"${plan.name}" is ON.` : `"${plan.name}" is OFF. Members who already have it keep it.`);
      await fetchPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update the plan.");
    } finally {
      setSaving(false);
      setConfirmOff(null);
    }
  };

  // Switching ON is instant; switching OFF asks first.
  const handleToggleStatus = (plan) => {
    if (!isOn(plan)) return applyStatus(plan, "active");
    // Quick check here; the server makes the final decision
    const othersOnLanding = plans.filter((p) => p._id !== plan._id && isLanding(p) && isOn(p));
    if (isLanding(plan) && othersOnLanding.length === 0) {
      return toast.error(`"${plan.name}" is the only active plan on the landing page. Put another active plan there first.`);
    }
    setConfirmOff(plan);
  };

  // Landing page on/off. Showing is instant; hiding asks first.
  const applyLanding = async (plan, show) => {
    setSaving(true);
    try {
      await setLandingVisibility(plan._id, show);
      toast.success(show ? `"${plan.name}" is now on the landing page.` : `"${plan.name}" moved to Other plans.`);
      await fetchPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't change the landing page setting.");
    } finally {
      setSaving(false);
      setConfirmHide(null);
    }
  };

  const handleLanding = (plan) => {
    if (!isLanding(plan)) return applyLanding(plan, true);
    // Quick check here; the server makes the final decision
    const othersOnLanding = plans.filter((p) => p._id !== plan._id && isLanding(p) && p.status === "active");
    if (plan.status === "active" && othersOnLanding.length === 0) {
      return toast.error(`"${plan.name}" is the only active plan on the landing page. Put another active plan there first.`);
    }
    setConfirmHide(plan);
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

      {confirmOff && (
        <ConfirmDialog
          message={`Switch off "${confirmOff.name}"? It leaves the website and can't be given at the desk. Members who already have it keep it. You can switch it on again any time.`}
          confirmLabel="Yes, switch off"
          onConfirm={() => applyStatus(confirmOff, "inactive")}
          onCancel={() => setConfirmOff(null)}
        />
      )}

      {confirmHide && (
        <ConfirmDialog
          message={`Remove "${confirmHide.name}" from the landing page? It moves to Other plans. It stays ${confirmHide.status === "active" ? "active — you can still give it at the desk and people with its link can open and buy it" : confirmHide.status} — it just won't be listed on the home page.`}
          confirmLabel="Yes, hide from landing page"
          onConfirm={() => applyLanding(confirmHide, false)}
          onCancel={() => setConfirmHide(null)}
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

      <div role="tablist" aria-label="Plan lists" className="plan-tabs">
        {TABS.map((t) => {
          const count = t.key === "landing" ? landingPlans.length : t.key === "other" ? otherPlans.length : bandPlans.length;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              id={`plans-tab-${t.key}`}
              aria-selected={active}
              aria-controls="plans-panel"
              type="button"
              className="plan-tab"
              data-active={active}
              onClick={() => setTab(t.key)}
            >
              {active && (
                <motion.span
                  layoutId="plan-tab-pill"
                  className="plan-tab-pill"
                  transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="plan-tab-text">{t.label} <span className="plan-tab-count">{count}</span></span>
            </button>
          );
        })}
      </div>

      <p className="plan-order-hint">
        {tab === "landing"
          ? "These plans are listed on the landing page, in this order (top first)."
          : tab === "other"
            ? "These plans are not listed on the landing page. They stay active, so you can still give them at the desk or share their link."
            : "These plans are switched off. Nobody can buy them or be given them. Switch one on to bring it back."}
        {tab !== "band" && tabPlans.length > 1 && (
          <>
            <span className="plan-hint-wide"> Drag <GripVertical size={15} aria-hidden="true" /> or use the arrows to change the order — it saves on its own.</span>
            <span className="plan-hint-narrow"> Change the order with the arrows — it saves on its own.</span>
          </>
        )}
        {saving && <span className="plan-saving"> Saving…</span>}
      </p>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.55)" }}>
          Loading plans...
        </div>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            id="plans-panel"
            role="tabpanel"
            aria-labelledby={`plans-tab-${tab}`}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
          >
            {tabPlans.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 16px", color: "rgba(255,255,255,0.55)" }}>
                {plans.length === 0
                  ? 'No plans created yet. Click "Create Plan" to get started.'
                  : tab === "landing"
                    ? "No plans are on the landing page. Switch one on from Other plans."
                    : tab === "other"
                      ? "No other plans. Every active plan is listed on the landing page."
                      : "No plans are switched off."}
              </div>
            ) : (
              <Reorder.Group
                axis="y"
                values={tabPlans}
                onReorder={(next) => {
                  const merged = mergeTab(plansRef.current, tab, next);
                  plansRef.current = merged;
                  setPlans(merged);
                }}
                style={{ display: "flex", flexDirection: "column", gap: "12px", listStyle: "none", padding: 0, margin: 0 }}
              >
                {tabPlans.map((plan, index) => (
                  <PlanRow
                    key={plan._id}
                    plan={plan}
                    index={index}
                    count={tabPlans.length}
                    busy={saving}
                    reorderable={tab !== "band"}
                    onMove={move}
                    onDragEnd={() => saveOrder(tab)}
                    onToggle={handleToggleStatus}
                    onEdit={(p) => { setEditingPlan(p); setShowModal(true); }}
                    onLanding={handleLanding}
                  />
                ))}
              </Reorder.Group>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </AdminLayout>
  );
}
