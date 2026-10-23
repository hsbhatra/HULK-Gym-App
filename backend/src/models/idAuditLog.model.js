// =============================================================================
// src/models/idAuditLog.model.js
// =============================================================================
// Who unlocked, saved or viewed a member's ID, and when. Never holds the ID
// number itself.
// =============================================================================

import mongoose from "mongoose";

export const ID_AUDIT_ACTION = {
  UNLOCK: "unlock",
  SAVE: "save",
  REVEAL: "reveal",
};

const idAuditLogSchema = new mongoose.Schema(
  {
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actorName: { type: String, default: "" },
    action: { type: String, enum: Object.values(ID_AUDIT_ACTION), required: true },
    ip: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const IdAuditLog = mongoose.model("IdAuditLog", idAuditLogSchema);

export default IdAuditLog;
