// =============================================================================
// src/services/accountDeletion.service.js
// =============================================================================
// Member asks → admin decides.
//
//   member:  requestDeletion (password + optional reason) · cancelMyRequest
//            · getMyRequest (pending, or a recent rejection to show the reason)
//   admin:   listRequests · approveRequest (erases the account) · rejectRequest
//
// Until the admin approves, nothing is erased and the member keeps using the
// app. Erasure itself is eraseAccount() in profile.service.js.
// =============================================================================

import User from "../models/user.model.js";
import AccountDeletionRequest, { DELETION_STATUS } from "../models/accountDeletionRequest.model.js";
import ApiError from "../utils/apiError.js";
import { USER_ROLES } from "../utils/constants.js";
import { eraseAccount, getDeletionBlockers, DELETION_BLOCKERS } from "./profile.service.js";
import { sendDeletionApprovedEmail, sendDeletionRejectedEmail } from "./email/receiptEmail.service.js";

const REJECTED_VISIBLE_DAYS = 30;
const MAX_TEXT = 300;

const cleanText = (v) => (typeof v === "string" ? v.trim().slice(0, MAX_TEXT) : "");

const isDuplicateKey = (err) => err?.code === 11000;

const fullName = (u) => `${u.firstName || ""} ${u.lastName || ""}`.trim();

// ── Member ──────────────────────────────────────────────────────────────────
export const requestDeletion = async (userId, password, reason) => {
  const user = await User.findById(userId).select("+passwordHash");
  if (!user || !user.isActive) throw ApiError.notFound("Account not found.");
  if (user.role === USER_ROLES.ADMIN) {
    throw ApiError.forbidden("Admin accounts can't be deleted from here.");
  }

  const passwordOk = await user.comparePassword(password || "");
  if (!passwordOk) throw ApiError.badRequest("Incorrect password.");

  // Don't create a request that can't be approved — say what to sort out first
  const blockers = await getDeletionBlockers(user._id);
  if (blockers.length) throw ApiError.conflict(DELETION_BLOCKERS[blockers[0]].member);

  try {
    return await AccountDeletionRequest.create({
      userId: user._id,
      memberCode: user.userId || "",
      memberName: fullName(user),
      reason: cleanText(reason),
    });
  } catch (err) {
    if (isDuplicateKey(err)) {
      throw ApiError.conflict("You already have a deletion request waiting for the gym's approval.");
    }
    throw err;
  }
};

export const cancelMyRequest = async (userId) => {
  const cancelled = await AccountDeletionRequest.findOneAndUpdate(
    { userId, status: DELETION_STATUS.PENDING },
    { $set: { status: DELETION_STATUS.CANCELLED, decidedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!cancelled) throw ApiError.notFound("You have no deletion request to cancel.");
  return cancelled;
};

// The pending request, or a recent rejection (so the member sees why)
export const getMyRequest = async (userId) => {
  const pending = await AccountDeletionRequest.findOne({ userId, status: DELETION_STATUS.PENDING });
  if (pending) return pending;

  const since = new Date(Date.now() - REJECTED_VISIBLE_DAYS * 24 * 60 * 60 * 1000);
  const latest = await AccountDeletionRequest.findOne({ userId }).sort({ createdAt: -1 });
  if (latest && latest.status === DELETION_STATUS.REJECTED && latest.decidedAt && latest.decidedAt > since) {
    return latest;
  }
  return null;
};

// ── Admin ───────────────────────────────────────────────────────────────────
export const listRequests = async () => {
  const [pending, history] = await Promise.all([
    AccountDeletionRequest.find({ status: DELETION_STATUS.PENDING })
      .sort({ createdAt: 1 })
      .populate("userId", "firstName lastName email phoneNumber userId")
      .lean(),
    AccountDeletionRequest.find({ status: { $ne: DELETION_STATUS.PENDING } })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean(),
  ]);

  // What still blocks each approval (shown next to the Approve button)
  const withBlockers = await Promise.all(
    pending.map(async (r) => {
      const codes = r.userId?._id ? await getDeletionBlockers(r.userId._id) : [];
      return { ...r, blockers: codes.map((c) => DELETION_BLOCKERS[c].admin) };
    }),
  );

  return { pending: withBlockers, history };
};

const loadAdmin = async (adminId) => {
  const admin = await User.findById(adminId).select("firstName lastName");
  if (!admin) throw ApiError.unauthorized();
  return admin;
};

const notFoundOrDecided = async (requestId) => {
  const existing = await AccountDeletionRequest.findById(requestId).select("status");
  if (!existing) return ApiError.notFound("Deletion request not found.");
  return ApiError.conflict(`This request was already ${existing.status}.`);
};

export const approveRequest = async (requestId, adminId) => {
  const admin = await loadAdmin(adminId);

  // Claim it first, so two admins (or a double click) can't both approve
  const claimed = await AccountDeletionRequest.findOneAndUpdate(
    { _id: requestId, status: DELETION_STATUS.PENDING },
    {
      $set: {
        status: DELETION_STATUS.APPROVED,
        decidedAt: new Date(),
        decidedBy: admin._id,
        decidedByName: fullName(admin),
      },
    },
    { returnDocument: "after" },
  );
  if (!claimed) throw await notFoundOrDecided(requestId);

  let contact;
  try {
    contact = await eraseAccount(claimed.userId);
  } catch (err) {
    // Couldn't erase (e.g. an active membership appeared) — put it back
    await AccountDeletionRequest.updateOne(
      { _id: claimed._id },
      { $set: { status: DELETION_STATUS.PENDING, decidedAt: null, decidedBy: null, decidedByName: "" } },
    );
    throw err;
  }

  // The name is personal data: drop it now that the account is erased
  await AccountDeletionRequest.updateOne({ _id: claimed._id }, { $set: { memberName: "" } });

  // Tell the member — never block the admin on email
  sendDeletionApprovedEmail(contact).catch((err) =>
    console.error("[DELETION] Approval email failed:", err.message),
  );

  return claimed;
};

export const rejectRequest = async (requestId, adminId, note) => {
  const text = cleanText(note);
  if (text.length < 3) throw ApiError.badRequest("Please write a short reason so the member knows why.");

  const admin = await loadAdmin(adminId);
  const rejected = await AccountDeletionRequest.findOneAndUpdate(
    { _id: requestId, status: DELETION_STATUS.PENDING },
    {
      $set: {
        status: DELETION_STATUS.REJECTED,
        decidedAt: new Date(),
        decidedBy: admin._id,
        decidedByName: fullName(admin),
        decisionNote: text,
      },
    },
    { returnDocument: "after" },
  );
  if (!rejected) throw await notFoundOrDecided(requestId);

  User.findById(rejected.userId)
    .select("firstName email isActive")
    .then((user) => (user?.isActive ? sendDeletionRejectedEmail(user, text) : null))
    .catch((err) => console.error("[DELETION] Rejection email failed:", err.message));

  return rejected;
};
