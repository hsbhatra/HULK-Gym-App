import OTP from "../../models/otp.model.js";
import { OTP_CONFIG } from "../../utils/constants.js";
import ApiError from "../../utils/apiError.js";

export const generateAndSaveOtp = async (email, purpose, userId = null) => {
  await OTP.updateMany({ email, purpose, isUsed: false }, { isUsed: true });

  const { rawOtp, otpHash } = OTP.generateOtp();

  await OTP.create({
    email,
    otpHash,
    purpose,
    userId,
    expiresAt: new Date(Date.now() + OTP_CONFIG.EXPIRY_MS),
  });

  return rawOtp;
};

export const verifyOtp = async (email, submittedOtp, purpose) => {
  const otpDoc = await OTP.findOne({
    email,
    purpose,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  }).select("+otpHash");

  if (!otpDoc) {
    throw ApiError.badRequest(
      "OTP has expired or does not exist. Please request a new one.",
    );
  }

  if (otpDoc.isExhausted()) {
    const newRawOtp = await generateAndSaveOtp(email, purpose, otpDoc.userId);
    return {
      verified: false,
      exhausted: true,
      newOtpGenerated: true,
      rawOtp: newRawOtp,
    };
  }

  const isCorrect = OTP.verifyOtp(submittedOtp, otpDoc.otpHash);

  if (!isCorrect) {
    otpDoc.attempts += 1;
    await otpDoc.save();

    const attemptsRemaining = otpDoc.maxAttempts - otpDoc.attempts;

    if (otpDoc.isExhausted()) {
      const newRawOtp = await generateAndSaveOtp(email, purpose, otpDoc.userId);
      return {
        verified: false,
        exhausted: true,
        newOtpGenerated: true,
        rawOtp: newRawOtp,
      };
    }

    throw ApiError.badRequest(
      `Incorrect OTP. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining.`,
    );
  }

  otpDoc.isUsed = true;
  await otpDoc.save();

  return { verified: true, exhausted: false, newOtpGenerated: false, otpDoc };
};

export const resendOtp = async (email, purpose, userId = null) => {
  const recentOtp = await OTP.findOne({
    email,
    purpose,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });

  if (recentOtp) {
    const secondsSinceCreation =
      (Date.now() - recentOtp.createdAt.getTime()) / 1000;
    const cooldownSeconds = OTP_CONFIG.RESEND_COOLDOWN_SECONDS;

    if (secondsSinceCreation < cooldownSeconds) {
      const waitSeconds = Math.ceil(cooldownSeconds - secondsSinceCreation);
      throw ApiError.tooManyRequests(
        `Please wait ${waitSeconds} second${waitSeconds === 1 ? "" : "s"} before requesting a new OTP.`,
      );
    }
  }

  const rawOtp = await generateAndSaveOtp(email, purpose, userId);
  return rawOtp;
};

export const deleteUsedOtps = async (email, purpose) => {
  await OTP.deleteMany({ email, purpose });
};
