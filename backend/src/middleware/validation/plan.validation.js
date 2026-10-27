// =============================================================================
// src/middleware/validation/plan.validation.js
// =============================================================================

import Joi from "joi";
import ApiError from "../../utils/apiError.js";

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const messages = error.details.map((d) => d.message);
    return next(ApiError.badRequest(messages[0] || "Validation failed", messages));
  }

  // Keep only the fields the schema knows (no stray status/createdBy/etc.)
  req.body = value;
  next();
};

// =============================================================================
// Schemas
// =============================================================================

const pricingTierSchema = Joi.object({
  durationDays: Joi.number().valid(30, 90, 180, 365).required()
    .messages({
      "any.only": "Duration must be 30, 90, 180, or 365 days",
      "any.required": "Duration is required for each pricing tier",
    }),
  label: Joi.string().trim().required()
    .messages({ "any.required": "Label is required for each pricing tier" }),
  // Prices are whole paise (₹1 = 100). Never fractions, never below ₹1.
  price: Joi.number().integer().min(100).max(1000000000).required()
    .messages({
      "number.min": "Price must be at least ₹1",
      "number.integer": "Price must be a whole number of paise",
      "any.required": "Price is required for each pricing tier",
    }),
  // An offer must be a real price (≥ ₹1) and cheaper than the normal price
  offerPrice: Joi.number().integer().min(100).less(Joi.ref("price")).allow(null)
    .messages({
      "number.min": "Offer price must be at least ₹1",
      "number.less": "Offer price must be lower than the regular price",
      "number.integer": "Offer price must be a whole number of paise",
    }),
  offerValidUntil: Joi.date().allow(null),
});

const createPlanSchema = Joi.object({
  name: Joi.string().trim().max(50).required()
    .messages({ "any.required": "Plan name is required" }),

  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).required()
    .messages({
      "string.pattern.base": "Slug can only contain lowercase letters, numbers, and hyphens",
      "any.required": "Plan slug is required",
    }),

  description: Joi.string().trim().max(200).required()
    .messages({ "any.required": "Plan description is required" }),

  pricingTiers: Joi.array().items(pricingTierSchema).length(4).required()
    .messages({
      "array.length": "Plan must have exactly 4 pricing tiers",
      "any.required": "Pricing tiers are required",
    }),

  features: Joi.array().items(Joi.string()).min(1).required()
    .messages({
      "array.min": "Plan must have at least one feature",
      "any.required": "Features are required",
    }),

  isFeatured: Joi.boolean(),
  showOnLanding: Joi.boolean(), // default false for a new plan (set in plan.service)
  displayOrder: Joi.number(),
  gracePeriodDays: Joi.number().min(0).max(30),
});

const updatePlanSchema = Joi.object({
  name: Joi.string().trim().max(50),
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/)
    .messages({ "string.pattern.base": "Slug can only contain lowercase letters, numbers, and hyphens" }),
  description: Joi.string().trim().max(200),
  pricingTiers: Joi.array().items(pricingTierSchema).length(4)
    .messages({ "array.length": "Plan must have exactly 4 pricing tiers" }),
  features: Joi.array().items(Joi.string()).min(1),
  isFeatured: Joi.boolean(),
  displayOrder: Joi.number(),
  gracePeriodDays: Joi.number().min(0).max(30),
});

const landingVisibilitySchema = Joi.object({
  show: Joi.boolean().required()
    .messages({ "any.required": "Say whether the plan should show on the landing page" }),
});

const reorderPlansSchema = Joi.object({
  group: Joi.string().valid("landing", "other").required()
    .messages({ "any.required": "Say which list is being reordered (landing or other)" }),
  order: Joi.array()
    .items(Joi.string().hex().length(24))
    .min(1)
    .max(100)
    .required()
    .messages({ "any.required": "Plan order is required" }),
});

const updatePlanStatusSchema = Joi.object({
  status: Joi.string().valid("active", "inactive", "archived").required()
    .messages({
      "any.only": "Status must be active, inactive, or archived",
      "any.required": "Status is required",
    }),
});

// =============================================================================
// Exported Middleware
// =============================================================================

export const validateCreatePlan       = validate(createPlanSchema);
export const validateUpdatePlan       = validate(updatePlanSchema);
export const validateUpdatePlanStatus = validate(updatePlanStatusSchema);
export const validateReorderPlans     = validate(reorderPlansSchema);
export const validateLandingVisibility = validate(landingVisibilitySchema);
