// =============================================================================
// src/controllers/profile.controller.js
// =============================================================================

import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import { HTTP_STATUS } from "../utils/constants.js";

import {
  getProfile,
  updateProfile,
  updateProfilePicture,
  deleteProfilePicture,
  deleteAccount,
} from "../services/profile.service.js";
import { saveMyId } from "../services/idProof.service.js";
import { clearRefreshTokenCookie } from "../services/auth/token.service.js";
import ApiError from "../utils/apiError.js";

// =============================================================================
// getMyProfile
// GET /api/v1/profile
// Protected: authenticate
// =============================================================================

export const getMyProfile = asyncHandler(async (req, res) => {
  const user = await getProfile(req.user.userId);

  return new ApiResponse(HTTP_STATUS.OK, "Profile retrieved successfully.", {
    user: user.toJSON(),
  }).send(res);
});

// =============================================================================
// updateMyProfile
// PATCH /api/v1/profile
// Protected: authenticate
// =============================================================================

export const updateMyProfile = asyncHandler(async (req, res) => {
  const user = await updateProfile(req.user.userId, req.body);

  return new ApiResponse(HTTP_STATUS.OK, "Profile updated successfully.", {
    user: user.toJSON(),
  }).send(res);
});

// =============================================================================
// updateMyProfilePicture
// PATCH /api/v1/profile/picture
// Protected: authenticate + uploadProfilePictureMiddleware
// =============================================================================

export const updateMyProfilePicture = asyncHandler(async (req, res) => {
  const newImageUrl = req.cloudinaryResult.url;
  const newPublicId = req.cloudinaryResult.publicId;

  const user = await updateProfilePicture(
    req.user.userId,
    newImageUrl,
    newPublicId,
  );

  return new ApiResponse(
    HTTP_STATUS.OK,
    "Profile picture updated successfully.",
    {
      user: user.toJSON(),
      profilePicture: newImageUrl,
    },
  ).send(res);
});

// =============================================================================
// deleteMyProfilePicture
// DELETE /api/v1/profile/picture
// Protected: authenticate
// =============================================================================

export const deleteMyProfilePicture = asyncHandler(async (req, res) => {
  const user = await deleteProfilePicture(req.user.userId);

  return new ApiResponse(
    HTTP_STATUS.OK,
    "Profile picture removed successfully.",
    { user: user.toJSON() },
  ).send(res);
});

// =============================================================================
// deleteMyAccount
// POST /api/v1/profile/delete   { password }
// Protected: authenticate + sessionGuard
// =============================================================================

export const deleteMyAccount = asyncHandler(async (req, res) => {
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!password) throw ApiError.badRequest("Please enter your password to confirm.");

  await deleteAccount(req.user.userId, password);
  clearRefreshTokenCookie(res);

  return new ApiResponse(
    HTTP_STATUS.OK,
    "Your account has been deleted. Payment records are kept as required by law.",
  ).send(res);
});

// =============================================================================
// saveMyIdProof
// POST /api/v1/profile/id   { docType, number, consent }
// Protected: authenticate + sessionGuard. Works once, only after the front desk
// has unlocked ID entry for this member. The number is never sent back.
// =============================================================================

export const saveMyIdProof = asyncHandler(async (req, res) => {
  const { docType, number, consent } = req.body || {};
  const user = await saveMyId(
    req.user.userId,
    {
      docType: typeof docType === "string" ? docType : "",
      number: typeof number === "string" ? number : "",
      consent: consent === true,
    },
    req.ip,
  );

  return new ApiResponse(HTTP_STATUS.OK, "Your ID has been saved.", {
    user: user.toJSON(),
  }).send(res);
});
