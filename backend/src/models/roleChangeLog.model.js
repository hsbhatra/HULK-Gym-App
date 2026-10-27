// =============================================================================
// src/models/roleChangeLog.model.js
// =============================================================================
// Who made whom a receptionist (or took it away), and when. Append-only.
// =============================================================================

import mongoose from "mongoose";

const roleChangeLogSchema = new mongoose.Schema(
  {
    targetId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    targetName: { type: String, default: "" },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actorName: { type: String, default: "" },
    fromRole: { type: String, required: true },
    toRole: { type: String, required: true },
    ip: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export default mongoose.model("RoleChangeLog", roleChangeLogSchema);
