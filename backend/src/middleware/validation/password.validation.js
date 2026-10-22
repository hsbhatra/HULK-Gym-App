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

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required()
    .messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
});

const resetPasswordSchema = Joi.object({
  resetToken: Joi.string().hex().length(64).required()
    .messages({
      "any.required": "Your reset session has expired. Please request a new OTP.",
      "string.length": "Your reset session has expired. Please request a new OTP.",
      "string.hex": "Your reset session has expired. Please request a new OTP.",
    }),

  email: Joi.string().email().lowercase().trim().required()
    .messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),

  newPassword: Joi.string().min(8).max(128).required()
    .messages({
      "string.min": "Password must be at least 8 characters",
      "any.required": "New password is required",
    }),

  confirmNewPassword: Joi.string().valid(Joi.ref("newPassword")).required()
    .messages({
      "any.only": "Passwords do not match",
      "any.required": "Please confirm your new password",
    }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required()
    .messages({
      "any.required": "Current password is required",
    }),

  newPassword: Joi.string().min(8).max(128).required()
    .messages({
      "string.min": "Password must be at least 8 characters",
      "any.required": "New password is required",
    }),

  confirmNewPassword: Joi.string().valid(Joi.ref("newPassword")).required()
    .messages({
      "any.only": "Passwords do not match",
      "any.required": "Please confirm your new password",
    }),
});

export const validateForgotPassword = validate(forgotPasswordSchema);
export const validateResetPassword = validate(resetPasswordSchema);
export const validateChangePassword = validate(changePasswordSchema);
