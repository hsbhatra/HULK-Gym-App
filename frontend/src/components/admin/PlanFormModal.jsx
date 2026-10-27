// =============================================================================
// src/components/admin/PlanFormModal.jsx
// =============================================================================
// Reusable modal for creating AND editing membership plans.
// Pass `existingPlan` prop to pre-fill for editing, omit for creating new.
// =============================================================================

import { useState } from "react";
import toast from "react-hot-toast";
import { createPlan, updatePlan } from "../../services/planService.js";
import { Tip, InfoTip } from "../ui/Tip.jsx";
import { inputStyle, labelStyle } from "../ui/formStyles.js";
import Modal from "../ui/Modal.jsx";

const DURATION_LABELS = {
  30 : "Monthly",
  90 : "Quarterly",
  180: "Half-Yearly",
  365: "Annual",
};

const emptyTiers = [30, 90, 180, 365].map((days) => ({
  durationDays: days,
  label: DURATION_LABELS[days],
  price: "",
}));

export default function PlanFormModal({ existingPlan, onClose, onSaved }) {
  const isEditMode = !!existingPlan;

  const [form, setForm] = useState({
    name       : existingPlan?.name        || "",
    slug       : existingPlan?.slug        || "",
    description: existingPlan?.description || "",
    isFeatured : existingPlan?.isFeatured   || false,
    // Display order is set by dragging plans on the Plans page
  });

  const [tiers, setTiers] = useState(
    existingPlan?.pricingTiers?.map((t) => ({ ...t, price: t.price / 100 })) || emptyTiers
  );

  // Only used when creating; for existing plans the Plans page has the toggle
  const [showOnLanding, setShowOnLanding] = useState(false);

  const [features, setFeatures] = useState(existingPlan?.features || [""]);
  const [saving, setSaving]     = useState(false);
  const [errors, setErrors]     = useState({});


  const handleNameChange = (value) => {
    setForm({
      ...form,
      name: value,
      // Auto-generate slug from name if creating new (not editing)
      slug: isEditMode ? form.slug : value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    });
  };

  const handleTierPriceChange = (index, value) => {
    setTiers(tiers.map((t, i) => (i === index ? { ...t, price: value } : t)));
  };

  const handleFeatureChange = (index, value) => {
    const updated = [...features];
    updated[index] = value;
    setFeatures(updated);
  };

  const addFeature    = () => setFeatures([...features, ""]);
  const removeFeature = (index) => setFeatures(features.filter((_, i) => i !== index));

  const validate = () => {
    const e = {};
    if (!form.name.trim())        e.name = "Plan name is required";
    if (!form.slug.trim())        e.slug = "Slug is required";
    if (!form.description.trim()) e.description = "Description is required";
    tiers.forEach((t, i) => {
      if (!t.price || t.price <= 0) e[`tier_${i}`] = "Price required";
    });
    if (features.filter((f) => f.trim()).length === 0) {
      e.features = "At least one feature is required";
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        ...form,
        pricingTiers: tiers.map((t) => ({
          durationDays: t.durationDays,
          label       : t.label,
          price       : Math.round(parseFloat(t.price) * 100), // ₹ → paise
          // Keep any existing offer — rebuilding tiers without these fields
          // silently deleted offers every time a plan was edited.
          ...(t.offerPrice != null && { offerPrice: t.offerPrice }),
          ...(t.offerValidUntil != null && { offerValidUntil: t.offerValidUntil }),
        })),
        features: features.filter((f) => f.trim()),
        ...(!isEditMode && { showOnLanding }),
      };

      if (isEditMode) {
        await updatePlan(existingPlan._id, payload);
        toast.success("Plan updated successfully!");
      } else {
        await createPlan(payload);
        toast.success("Plan created successfully!");
      }

      onSaved();
      onClose();
    } catch (err) {
      const errs = err.response?.data?.errors;
      if (errs?.length) [...new Set(errs)].forEach((msg) => toast.error(msg));
      else toast.error(err.response?.data?.message || "Failed to save plan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal label={isEditMode ? "Edit plan" : "Create plan"} zIndex={200}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "19px", fontWeight: "700" }}>
            {isEditMode ? "Edit Plan" : "Create New Plan"}
          </h2>
          <button aria-label="Close" onClick={onClose} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.62)", fontSize: "20px", cursor: "pointer" }}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

          {/* Name */}
          <div>
            <label style={labelStyle}>Plan Name</label>
            <input style={inputStyle} value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Pro" />
            {errors.name && <p style={{ fontSize: "14px", color: "#ef4444", marginTop: "4px" }}>{errors.name}</p>}
          </div>

          {/* Slug */}
          <div>
            <label style={labelStyle}>Slug (URL identifier){" "}
              <InfoTip text="The plan's web address, for example /plans/pro. It is made from the name for you. Changing it breaks any old links to this plan." />
            </label>
            <input style={inputStyle} value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="e.g. pro" />
            {errors.slug && <p style={{ fontSize: "14px", color: "#ef4444", marginTop: "4px" }}>{errors.slug}</p>}
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <textarea style={{ ...inputStyle, resize: "vertical" }} rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short tagline shown on pricing card" />
            {errors.description && <p style={{ fontSize: "14px", color: "#ef4444", marginTop: "4px" }}>{errors.description}</p>}
          </div>

          {/* Pricing Tiers */}
          <div>
            <label style={labelStyle}>Pricing Tiers (₹)</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {tiers.map((t, i) => (
                <div key={t.durationDays}>
                  <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.62)", marginBottom: "6px" }}>{t.label} ({t.durationDays}d)</p>
                  <input type="number" style={inputStyle} value={t.price}
                    onChange={(e) => handleTierPriceChange(i, e.target.value)}
                    placeholder="0" />
                  {errors[`tier_${i}`] && <p style={{ fontSize: "13px", color: "#ef4444", marginTop: "4px" }}>{errors[`tier_${i}`]}</p>}
                  {(() => {
                    // Warn (don't block) when a longer plan costs more than
                    // paying monthly for the same period
                    const monthly = parseFloat(tiers.find((x) => x.durationDays === 30)?.price);
                    const price = parseFloat(t.price);
                    if (t.durationDays === 30 || !monthly || !price) return null;
                    const months = t.durationDays === 365 ? 12 : t.durationDays / 30;
                    const asMonthly = monthly * months;
                    return price >= asMonthly ? (
                      <p style={{ fontSize: "13px", color: "#f97316", marginTop: "4px" }}>
                        ⚠ Not cheaper than monthly (₹{asMonthly.toLocaleString("en-IN")})
                      </p>
                    ) : (
                      <p style={{ fontSize: "13px", color: "#22c55e", marginTop: "4px" }}>
                        Saves ₹{Math.round(asMonthly - price).toLocaleString("en-IN")} vs monthly
                      </p>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div>
            <label style={labelStyle}>Features</label>
            {features.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <input style={inputStyle} value={f}
                  onChange={(e) => handleFeatureChange(i, e.target.value)}
                  placeholder="e.g. Full gym access" />
                {features.length > 1 && (
                  <Tip touch={false} text="Remove this feature line.">
                    <button aria-label="Remove feature" type="button" onClick={() => removeFeature(i)}
                      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", borderRadius: "8px", padding: "0 14px", cursor: "pointer", height: "100%" }}>
                      ✕
                    </button>
                  </Tip>
                )}
              </div>
            ))}
            <button type="button" onClick={addFeature}
              style={{ background: "rgba(243,212,0,0.08)", border: "1px solid rgba(243,212,0,0.2)", color: "#f3d400", borderRadius: "8px", padding: "8px 16px", fontSize: "15px", cursor: "pointer" }}>
              + Add Feature
            </button>
            {errors.features && <p style={{ fontSize: "14px", color: "#ef4444", marginTop: "4px" }}>{errors.features}</p>}
          </div>

          {/* Featured toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
            <input type="checkbox" checked={form.isFeatured}
              onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
              style={{ width: "16px", height: "16px", accentColor: "#f3d400" }} />
            <span style={{ fontSize: "15px", color: "rgba(255,255,255,0.6)" }}>Mark as "Most Popular" (featured)</span>
            <InfoTip text="Shows this plan highlighted in yellow with a 'most picked' tag on the website." />
          </label>

          {/* Landing page toggle (new plans only) */}
          {!isEditMode && (
            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
              <input type="checkbox" checked={showOnLanding}
                onChange={(e) => setShowOnLanding(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "#f3d400" }} />
              <span style={{ fontSize: "15px", color: "rgba(255,255,255,0.6)" }}>Show on the landing page</span>
              <InfoTip text="Off (default): the plan goes to 'Other plans'. It can still be given at the desk or opened by its direct link, but is not listed on the home page. You can change this later on the Plans page." />
            </label>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1, padding: "12px" }}>
              Cancel
            </button>
            <button type="submit" className="btn-gold" disabled={saving} style={{ flex: 1 }}>
              {saving ? "Saving..." : isEditMode ? "Save Changes" : "Create Plan"}
            </button>
          </div>
        </form>
    </Modal>
  );
}