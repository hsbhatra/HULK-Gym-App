import { Router } from "express";
import authenticate from "../../middleware/auth/authenticate.middleware.js";
import sessionGuard from "../../middleware/auth/sessionGuard.middleware.js";
import {
  validateRegister,
  validateVerifyOtp,
  validateResendOtp,
  validateLogin,
} from "../../middleware/validation/auth.validation.js";
import {
  register,
  verifyRegistrationOtp,
  resendRegistrationOtp,
  login,
  refreshToken,
  logout,
  logoutAllDevices,
  getSessions,
} from "../../controllers/auth/authentication.controller.js";
import { authLimiter, otpLimiter } from "../../middleware/rateLimiter.middleware.js";

const router = Router();

router.post("/register", authLimiter, validateRegister, register);
router.post("/verify-registration-otp", otpLimiter, validateVerifyOtp, verifyRegistrationOtp);
router.post("/resend-registration-otp", otpLimiter, validateResendOtp, resendRegistrationOtp);
router.post("/login", authLimiter, validateLogin, login);
router.get("/refresh-token", refreshToken);

router.post("/logout", authenticate, sessionGuard, logout);
router.post("/logout-all", authenticate, sessionGuard, logoutAllDevices);
router.get("/sessions", authenticate, sessionGuard, getSessions);

export default router;
