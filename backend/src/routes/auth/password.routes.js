import { Router } from "express";
import authenticate from "../../middleware/auth/authenticate.middleware.js";
import sessionGuard from "../../middleware/auth/sessionGuard.middleware.js";
import {
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
} from "../../middleware/validation/password.validation.js";
import {
  validateVerifyOtp,
  validateResendOtp,
} from "../../middleware/validation/auth.validation.js";
import {
  forgotPassword,
  verifyForgotPasswordOtp,
  resendForgotPasswordOtp,
  resetPassword,
  changePassword,
} from "../../controllers/auth/password.controller.js";
import {
  forgotPasswordLimiter,
  resetPasswordLimiter,
  sensitiveActionLimiter,
  otpLimiter,
} from "../../middleware/rateLimiter.middleware.js";

const router = Router();

router.post("/forgot-password", forgotPasswordLimiter, validateForgotPassword, forgotPassword);
router.post("/verify-forgot-otp", otpLimiter, validateVerifyOtp, verifyForgotPasswordOtp);
router.post("/resend-forgot-otp", otpLimiter, validateResendOtp, resendForgotPasswordOtp);
router.post("/reset-password", resetPasswordLimiter, validateResetPassword, resetPassword);

router.post("/change-password", sensitiveActionLimiter, authenticate, sessionGuard, validateChangePassword, changePassword);

export default router;
