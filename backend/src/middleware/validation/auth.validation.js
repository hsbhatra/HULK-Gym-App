import Joi from "joi";
import ApiError from "../../utils/apiError.js";

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
    errors: { wrap: { label: false } }, // firstName, not "firstName"
  });

  if (error) {
    const messages = error.details.map((d) => d.message);
    // Surface the first real reason as the message — the frontend toasts
    // `message`, and a bare "Validation failed" tells the user nothing.
    return next(ApiError.badRequest(messages[0] || "Validation failed", messages));
  }

  next();
};

const registerSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).trim().pattern(/^[A-Za-z][A-Za-z .'-]*$/).required()
    .messages({
      "string.pattern.base": "First name can only contain letters",
      "string.empty": "First name cannot be empty",
      "string.min": "First name must be at least 2 characters",
      "string.max": "First name cannot exceed 50 characters",
      "any.required": "First name is required",
    }),

  lastName: Joi.string().min(2).max(50).trim().pattern(/^[A-Za-z][A-Za-z .'-]*$/).required()
    .messages({
      "string.pattern.base": "Last name can only contain letters",
      "string.empty": "Last name cannot be empty",
      "string.min": "Last name must be at least 2 characters",
      "string.max": "Last name cannot exceed 50 characters",
      "any.required": "Last name is required",
    }),

  email: Joi.string().email().lowercase().trim().required()
    .messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),

  phoneNumber: Joi.string().pattern(/^[6-9]\d{9}$/).required()
    .messages({
      "string.pattern.base": "Please provide a valid 10-digit Indian mobile number",
      "any.required": "Phone number is required",
    }),

  password: Joi.string().min(8).max(128).required()
    .messages({
      "string.min": "Password must be at least 8 characters",
      "any.required": "Password is required",
    }),

  confirmPassword: Joi.string().valid(Joi.ref("password")).required()
    .messages({
      "any.only": "Passwords do not match",
      "any.required": "Please confirm your password",
    }),

  acceptTerms: Joi.boolean().valid(true).required()
    .messages({
      "any.only": "Please accept the Terms & Conditions and Privacy Policy",
      "any.required": "Please accept the Terms & Conditions and Privacy Policy",
    }),

  ageConfirmation: Joi.string().valid("adult", "guardian").required()
    .messages({
      "any.only": "Please confirm your age",
      "any.required": "Please confirm your age",
    }),
});

const verifyOtpSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required()
    .messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),

  otp: Joi.string().length(6).pattern(/^\d{6}$/).required()
    .messages({
      "string.length": "OTP must be exactly 6 digits",
      "string.pattern.base": "OTP must contain only numbers",
      "any.required": "OTP is required",
    }),
});

const resendOtpSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required()
    .messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required()
    .messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),

  password: Joi.string().required()
    .messages({
      "any.required": "Password is required",
    }),
});

// --- Update Profile ---
const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).trim().pattern(/^[A-Za-z][A-Za-z .'-]*$/)
    .messages({
      "string.pattern.base": "First name can only contain letters",
      "string.empty": "First name cannot be empty",
      "string.min": "First name must be at least 2 characters",
      "string.max": "First name cannot exceed 50 characters",
    }),
  lastName: Joi.string().min(2).max(50).trim().pattern(/^[A-Za-z][A-Za-z .'-]*$/)
    .messages({
      "string.pattern.base": "Last name can only contain letters",
      "string.empty": "Last name cannot be empty",
      "string.min": "Last name must be at least 2 characters",
      "string.max": "Last name cannot exceed 50 characters",
    }),
  height: Joi.number().min(50).max(300)
    .messages({
      "number.min": "Height must be at least 50cm",
      "number.max": "Height cannot exceed 300cm",
      "number.base": "Height must be a number",
    }),
  weight: Joi.number().min(20).max(500)
    .messages({
      "number.min": "Weight must be at least 20kg",
      "number.max": "Weight cannot exceed 500kg",
      "number.base": "Weight must be a number",
    }),
  dateOfBirth: Joi.date().max("now")
    .messages({
      "date.max": "Date of birth cannot be in the future",
    }),
  gender: Joi.string().valid("male", "female", "other", "preferNotToSay"),
  bio: Joi.string().max(200).trim()
    .messages({
      "string.max": "Bio cannot exceed 200 characters",
    }),
});

export const validateRegister = validate(registerSchema);
export const validateVerifyOtp = validate(verifyOtpSchema);
export const validateResendOtp = validate(resendOtpSchema);
export const validateLogin = validate(loginSchema);
export const validateUpdateProfile = validate(updateProfileSchema);
