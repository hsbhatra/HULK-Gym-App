import asyncHandler from "../../utils/asyncHandler.js";
import ApiResponse from "../../utils/apiResponse.js";
import ApiError from "../../utils/apiError.js";
import { HTTP_STATUS, OTP_CONFIG } from "../../utils/constants.js";
import crypto from "crypto";
import User from "../../models/user.model.js";
import OTP from "../../models/otp.model.js";
import Session from "../../models/session.model.js";
import { revokeAllSessions } from "../../services/auth/session.service.js";
import {
  validatePasswordStrength,
  validatePasswordMatch,
  comparePassword,
} from "../../services/auth/password.service.js";
import {
  generateAndSaveOtp,
  verifyOtp,
  resendOtp,
  deleteUsedOtps,
} from "../../services/auth/otp.service.js";
import { sendForgotPasswordOtp } from "../../services/auth/email.service.js";

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (user && user.isEmailVerified && user.isActive) {
    const rawOtp = await generateAndSaveOtp(
      email,
      OTP_CONFIG.PURPOSES.FORGOT_PASSWORD,
      user._id.toString(),
    );
    try {
      await sendForgotPasswordOtp(email, rawOtp);
    } catch (emailErr) {
      console.error(
        "[EMAIL] Forgot password OTP send failed:",
        emailErr.message,
      );
    }
  }

  return new ApiResponse(
    HTTP_STATUS.OK,
    "If an account with this email exists, an OTP has been sent.",
    { email },
  ).send(res);
});

export const verifyForgotPasswordOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const result = await verifyOtp(
    email,
    otp,
    OTP_CONFIG.PURPOSES.FORGOT_PASSWORD,
  );

  if (result.exhausted && result.newOtpGenerated) {
    await sendForgotPasswordOtp(email, result.rawOtp);
    throw ApiError.badRequest(
      "Too many incorrect attempts. A new OTP has been sent to your email.",
    );
  }

  // Proof that THIS person verified the OTP. /reset-password requires it —
  // previously any "used" OTP row (including ones invalidated by requesting a
  // new code) let anyone reset the password without knowing the OTP.
  const resetToken = crypto.randomBytes(32).toString("hex");
  await OTP.updateOne(
    { _id: result.otpDoc._id },
    {
      $set: {
        resetTokenHash: crypto.createHash("sha256").update(resetToken).digest("hex"),
        resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    },
  );

  return new ApiResponse(
    HTTP_STATUS.OK,
    "OTP verified successfully. You may now reset your password.",
    { email, otpVerified: true, resetToken },
  ).send(res);
});

export const resendForgotPasswordOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (user && user.isEmailVerified && user.isActive) {
    const rawOtp = await resendOtp(
      email,
      OTP_CONFIG.PURPOSES.FORGOT_PASSWORD,
      user._id.toString(),
    );
    await sendForgotPasswordOtp(email, rawOtp);
  }

  return new ApiResponse(
    HTTP_STATUS.OK,
    "If an account with this email exists, a new OTP has been sent.",
    { email },
  ).send(res);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, newPassword, confirmNewPassword, resetToken } = req.body;
  const expired = () =>
    ApiError.unauthorized("Your reset session has expired. Please request a new OTP.");

  if (typeof resetToken !== "string" || !/^[a-f0-9]{64}$/.test(resetToken)) throw expired();

  validatePasswordStrength(newPassword);
  validatePasswordMatch(newPassword, confirmNewPassword);

  const verified = await OTP.findOne({
    email,
    purpose: OTP_CONFIG.PURPOSES.FORGOT_PASSWORD,
    isUsed: true,
    resetTokenHash: crypto.createHash("sha256").update(resetToken).digest("hex"),
    resetTokenExpiresAt: { $gt: new Date() },
  });
  if (!verified) throw expired();

  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || !user.isActive) throw expired();

  const isSamePassword = await comparePassword(newPassword, user.passwordHash);
  if (isSamePassword) {
    throw ApiError.badRequest(
      "New password cannot be the same as your current password.",
    );
  }

  user.passwordHash = newPassword;
  await user.save();
  // Single use, and sign out every device (someone else may have had access)
  await deleteUsedOtps(email, OTP_CONFIG.PURPOSES.FORGOT_PASSWORD);
  await revokeAllSessions(user._id);

  return new ApiResponse(
    HTTP_STATUS.OK,
    "Password reset successfully. You can now login with your new password.",
    null,
  ).send(res);
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  const user = await User.findById(req.user.userId).select("+passwordHash");

  if (!user) {
    throw ApiError.notFound("User not found.");
  }

  const isCurrentPasswordCorrect = await comparePassword(
    currentPassword,
    user.passwordHash,
  );
  if (!isCurrentPasswordCorrect) {
    throw ApiError.unauthorized("Current password is incorrect.");
  }

  validatePasswordStrength(newPassword);
  validatePasswordMatch(newPassword, confirmNewPassword);

  const isSamePassword = await comparePassword(newPassword, user.passwordHash);
  if (isSamePassword) {
    throw ApiError.badRequest(
      "New password cannot be the same as your current password.",
    );
  }

  user.passwordHash = newPassword;
  await user.save();

  // Keep this device signed in, sign out every other one
  await Session.updateMany(
    { userId: user._id, isActive: true, _id: { $ne: req.user.sessionId } },
    { $set: { isActive: false } },
  );

  return new ApiResponse(
    HTTP_STATUS.OK,
    "Password changed successfully. Other devices have been signed out.",
    null,
  ).send(res);
});
