// =============================================================================
// src/models/accountDeletionRequest.model.js
// =============================================================================
// A member asks to delete their account; the gym admin approves or rejects.
// When a request is approved the member's personal details are erased, so the
// request keeps only the readable member code (e.g. hulkgym_0001) afterwards —
// memberName is cleared at that moment.
// =============================================================================

import mongoose from "mongoose";

export const DELETION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled", // the member withdrew it
};

const accountDeletionRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Snapshot so the admin list still reads well; name is wiped on approval
    memberCode: { type: String, default: "" },
    memberName: { type: String, default: "" },

    status: {
      type: String,
      enum: Object.values(DELETION_STATUS),
      default: DELETION_STATUS.PENDING,
    },

    // Optional reason typed by the member
    reason: { type: String, default: "", maxlength: 300, trim: true },

    decidedAt: { type: Date, default: null },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    decidedByName: { type: String, default: "" },
    // Shown to the member when a request is rejected
    decisionNote: { type: String, default: "", maxlength: 300, trim: true },
  },
  { timestamps: true },
);

// One open request per member (double-clicks, two tabs)
accountDeletionRequestSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { status: DELETION_STATUS.PENDING } },
);
accountDeletionRequestSchema.index({ status: 1, createdAt: 1 });

const AccountDeletionRequest = mongoose.model("AccountDeletionRequest", accountDeletionRequestSchema);

export default AccountDeletionRequest;
