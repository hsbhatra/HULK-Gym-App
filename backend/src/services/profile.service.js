// =============================================================================
// src/services/profile.service.js
// =============================================================================

import User from "../models/user.model.js";
import cloudinary from "../config/cloudinary.js";
import ApiError from "../utils/apiError.js";

// =============================================================================
// getProfile
// =============================================================================
// Fetches the logged-in user's profile from the database.
// =============================================================================

export const getProfile = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw ApiError.notFound("User not found.");
  }

  return user;
};

// =============================================================================
// updateProfile
// =============================================================================
// Updates allowed profile fields — firstName, lastName, phoneNumber.
//
// SECURITY: Email and role are NOT updatable here.
// Email changes require re-verification (separate flow).
// Role changes are admin-only (separate admin module).
// =============================================================================

export const updateProfile = async (userId, updateData) => {
  const { firstName, lastName, height, weight, dateOfBirth, gender, bio } = updateData;

  const fieldsToUpdate = {};
  if (firstName   !== undefined) fieldsToUpdate.firstName   = firstName;
  if (lastName    !== undefined) fieldsToUpdate.lastName    = lastName;
  if (height      !== undefined) fieldsToUpdate.height      = height;
  if (weight      !== undefined) fieldsToUpdate.weight      = weight;
  if (dateOfBirth !== undefined) fieldsToUpdate.dateOfBirth = dateOfBirth;
  if (gender      !== undefined) fieldsToUpdate.gender      = gender;
  if (bio         !== undefined) fieldsToUpdate.bio         = bio;

  if (Object.keys(fieldsToUpdate).length === 0) {
    throw ApiError.badRequest("No valid fields provided to update.");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: fieldsToUpdate },
    { returnDocument: "after", runValidators: true }
  );

  if (!user) throw ApiError.notFound("User not found.");
  return user;
};

// =============================================================================
// updateProfilePicture
// =============================================================================
// Saves the Cloudinary URL (from multer-storage-cloudinary) to the user's
// profile. Also deletes the old picture from Cloudinary if one existed.
//
// By the time this service runs, multer has already uploaded the new image
// to Cloudinary and attached the result to req.file. We just save the URL.
// =============================================================================

export const updateProfilePicture = async (userId, newImageUrl, newPublicId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound("User not found.");
  }

  // Delete the old profile picture from Cloudinary if one exists
  // This keeps the Cloudinary storage clean — no orphaned images
  if (user.profilePicture && user.profilePicture !== null) {
    try {
      // Extract the public_id from the stored URL to delete it
      // We store the publicId separately for this purpose
      const oldPublicId = user.profilePicturePublicId;
      if (oldPublicId) {
        await cloudinary.uploader.destroy(oldPublicId);
      }
    } catch (err) {
      // Don't fail the whole operation if old image deletion fails
      // The new image is already uploaded — we just log and continue
      console.error("Failed to delete old profile picture:", err.message);
    }
  }

  // Save new picture URL and publicId to user document
  user.profilePicture = newImageUrl;
  user.profilePicturePublicId = newPublicId;
  await user.save();

  return user;
};

// =============================================================================
// deleteProfilePicture
// =============================================================================
// Removes the profile picture — deletes from Cloudinary and clears the
// URL field in the database. User reverts to default avatar on frontend.
// =============================================================================

export const deleteProfilePicture = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound("User not found.");
  }

  if (!user.profilePicture) {
    throw ApiError.badRequest("No profile picture to remove.");
  }

  // Delete from Cloudinary
  try {
    if (user.profilePicturePublicId) {
      await cloudinary.uploader.destroy(user.profilePicturePublicId);
    }
  } catch (err) {
    console.error("Failed to delete profile picture from Cloudinary:", err.message);
  }

  // Clear from database
  user.profilePicture = null;
  user.profilePicturePublicId = null;
  await user.save();

  return user;
};
