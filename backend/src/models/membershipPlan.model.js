// =============================================================================
// src/models/membershipPlan.model.js
// =============================================================================

import mongoose from "mongoose";
import { PLAN_STATUS, PLAN_DURATIONS } from "../utils/constants.js";

// =============================================================================
// Pricing Tier Sub-Schema
// =============================================================================
// Each plan has 4 pricing tiers (monthly, quarterly, half-yearly, annual).
// Prices stored in PAISE (₹1 = 100 paise) to avoid floating point errors.
// offerPrice: discounted price shown with strikethrough on frontend.
// offerValidUntil: offer auto-expires after this date.
// =============================================================================

const pricingTierSchema = new mongoose.Schema(
  {
    durationDays: {
      type: Number,
      required: true,
      enum: {
        values: Object.values(PLAN_DURATIONS).map((d) => d.days),
        message: "Duration must be 30, 90, 180, or 365 days",
      },
    },

    label: {
      type: String,
      required: true,
      trim: true,
      // e.g. "Monthly", "Quarterly", "Half-Yearly", "Annual"
    },

    price: {
      type: Number,
      required: true,
      min: [100, "Price must be at least ₹1 (100 paise)"],
      // Stored in paise. ₹1,500 = 150000 paise
    },

    offerPrice: {
      type: Number,
      default: null,
      // null = no active offer
      // If set, must be less than price
    },

    offerValidUntil: {
      type: Date,
      default: null,
      // After this date, offerPrice is ignored even if set
    },
  },
  { _id: false }, // no separate _id for sub-documents
);

// =============================================================================
// MembershipPlan Schema
// =============================================================================

const membershipPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Plan name is required"],
      trim: true,
      maxlength: [50, "Plan name cannot exceed 50 characters"],
      // e.g. "Basic", "Pro", "Elite"
    },

    slug: {
      type: String,
      required: [true, "Plan slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      // e.g. "basic", "pro", "elite"
      // Used in URLs: /plans/basic
      match: [
        /^[a-z0-9-]+$/,
        "Slug can only contain lowercase letters, numbers, and hyphens",
      ],
    },

    description: {
      type: String,
      required: [true, "Plan description is required"],
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"],
      // Short tagline shown on pricing card
    },

    // The 4 pricing tiers for this plan
    pricingTiers: {
      type: [pricingTierSchema],
      required: true,
      validate: {
        validator: function (tiers) {
          // Must have exactly 4 tiers
          if (tiers.length !== 4) return false;
          // Each duration must appear exactly once
          // IMPORTANT: sort with a compare function — default .sort() sorts as strings
          const durations = tiers
            .map((t) => t.durationDays)
            .sort((a, b) => a - b);
          const required = [30, 90, 180, 365];
          return JSON.stringify(durations) === JSON.stringify(required);
        },
        message:
          "Plan must have exactly 4 pricing tiers: 30, 90, 180, and 365 days",
      },
    },

    // What this plan includes — shown as checklist on pricing card
    features: {
      type: [String],
      required: true,
      validate: {
        validator: (f) => f.length >= 1,
        message: "Plan must have at least one feature",
      },
      // e.g. ["Full gym access", "Locker room", "2 group classes/week"]
    },

    status: {
      type: String,
      enum: Object.values(PLAN_STATUS),
      default: PLAN_STATUS.ACTIVE,
      // active   → visible to members, purchasable
      // inactive → hidden from members (admin paused it)
      // archived → old plan, existing subscribers keep it, no new purchases
    },

    // Highlights this plan on the pricing page (e.g. "Most Popular" badge)
    isFeatured: {
      type: Boolean,
      default: false,
    },

    // Shown in the "Plans" section of the landing page? false = "Other plans":
    // still active (can be given at the desk, opened by link, bought online)
    // but not listed on the landing page. Existing plans default to true.
    showOnLanding: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Controls the order plans appear on the pricing page
    // Lower number = appears first
    displayOrder: {
      type: Number,
      default: 0,
    },

    // How many days after expiry the member still gets access
    // Default from constants (3 days)
    gracePeriodDays: {
      type: Number,
      default: 3,
      min: [0, "Grace period cannot be negative"],
      max: [30, "Grace period cannot exceed 30 days"],
    },

    // Admin who created this plan
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// =============================================================================
// Indexes
// =============================================================================

// Fast lookup for public pricing page (active plans in display order)
membershipPlanSchema.index({ status: 1, displayOrder: 1 });

// =============================================================================
// Instance Method: getEffectivePrice(durationDays)
// =============================================================================
// Returns the price a member should actually pay for a given duration.
// Takes offerPrice and offerValidUntil into account automatically.
//
// USAGE:
//   const price = plan.getEffectivePrice(30);
//   → returns offerPrice if valid offer exists, otherwise returns base price
// =============================================================================

membershipPlanSchema.methods.getEffectivePrice = function (durationDays) {
  const tier = this.pricingTiers.find((t) => t.durationDays === durationDays);
  if (!tier) return null;

  const now = new Date();
  const hasValidOffer =
    tier.offerPrice !== null &&
    tier.offerPrice !== undefined &&
    (tier.offerValidUntil === null || tier.offerValidUntil > now);

  return hasValidOffer ? tier.offerPrice : tier.price;
};

// =============================================================================
// Instance Method: getTier(durationDays)
// =============================================================================
// Returns the full pricing tier object for a given duration.
// Used when creating a subscription to capture tier details.
// =============================================================================

membershipPlanSchema.methods.getTier = function (durationDays) {
  return this.pricingTiers.find((t) => t.durationDays === durationDays) || null;
};

// =============================================================================
// Static Method: findActivePlans()
// =============================================================================
// Returns all active plans sorted by displayOrder.
// Used for the public pricing page.
// =============================================================================

membershipPlanSchema.statics.findActivePlans = async function ({ landingOnly = false } = {}) {
  const filter = { status: PLAN_STATUS.ACTIVE };
  // `$ne: false` also matches older plans saved before this field existed
  if (landingOnly) filter.showOnLanding = { $ne: false };
  return await this.find(filter).sort({
    displayOrder: 1,
    createdAt: 1, // stable order when numbers tie
  });
};

const MembershipPlan = mongoose.model("MembershipPlan", membershipPlanSchema);

export default MembershipPlan;
