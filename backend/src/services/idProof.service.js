// =============================================================================
// src/services/idProof.service.js
// =============================================================================
// Government ID on a member's account (any ID except Aadhaar).
//
//   1. Member shows the ORIGINAL ID at the desk.
//   2. Receptionist/admin presses "Unlock ID entry" on that member  → unlock
//      lasts ID_UNLOCK_MINUTES and works once.
//   3. Member types the ID type + number on their own profile, with the
//      receptionist watching                                         → save
//   4. From then on it is read-only for everyone (members and admins).
//      Only an admin can view the number, one click at a time        → reveal
//
// Every unlock / save / reveal is written to IdAuditLog.
// =============================================================================

import User from "../models/user.model.js";
import IdAuditLog, { ID_AUDIT_ACTION } from "../models/idAuditLog.model.js";
import ApiError from "../utils/apiError.js";
import { USER_ROLES } from "../utils/constants.js";
import { encryptId, decryptId, fingerprintId } from "../utils/idCrypto.js";

export const ID_UNLOCK_MINUTES = 30;

export const ID_TYPES = {
  PAN: "pan",
  DRIVING_LICENCE: "driving_licence",
  VOTER_ID: "voter_id",
  PASSPORT: "passport",
  OTHER: "other",
};
export const ID_TYPES_ARRAY = Object.values(ID_TYPES);

export const ID_TYPE_LABELS = {
  [ID_TYPES.PAN]: "PAN card",
  [ID_TYPES.DRIVING_LICENCE]: "Driving licence",
  [ID_TYPES.VOTER_ID]: "Voter ID (EPIC)",
  [ID_TYPES.PASSPORT]: "Passport",
  [ID_TYPES.OTHER]: "Other government ID",
};

// Light format checks, only to catch typos (the ID can't be edited afterwards).
// Run on the normalised number: upper-case, no spaces or dashes.
const FORMAT = {
  [ID_TYPES.PAN]: {
    rx: /^[A-Z]{5}\d{4}[A-Z]$/,
    hint: "A PAN has 10 characters, like ABCDE1234F.",
  },
  [ID_TYPES.DRIVING_LICENCE]: {
    rx: /^[A-Z]{2}\d{2}[A-Z0-9]{8,12}$/,
    hint: "A driving licence number starts with the state code and 2 digits, like RJ1420110012345.",
  },
  [ID_TYPES.VOTER_ID]: {
    rx: /^[A-Z]{3}\d{7}$/,
    hint: "A Voter ID has 3 letters and 7 digits, like ABC1234567.",
  },
  [ID_TYPES.PASSPORT]: {
    rx: /^[A-Z]\d{7}$/,
    hint: "A passport number has 1 letter and 7 digits, like K1234567.",
  },
  [ID_TYPES.OTHER]: {
    rx: /^[A-Z0-9]{4,20}$/,
    hint: "Use 4 to 20 letters or digits.",
  },
};

export const normaliseIdNumber = (raw) =>
  String(raw ?? "").toUpperCase().replace(/[\s-]/g, "");

// Returns an error message, or null when the number looks right
export const checkIdNumber = (docType, number) => {
  const rule = FORMAT[docType];
  if (!rule) return "Please choose the ID type.";
  if (!number) return "Please enter the ID number.";
  // Aadhaar is deliberately not collected (not even under "Other")
  if (/^\d{12}$/.test(number)) {
    return "Aadhaar numbers are not accepted. Please use another government ID.";
  }
  if (!rule.rx.test(number)) return `That doesn't look right. ${rule.hint}`;
  return null;
};

// ── Status shown to clients (never contains the number) ─────────────────────
const isUnlocked = (p) => !!(p?.unlockedUntil && new Date(p.unlockedUntil) > new Date());

const audit = (memberId, actor, action, ip) =>
  IdAuditLog.create({
    memberId,
    actorId: actor._id,
    actorName: actor.fullName || `${actor.firstName || ""} ${actor.lastName || ""}`.trim(),
    action,
    ip: ip || "",
  }).catch((err) => console.error("[ID AUDIT] could not write log:", err.message));

const loadActor = async (actorId) => {
  const actor = await User.findById(actorId).select("firstName lastName");
  if (!actor) throw ApiError.unauthorized();
  return actor;
};

// ── 1. Admin / receptionist unlocks one member ──────────────────────────────
export const unlockMemberId = async (memberId, actorId, ip) => {
  const [actor, member] = await Promise.all([
    loadActor(actorId),
    User.findOne({ _id: memberId, role: USER_ROLES.MEMBER, isActive: true, deletedAt: null }),
  ]);
  if (!member) throw ApiError.notFound("Member not found.");
  if (member.idProof?.savedAt) {
    throw ApiError.conflict("This member's ID is already saved. It can't be changed.");
  }

  const until = new Date(Date.now() + ID_UNLOCK_MINUTES * 60 * 1000);
  const updated = await User.findOneAndUpdate(
    { _id: member._id, "idProof.savedAt": null },
    {
      $set: {
        "idProof.unlockedUntil": until,
        "idProof.unlockedAt": new Date(),
        "idProof.unlockedBy": actor._id,
      },
    },
    { returnDocument: "after" },
  );
  if (!updated) throw ApiError.conflict("This member's ID is already saved. It can't be changed.");

  await audit(member._id, actor, ID_AUDIT_ACTION.UNLOCK, ip);
  return updated;
};

// ── 2. Member saves their own ID (once) ─────────────────────────────────────
export const saveMyId = async (userId, { docType, number, consent }, ip) => {
  const member = await User.findById(userId);
  if (!member || !member.isActive) throw ApiError.notFound("Account not found.");

  if (member.idProof?.savedAt) {
    throw ApiError.conflict("Your ID is already saved. It can't be changed.");
  }
  if (!isUnlocked(member.idProof)) {
    throw ApiError.forbidden(
      "ID entry is locked. Please show your original ID at the front desk and ask them to unlock it.",
    );
  }
  if (consent !== true) {
    throw ApiError.badRequest("Please tick the box to agree before saving.");
  }
  if (!ID_TYPES_ARRAY.includes(docType)) throw ApiError.badRequest("Please choose the ID type.");

  const normalised = normaliseIdNumber(number);
  const problem = checkIdNumber(docType, normalised);
  if (problem) throw ApiError.badRequest(problem);

  const enc = encryptId(normalised, member._id);
  const hash = fingerprintId(docType, normalised);

  let updated;
  try {
    // The filter makes this safe against double-clicks and two tabs: only ONE
    // save can win, and only while the desk's unlock is still open.
    updated = await User.findOneAndUpdate(
      { _id: member._id, "idProof.savedAt": null, "idProof.unlockedUntil": { $gt: new Date() } },
      {
        $set: {
          "idProof.docType": docType,
          "idProof.last4": normalised.slice(-4),
          "idProof.enc": enc,
          "idProof.hash": hash,
          "idProof.savedAt": new Date(),
          "idProof.unlockedUntil": null,
        },
      },
      { returnDocument: "after" },
    );
  } catch (err) {
    if (err?.code === 11000) {
      throw ApiError.conflict(
        "This ID number is already linked to another account. Please speak to the front desk.",
      );
    }
    throw err;
  }
  if (!updated) {
    throw ApiError.conflict("The unlock has expired or was already used. Please ask the front desk to unlock again.");
  }

  await audit(member._id, member, ID_AUDIT_ACTION.SAVE, ip);
  return updated;
};

// ── 3. Admin views the number (after pressing "Show ID number") ─────────────
export const revealMemberId = async (memberId, actorId, ip) => {
  const [actor, member] = await Promise.all([
    loadActor(actorId),
    User.findOne({ _id: memberId, role: USER_ROLES.MEMBER, deletedAt: null }).select("+idProof.enc"),
  ]);
  if (!member) throw ApiError.notFound("Member not found.");
  if (!member.idProof?.savedAt || !member.idProof.enc) {
    throw ApiError.notFound("No ID has been saved for this member.");
  }

  const number = decryptId(member.idProof.enc, member._id);
  await audit(member._id, actor, ID_AUDIT_ACTION.REVEAL, ip);

  return {
    docType: member.idProof.docType,
    docTypeLabel: ID_TYPE_LABELS[member.idProof.docType] || "ID",
    number,
  };
};
