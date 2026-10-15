import asyncHandler from "../../utils/asyncHandler.js";
import ApiResponse from "../../utils/apiResponse.js";
import ApiError from "../../utils/apiError.js";
import { HTTP_STATUS, OTP_CONFIG } from "../../utils/constants.js";
import User from "../../models/user.model.js";
import TempRegistration from "../../models/tempRegistration.model.js";
import {
  validatePasswordStrength,
  validatePasswordMatch,
} from "../../services/auth/password.service.js";
import {
  generateAndSaveOtp,
  verifyOtp,
  resendOtp,
  deleteUsedOtps,
} from "../../services/auth/otp.service.js";
import { sendRegistrationOtp } from "../../services/auth/email.service.js";
import {
  createSession,
  refreshSession,
  revokeSession,
  revokeAllSessions,
  getUserSessions,
} from "../../services/auth/session.service.js";
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  extractRefreshTokenFromCookie,
} from "../../services/auth/token.service.js";
import { generateAccessToken } from "../../services/auth/token.service.js";

const parseDeviceInfo = (req) => {
  const userAgent = req.headers["user-agent"] || "Unknown";
  const ipAddress = req.ip || req.connection?.remoteAddress || "Unknown";

  let platform = "Unknown";
  let deviceName = "Unknown Device";

  if (/windows/i.test(userAgent)) platform = "Windows";
  else if (/macintosh/i.test(userAgent)) platform = "macOS";
  else if (/iphone/i.test(userAgent)) platform = "iOS";
  else if (/ipad/i.test(userAgent)) platform = "iPadOS";
  else if (/android/i.test(userAgent)) platform = "Android";
  else if (/linux/i.test(userAgent)) platform = "Linux";

  if (/chrome/i.test(userAgent) && !/edg/i.test(userAgent))
    deviceName = `Chrome on ${platform}`;
  else if (/firefox/i.test(userAgent)) deviceName = `Firefox on ${platform}`;
  else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent))
    deviceName = `Safari on ${platform}`;
  else if (/edg/i.test(userAgent)) deviceName = `Edge on ${platform}`;
  else deviceName = `Browser on ${platform}`;

  return { userAgent, ipAddress, platform, deviceName };
};

export const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phoneNumber, password, confirmPassword } =
    req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw ApiError.conflict(
      "An account with this email already exists. Please login.",
    );
  }

  const existingPhone = await User.findOne({ phoneNumber });
  if (existingPhone) {
    throw ApiError.conflict(
      "An account with this phone number already exists.",
    );
  }

  validatePasswordStrength(password);
  validatePasswordMatch(password, confirmPassword);

  await TempRegistration.findOneAndUpdate(
    { email },
    {
      firstName,
      lastName,
      email,
      phoneNumber,
      passwordHash: password,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const rawOtp = await generateAndSaveOtp(
    email,
    OTP_CONFIG.PURPOSES.REGISTRATION,
  );
  try {
    await sendRegistrationOtp(email, rawOtp);
  } catch (emailErr) {
    console.error("[EMAIL] Registration OTP send failed:", emailErr.message);
  }

  return new ApiResponse(
    HTTP_STATUS.OK,
    "OTP sent to your email. Please verify to complete registration.",
    { email },
  ).send(res);
});

export const verifyRegistrationOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const result = await verifyOtp(email, otp, OTP_CONFIG.PURPOSES.REGISTRATION);

  if (result.exhausted && result.newOtpGenerated) {
    await sendRegistrationOtp(email, result.rawOtp);
    throw ApiError.badRequest(
      "Too many incorrect attempts. A new OTP has been sent to your email.",
    );
  }

  const tempReg = await TempRegistration.findByEmail(email);
  if (!tempReg) {
    throw ApiError.badRequest(
      "Registration session expired. Please register again.",
    );
  }

  const user = await User.create({
    firstName: tempReg.firstName,
    lastName: tempReg.lastName,
    email: tempReg.email,
    phoneNumber: tempReg.phoneNumber,
    passwordHash: tempReg.passwordHash,
    isEmailVerified: true,
  });

  await TempRegistration.deleteOne({ email });
  await deleteUsedOtps(email, OTP_CONFIG.PURPOSES.REGISTRATION);

  const deviceInfo = parseDeviceInfo(req);
  const { rawRefreshToken, session } = await createSession(
    user._id.toString(),
    deviceInfo,
  );

  const accessToken = generateAccessToken(
    user._id.toString(),
    user.role,
    session._id.toString(),
  );

  setRefreshTokenCookie(res, rawRefreshToken);

  return new ApiResponse(
    HTTP_STATUS.CREATED,
    "Account created successfully. Welcome to Hulk Gym!",
    {
      user: user.toJSON(),
      accessToken,
    },
  ).send(res);
});

export const resendRegistrationOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const tempReg = await TempRegistration.findOne({
    email,
    expiresAt: { $gt: new Date() },
  });

  if (!tempReg) {
    throw ApiError.badRequest(
      "No pending registration found for this email. Please register again.",
    );
  }

  const rawOtp = await resendOtp(email, OTP_CONFIG.PURPOSES.REGISTRATION);

  // Log OTP to console for testing purposes
  console.log(`Resent OTP for ${email}: ${rawOtp}`);

  await tempReg.refreshExpiry();
  try {
    await sendRegistrationOtp(email, rawOtp);
  } catch (emailErr) {
    console.error("[EMAIL] Resend OTP failed:", emailErr.message);
  }

  return new ApiResponse(
    HTTP_STATUS.OK,
    "A new OTP has been sent to your email.",
    { email },
  ).send(res);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+passwordHash");

  if (!user) {
    throw ApiError.unauthorized("Invalid email or password.");
  }

  if (!user.isActive) {
    throw ApiError.forbidden(
      "Your account has been deactivated. Please contact support.",
    );
  }

  if (!user.isEmailVerified) {
    throw ApiError.unauthorized("Please verify your email before logging in.");
  }

  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw ApiError.unauthorized("Invalid email or password.");
  }

  const deviceInfo = parseDeviceInfo(req);
  const { rawRefreshToken, session } = await createSession(
    user._id.toString(),
    deviceInfo,
  );

  const accessToken = generateAccessToken(
    user._id.toString(),
    user.role,
    session._id.toString(),
  );

  setRefreshTokenCookie(res, rawRefreshToken);

  return new ApiResponse(HTTP_STATUS.OK, "Login successful. Welcome back!", {
    user: user.toJSON(),
    accessToken,
  }).send(res);
});

export const refreshToken = asyncHandler(async (req, res) => {
  const rawRefreshToken = extractRefreshTokenFromCookie(req);
  const { accessToken } = await refreshSession(rawRefreshToken);

  return new ApiResponse(
    HTTP_STATUS.OK,
    "Access token refreshed successfully.",
    { accessToken },
  ).send(res);
});

export const logout = asyncHandler(async (req, res) => {
  await revokeSession(req.session._id.toString());
  clearRefreshTokenCookie(res);

  return new ApiResponse(HTTP_STATUS.OK, "Logged out successfully.", null).send(
    res,
  );
});

export const logoutAllDevices = asyncHandler(async (req, res) => {
  await revokeAllSessions(req.user.userId);
  clearRefreshTokenCookie(res);

  return new ApiResponse(
    HTTP_STATUS.OK,
    "Logged out from all devices successfully.",
    null,
  ).send(res);
});

export const getSessions = asyncHandler(async (req, res) => {
  const sessions = await getUserSessions(req.user.userId, req.user.sessionId);

  return new ApiResponse(
    HTTP_STATUS.OK,
    "Active sessions retrieved successfully.",
    { sessions },
  ).send(res);
});
