// =============================================================================
// src/services/analytics.service.js — loads data, hands it to analytics.calc.js
// =============================================================================
import Receipt from "../models/receipt.model.js";
import Payment from "../models/payment.model.js";
import Subscription from "../models/subscription.model.js";
import Installment from "../models/installment.model.js";
import User from "../models/user.model.js";
import { MEMBER_ROLES } from "../utils/constants.js";
import ApiError from "../utils/apiError.js";
import { parseRange, revenueReport, membersReport, duesReport, renewalsReport } from "./analytics.calc.js";

const range = (q) => {
  const str = (v) => (typeof v === "string" && v ? v : undefined);
  if ((q.from !== undefined && !str(q.from)) || (q.to !== undefined && !str(q.to))) throw ApiError.badRequest("Dates must be valid (YYYY-MM-DD).");
  const r = parseRange({ from: str(q.from), to: str(q.to) });
  if (r.error) throw ApiError.badRequest(r.error);
  return r;
};
const meta = (r) => ({ from: r.fromYMD, to: r.toYMD, days: r.days, bucket: r.bucket, previousFrom: r.prevFromYMD, previousTo: r.prevToYMD });

const loadUsers = () => User.find({ role: { $in: MEMBER_ROLES }, deletedAt: null }).select("firstName lastName userId phoneNumber createdAt").lean();
const loadSubs = () =>
  Subscription.find({ status: { $ne: "pending" } })
    .select("userId status startDate endDate gracePeriodEnds activatedAt createdAt cancelledAt cancelReason planSnapshot.planName")
    .lean();

export const getRevenue = async (q) => {
  const r = range(q);
  const [receipts, dups] = await Promise.all([
    Receipt.find({ paidAt: { $gte: r.prevStart, $lt: r.end } }).select("amount paymentMode planName paidAt").lean(),
    Payment.find({
      status: { $in: ["refund_due", "refunded"] },
      $or: [{ paidAt: { $gte: r.prevStart, $lt: r.end } }, { "refund.initiatedAt": { $gte: r.prevStart, $lt: r.end } }],
    }).select("status amountPaid paidAt refund.amount refund.initiatedAt").lean(),
  ]);
  return { range: meta(r), ...revenueReport({ receipts, dupPayments: dups }, r) };
};

export const getMembers = async (q) => {
  const r = range(q);
  const [users, subs] = await Promise.all([loadUsers(), loadSubs()]);
  return { range: meta(r), ...membersReport({ users, subs }, r) };
};

export const getDues = async (q) => {
  const r = range(q);
  const [users, subs, payments, installments] = await Promise.all([
    loadUsers(),
    Subscription.find({ status: "cancelled" }).select("_id status").lean(),
    Payment.find({ $expr: { $gt: ["$amountDue", "$amountPaid"] }, status: "partial" }).select("userId subscriptionId amountDue amountPaid").lean(),
    Installment.find({ status: { $nin: ["waived"] } }).select("userId subscriptionId amountDue amountPaid dueDate status").lean(),
  ]);
  return { range: meta(r), ...duesReport({ payments, installments, users, subs }, r) };
};

export const getRenewals = async (q) => {
  const r = range(q);
  const [users, subs] = await Promise.all([loadUsers(), loadSubs()]);
  return { range: meta(r), ...renewalsReport({ users, subs }, r) };
};
