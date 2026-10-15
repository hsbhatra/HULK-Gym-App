import asyncHandler from "../../utils/asyncHandler.js";
import ApiResponse from "../../utils/apiResponse.js";
import ApiError from "../../utils/apiError.js";
import { HTTP_STATUS, OTP_CONFIG } from "../../utils/constants.js";
import User from "../../models/user.model.js";
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

  return new ApiResponse(
    HTTP_STATUS.OK,
    "OTP verified successfully. You may now reset your password.",
    { email, otpVerified: true },
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
  const { email, newPassword, confirmNewPassword } = req.body;

  validatePasswordStrength(newPassword);
  validatePasswordMatch(newPassword, confirmNewPassword);

  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user) {
    throw ApiError.notFound("No account found with this email.");
  }

  const { default: OTP } = await import("../../models/otp.model.js");
  const usedOtp = await OTP.findOne({
    email,
    purpose: OTP_CONFIG.PURPOSES.FORGOT_PASSWORD,
    isUsed: true,
  });

  if (!usedOtp) {
    throw ApiError.unauthorized(
      "OTP verification required before resetting password.",
    );
  }

  const isSamePassword = await comparePassword(newPassword, user.passwordHash);
  if (isSamePassword) {
    throw ApiError.badRequest(
      "New password cannot be the same as your current password.",
    );
  }

  user.passwordHash = newPassword;
  await user.save();
  await deleteUsedOtps(email, OTP_CONFIG.PURPOSES.FORGOT_PASSWORD);

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

  return new ApiResponse(
    HTTP_STATUS.OK,
    "Password changed successfully.",
    null,
  ).send(res);
});
