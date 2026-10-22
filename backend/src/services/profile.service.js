// =============================================================================
// src/services/profile.service.js
// =============================================================================

import User from "../models/user.model.js";
import Subscription from "../models/subscription.model.js";
import Installment from "../models/installment.model.js";
import Payment from "../models/payment.model.js";
import Session from "../models/session.model.js";
import cloudinary from "../config/cloudinary.js";
import ApiError from "../utils/apiError.js";
import {
  SUBSCRIPTION_STATUS,
  INSTALLMENT_STATUS,
  PAYMENT_STATUS,
  USER_ROLES,
} from "../utils/constants.js";

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

// =============================================================================
// deleteAccount
// =============================================================================
// Member-initiated account deletion (DPDP "right to erasure").
// Personal details are erased; payment, receipt and membership records stay
// (tax/accounting law) but no longer point to anything identifying.
// Blocked while money is still in play: an active membership, unpaid
// installments, or a refund the gym still owes this member.
// =============================================================================
export const deleteAccount = async (userId, password) => {
  const user = await User.findById(userId).select("+passwordHash");
  if (!user || !user.isActive) throw ApiError.notFound("Account not found.");
  if (user.role === USER_ROLES.ADMIN) {
    throw ApiError.forbidden("Admin accounts can't be deleted from here.");
  }

  const passwordOk = await user.comparePassword(password || "");
  if (!passwordOk) throw ApiError.badRequest("Incorrect password.");

  const [liveMembership, unpaid, refundDue] = await Promise.all([
    Subscription.exists({
      userId,
      status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.GRACE, SUBSCRIPTION_STATUS.COMPLIMENTARY] },
    }),
    Installment.exists({
      userId,
      status: { $in: [INSTALLMENT_STATUS.PENDING, INSTALLMENT_STATUS.OVERDUE] },
    }),
    Payment.exists({ userId, status: PAYMENT_STATUS.REFUND_DUE }),
  ]);

  if (liveMembership) {
    throw ApiError.conflict(
      "You have an active membership. Please contact the gym to end it before deleting your account.",
    );
  }
  if (unpaid) {
    throw ApiError.conflict(
      "You have unpaid installments. Please clear them with the gym before deleting your account.",
    );
  }
  if (refundDue) {
    throw ApiError.conflict(
      "The gym still owes you a refund. We'll process it first — please contact the gym.",
    );
  }

  // Remove the profile photo from Cloudinary (best effort)
  if (user.profilePicturePublicId) {
    try {
      await cloudinary.uploader.destroy(user.profilePicturePublicId);
    } catch (err) {
      console.error("[DELETE ACCOUNT] Cloudinary cleanup failed:", err.message);
    }
  }

  const tag = user._id.toString();
  // updateOne skips schema validators on purpose: the placeholders below are
  // unique but don't match the email/phone formats.
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        firstName: "Deleted",
        lastName: "Member",
        email: `deleted-${tag}@deleted.invalid`,
        phoneNumber: `deleted-${tag}`,
        passwordHash: `deleted-${tag}`, // not a bcrypt hash — can never match a login
        isActive: false,
        profilePicture: null,
        profilePicturePublicId: null,
        height: null,
        weight: null,
        dateOfBirth: null,
        gender: null,
        bio: null,
        deletedAt: new Date(),
      },
    },
  );

  // Log out everywhere
  await Session.updateMany({ userId: user._id, isActive: true }, { isActive: false });
};
