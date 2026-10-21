// =============================================================================
// src/middleware/validation/plan.validation.js
// =============================================================================

import Joi from "joi";
import ApiError from "../../utils/apiError.js";

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const messages = error.details.map((d) => d.message);
    return next(ApiError.badRequest(messages[0] || "Validation failed", messages));
  }

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
  price: Joi.number().min(100).required()
    .messages({
      "number.min": "Price must be at least ₹1",
      "any.required": "Price is required for each pricing tier",
    }),
  offerPrice: Joi.number().min(0).allow(null),
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
