// =============================================================================
// src/services/memberList.service.js
// =============================================================================
// The admin Members list: filter by membership status / plan / dues and sort,
// all on the server so paging and "N members found" are always correct.
//
// A member's CURRENT MEMBERSHIP is the one they can use right now (active,
// grace or complimentary and not past its grace end); if there is none, their
// latest non-abandoned one (expired / cancelled); if there is none at all →
// "none". Money is in paise.
//   dues     = balance still owed on part-paid memberships that aren't cancelled
//   overdue  = a pending/overdue installment whose due date has passed
// =============================================================================

import mongoose from "mongoose";
import ApiError from "../utils/apiError.js";
import { SUBSCRIPTION_STATUS, INSTALLMENT_STATUS, PAYMENT_STATUS } from "../utils/constants.js";
import User from "../models/user.model.js";
import Subscription from "../models/subscription.model.js";
import Payment from "../models/payment.model.js";
import Installment from "../models/installment.model.js";

export const MEMBER_STATUS_FILTERS = ["active", "grace", "expired", "cancelled", "complimentary", "none"];
export const DUES_FILTERS = ["any", "overdue", "none"];
export const MEMBER_SORTS = ["newest", "oldest", "name_asc", "name_desc", "expiry_soon", "dues_high"];

const FAR_FUTURE = new Date("9999-12-31T00:00:00.000Z");
const LIVE = [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.GRACE, SUBSCRIPTION_STATUS.COMPLIMENTARY];

const csv = (value) =>
  String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

// Validates the query string; anything unknown is a 400 (never silently ignored)
export const parseMemberQuery = (query) => {
  const statuses = csv(query.status);
  for (const s of statuses) {
    if (!MEMBER_STATUS_FILTERS.includes(s)) throw ApiError.badRequest(`Unknown membership status "${s}".`);
  }
  const planIds = csv(query.plan);
  if (planIds.length > 20) throw ApiError.badRequest("Too many plans selected.");
  for (const p of planIds) {
    if (!mongoose.isValidObjectId(p)) throw ApiError.badRequest("Invalid plan in filter.");
  }
  const dues = query.dues ? String(query.dues) : "";
  if (dues && !DUES_FILTERS.includes(dues)) throw ApiError.badRequest(`Unknown dues filter "${dues}".`);
  const sort = query.sort ? String(query.sort) : "newest";
  if (!MEMBER_SORTS.includes(sort)) throw ApiError.badRequest(`Unknown sort "${sort}".`);
  return { statuses: [...new Set(statuses)], planIds: [...new Set(planIds)], dues, sort };
};

const lookups = (now) => [
  // current membership
  {
    $lookup: {
      from: Subscription.collection.name,
      let: { uid: "$_id" },
      pipeline: [
        { $match: { $expr: { $eq: ["$userId", "$$uid"] }, status: { $ne: SUBSCRIPTION_STATUS.PENDING } } },
        {
          $addFields: {
            live: { $and: [{ $in: ["$status", LIVE] }, { $gt: ["$gracePeriodEnds", now] }] },
          },
        },
        { $sort: { live: -1, createdAt: -1 } },
        { $limit: 1 },
        { $project: { status: 1, live: 1, endDate: 1, planId: 1, planName: "$planSnapshot.planName" } },
      ],
      as: "cur",
    },
  },
  { $addFields: { cur: { $arrayElemAt: ["$cur", 0] } } },
  {
    $addFields: {
      memStatus: {
        $cond: [
          { $not: ["$cur"] },
          "none",
          {
            $cond: [
              "$cur.live",
              "$cur.status",
              // active/grace but past its grace end (daily job hasn't run yet) = expired
              { $cond: [{ $in: ["$cur.status", [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.GRACE]] }, "expired", "$cur.status"] },
            ],
          },
        ],
      },
    },
  },
  // balance still owed
  {
    $lookup: {
      from: Payment.collection.name,
      let: { uid: "$_id" },
      pipeline: [
        { $match: { $expr: { $eq: ["$userId", "$$uid"] }, status: PAYMENT_STATUS.PARTIAL } },
        {
          $lookup: {
            from: Subscription.collection.name,
            let: { sid: "$subscriptionId" },
            pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$sid"] } } }, { $project: { status: 1 } }],
            as: "sub",
          },
        },
        { $match: { "sub.status": { $nin: [SUBSCRIPTION_STATUS.CANCELLED] } } },
        { $group: { _id: null, due: { $sum: { $max: [0, { $subtract: ["$amountDue", "$amountPaid"] }] } } } },
      ],
      as: "d",
    },
  },
  { $addFields: { duesPaise: { $ifNull: [{ $arrayElemAt: ["$d.due", 0] }, 0] } } },
  // overdue installments
  {
    $lookup: {
      from: Installment.collection.name,
      let: { uid: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ["$userId", "$$uid"] },
            $or: [
              { status: INSTALLMENT_STATUS.OVERDUE },
              { status: INSTALLMENT_STATUS.PENDING, dueDate: { $lt: now } },
            ],
          },
        },
        { $count: "n" },
      ],
      as: "od",
    },
  },
  { $addFields: { overdueCount: { $ifNull: [{ $arrayElemAt: ["$od.n", 0] }, 0] } } },
];

const sortStage = (sort) => {
  switch (sort) {
    case "oldest": return { createdAt: 1, _id: 1 };
    case "name_asc": return { firstName: 1, lastName: 1, _id: 1 };
    case "name_desc": return { firstName: -1, lastName: -1, _id: -1 };
    case "expiry_soon": return { expKey: 1, _id: 1 };
    case "dues_high": return { duesPaise: -1, overdueCount: -1, _id: 1 };
    default: return { createdAt: -1, _id: -1 };
  }
};

const USER_FIELDS =
  "firstName lastName email phoneNumber userId role isActive profilePicture idProof.savedAt idProof.unlockedUntil";

/**
 * @param {object} baseFilter  who is listed + the text search (plain Mongo filter)
 * @param {object} parsed      result of parseMemberQuery
 * @param {{skip:number, limit:number}} page
 */
export const listMembers = async (baseFilter, parsed, { skip, limit }) => {
  const now = new Date();
  const { statuses, planIds, dues, sort } = parsed;
  const needsComputed = statuses.length || planIds.length || dues || sort === "expiry_soon" || sort === "dues_high";
  const collation = { locale: "en", strength: 2 };

  let ids;
  let total;

  if (!needsComputed) {
    // Cheap path: sort + page first, then look up the details of just this page
    const [page, count] = await Promise.all([
      User.aggregate([
        { $match: baseFilter },
        { $sort: sortStage(sort) },
        { $skip: skip },
        { $limit: limit },
        ...lookups(now),
        { $project: { _id: 1, memStatus: 1, cur: 1, duesPaise: 1, overdueCount: 1 } },
      ]).collation(collation),
      User.countDocuments(baseFilter),
    ]);
    ids = page;
    total = count;
  } else {
    const conditions = {};
    if (statuses.length) conditions.memStatus = { $in: statuses };
    if (planIds.length) conditions["cur.planId"] = { $in: planIds.map((p) => new mongoose.Types.ObjectId(p)) };
    if (dues === "any") conditions.$or = [{ duesPaise: { $gt: 0 } }, { overdueCount: { $gt: 0 } }];
    if (dues === "overdue") conditions.overdueCount = { $gt: 0 };
    if (dues === "none") Object.assign(conditions, { duesPaise: 0, overdueCount: 0 });

    const [out] = await User.aggregate([
      { $match: baseFilter },
      ...lookups(now),
      { $match: conditions },
      { $addFields: { expKey: { $ifNull: ["$cur.endDate", FAR_FUTURE] } } },
      {
        $facet: {
          rows: [
            { $sort: sortStage(sort) },
            { $skip: skip },
            { $limit: limit },
            { $project: { _id: 1, memStatus: 1, cur: 1, duesPaise: 1, overdueCount: 1 } },
          ],
          count: [{ $count: "n" }],
        },
      },
    ]).collation(collation);
    ids = out?.rows || [];
    total = out?.count?.[0]?.n || 0;
  }

  // Load the user documents (so idStatus etc. are computed the usual way) in the same order
  const users = await User.find({ _id: { $in: ids.map((r) => r._id) } }).select(USER_FIELDS);
  const byId = new Map(users.map((u) => [String(u._id), u]));
  const members = ids
    .map((r) => {
      const u = byId.get(String(r._id));
      if (!u) return null;
      const json = u.toJSON();
      json.membership = {
        status: r.memStatus,
        planName: r.cur?.planName || null,
        endDate: r.cur?.endDate || null,
      };
      json.duesPaise = r.duesPaise || 0;
      json.overdueCount = r.overdueCount || 0;
      return json;
    })
    .filter(Boolean);

  return { members, total };
};
