// =============================================================================
// src/controllers/admin.controller.js
// =============================================================================

import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";
import {
  HTTP_STATUS,
  SUBSCRIPTION_STATUS,
  PAYMENT_STATUS,
  PAYMENT_MODE,
  INSTALLMENT_STATUS,
} from "../utils/constants.js";

import User from "../models/user.model.js";
import Subscription from "../models/subscription.model.js";
import Payment from "../models/payment.model.js";
import Installment from "../models/installment.model.js";
import MembershipPlan from "../models/membershipPlan.model.js";
import Receipt, { RECEIPT_TYPE } from "../models/receipt.model.js";
import { issueReceipt } from "../services/receipt.service.js";
import {
  sendComplimentaryEmail,
  sendRefundInitiatedEmail,
} from "../services/email/receiptEmail.service.js";
import razorpay from "../config/razorpay.js";
import { unlockMemberId, revealMemberId, ID_UNLOCK_MINUTES } from "../services/idProof.service.js";

// =============================================================================
// searchMembers
// GET /api/v1/admin/members?q=search_term
// =============================================================================

export const searchMembers = asyncHandler(async (req, res) => {
  const { q = "" } = req.query;
  const idMissing = req.query.idMissing === "true";
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;
  const trimmed = String(q).trim();

  // User input goes into $regex — escape it, or "(" / "*" / "+91…" throw a
  // 500 and "." matches everyone.
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = (s) => ({ $regex: esc(s), $options: "i" });

  // Members only — not the admin account, not deleted (anonymised) accounts
  let filter = { role: "member", deletedAt: null }; // empty search → every member
  if (idMissing) filter["idProof.savedAt"] = null;   // members without a saved ID
  if (trimmed) {
    const orConditions = [
      { firstName: rx(trimmed) },
      { lastName: rx(trimmed) },
      { email: rx(trimmed) },
      { userId: rx(trimmed) },
    ];

    // Phone: accept "+91 98765-43210", "098765 43210", etc.
    if (/^[+\d\s-]+$/.test(trimmed)) {
      let digits = trimmed.replace(/\D/g, "");
      // Strip country code / trunk 0 even for partial numbers ("+91 70…")
      if (/^\s*\+\s*91/.test(trimmed)) digits = digits.replace(/^91/, "");
      else digits = digits.replace(/^(91|0)(?=\d{10}$)/, "");
      if (digits) orConditions.push({ phoneNumber: rx(digits) });
    }

    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      for (let i = 1; i < parts.length; i++) {
        const firstPart = parts.slice(0, i).join(" ");
        const lastPart = parts.slice(i).join(" ");
        orConditions.push(
          { $and: [{ firstName: rx(firstPart) }, { lastName: rx(lastPart) }] },
          { $and: [{ firstName: rx(lastPart) }, { lastName: rx(firstPart) }] },
        );
      }
    }
    filter = { ...filter, $or: orConditions };
  }

  const [members, total] = await Promise.all([
    User.find(filter)
      .select(
        "firstName lastName email phoneNumber userId role isActive profilePicture idProof.savedAt idProof.unlockedUntil",
      )
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: 1 }),
    User.countDocuments(filter),
  ]);

  return new ApiResponse(HTTP_STATUS.OK, "Members retrieved.", {
    members,
    total,
    page,
    limit,
    pages: Math.ceil(total / Number(limit)),
  }).send(res);
});

// =============================================================================
// getMemberProfile
// GET /api/v1/admin/members/:id
// =============================================================================

export const getMemberProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-passwordHash");

  if (!user) throw ApiError.notFound("Member not found.");

  // Get active subscription
  const activeSubscription = await Subscription.findActiveSubscription(
    req.params.id,
  );

  // Get subscription history
  // Abandoned online checkouts (never paid) are noise in the history
  const subscriptionHistory = await Subscription.find({
    userId: req.params.id,
    status: { $ne: SUBSCRIPTION_STATUS.PENDING },
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("planId", "name slug");

  // Get payment history
  const paymentHistory = await Payment.find({
    userId: req.params.id,
    status: { $ne: PAYMENT_STATUS.PENDING },
  })
    .sort({ createdAt: -1 })
    .limit(10);

  // ── NEW: fetch installments for each payment ─────────────────────────────
  const paymentIds = paymentHistory.map((p) => p._id);
  const installments = await Installment.find({
    paymentId: { $in: paymentIds },
  }).sort({ installmentNumber: 1 });

  const receipts = await Receipt.find({ userId: req.params.id })
    .sort({ paidAt: -1 })
    .limit(50);

  return new ApiResponse(HTTP_STATUS.OK, "Member profile retrieved.", {
    user,
    activeSubscription,
    subscriptionHistory,
    paymentHistory,
    installments,
    receipts,
  }).send(res);
});

// =============================================================================
// recordOfflinePayment
// POST /api/v1/admin/subscriptions/offline
// =============================================================================
// Records a cash/offline payment and activates the subscription immediately.
// Supports full payment, partial payment, and complimentary memberships.
// =============================================================================

export const recordOfflinePayment = asyncHandler(async (req, res) => {
  const {
    userId,
    planId,
    durationDays,
    startDate,
    paymentMode, // cash | upi | card
    amountPaid, // actual amount received
    isComplimentary, // boolean — free membership
    notes,
    installments, // optional array: [{ amountDue, dueDate }]
  } = req.body;

  // ── Validate member exists ─────────────────────────────────────────────────
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("Member not found.");

  // ── Validate plan ──────────────────────────────────────────────────────────
  const plan = await MembershipPlan.findById(planId);
  if (!plan) throw ApiError.notFound("Plan not found.");

  const tier = plan.getTier(Number(durationDays));
  if (!tier) throw ApiError.badRequest("Invalid plan duration.");

  // ── Check for existing active subscription ─────────────────────────────────
  const existing = await Subscription.findActiveSubscription(userId);
  if (existing) {
    throw ApiError.conflict(
      "This member already has an active subscription. It must expire before a new one can be created.",
    );
  }

  // ── Calculate dates ────────────────────────────────────────────────────────
  const start = startDate ? new Date(startDate) : new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + Number(durationDays));

  const gracePeriodEnds = new Date(end);
  gracePeriodEnds.setDate(
    gracePeriodEnds.getDate() + (plan.gracePeriodDays || 3),
  );

  // ── Determine amounts ──────────────────────────────────────────────────────
  const planPrice = plan.getEffectivePrice(Number(durationDays)); // in paise
  const totalAmountDue = isComplimentary ? 0 : planPrice;
  const totalAmountPaid = isComplimentary
    ? 0
    : Math.round(Number(amountPaid) * 100); // ₹ → paise

  if (!isComplimentary) {
    if (!Number.isFinite(totalAmountPaid) || totalAmountPaid < 0) {
      throw ApiError.badRequest("Enter a valid amount received.");
    }
    if (totalAmountPaid > totalAmountDue) {
      throw ApiError.badRequest(
        `Amount received (₹${totalAmountPaid / 100}) is more than the plan price (₹${totalAmountDue / 100}).`,
      );
    }
  }

  const isPartial = !isComplimentary && totalAmountPaid < totalAmountDue;
  const isFull = isComplimentary || totalAmountPaid >= totalAmountDue;

  // Validate the installment plan up front — previously this ran AFTER the
  // subscription + payment were saved, so a bad schedule left an active
  // membership with no installments behind.
  const wantsInstallments =
    Array.isArray(installments) && installments.length > 0 && isPartial;
  if (wantsInstallments) {
    const remainingBalance = totalAmountDue - totalAmountPaid;
    let installmentSum = 0;
    for (const inst of installments) {
      const amt = Math.round(Number(inst.amountDue) * 100);
      if (!amt || amt <= 0) throw ApiError.badRequest("Every installment needs an amount above ₹0.");
      if (!inst.dueDate || isNaN(new Date(inst.dueDate))) {
        throw ApiError.badRequest("Every installment needs a valid due date.");
      }
      installmentSum += amt;
    }
    if (Math.abs(installmentSum - remainingBalance) > 1) {
      throw ApiError.badRequest(
        `Installment total (₹${installmentSum / 100}) must equal the remaining balance (₹${remainingBalance / 100}).`,
      );
    }
  }

  const finalPaymentMode = isComplimentary
    ? PAYMENT_MODE.COMPLIMENTARY
    : paymentMode || PAYMENT_MODE.CASH;

  // ── Create Subscription ────────────────────────────────────────────────────
  const subscription = await Subscription.create({
    userId,
    planId,
    planSnapshot: {
      planName: plan.name,
      planSlug: plan.slug,
      durationDays: Number(durationDays),
      durationLabel: tier.label,
      features: plan.features,
      price: totalAmountDue,
      gracePeriodDays: plan.gracePeriodDays || 3,
    },
    status: SUBSCRIPTION_STATUS.ACTIVE, // activate immediately for offline payments
    paymentMode: finalPaymentMode,
    startDate: start,
    endDate: end,
    gracePeriodEnds,
    activatedAt: new Date(),
    createdBy: req.user.userId,
    notes,
  });

  // ── Create Payment Record (receipt number is issued below, per payment) ───
  const payment = await Payment.create({
    userId,
    subscriptionId: subscription._id,
    planId,
    amountDue: totalAmountDue,
    amountPaid: totalAmountPaid,
    downPayment: totalAmountPaid,
    currency: "INR",
    status: isFull ? PAYMENT_STATUS.COMPLETED : PAYMENT_STATUS.PARTIAL,
    paymentMode: finalPaymentMode,
    recordedBy: req.user.userId,
    paidAt: new Date(),
    notes,
  });

  // ── Create Installments (validated above) ──────────────────────────────────
  let createdInstallments = [];
  if (wantsInstallments) {
    const installmentDocs = installments.map((inst, i) => ({
      paymentId: payment._id,
      subscriptionId: subscription._id,
      userId,
      installmentNumber: i + 1,
      amountDue: Math.round(Number(inst.amountDue) * 100),
      amountPaid: 0,
      dueDate: new Date(inst.dueDate),
      status: INSTALLMENT_STATUS.PENDING,
      paymentMode: null,
      recordedBy: req.user.userId,
      paidAt: null,
    }));
    createdInstallments = await Installment.insertMany(installmentDocs);
  }

  // ── Receipt + email (money received) / welcome email (complimentary) ──────
  let receipt = null;
  if (totalAmountPaid > 0) {
    receipt = await issueReceipt({
      payment,
      subscription,
      amount: totalAmountPaid,
      type: RECEIPT_TYPE.OFFLINE,
      paymentMode: finalPaymentMode,
      recordedBy: req.user.userId,
      note: isPartial ? "Down payment" : null,
    });
  } else if (isComplimentary) {
    try {
      await sendComplimentaryEmail(user, subscription);
    } catch (err) {
      console.error("Complimentary email failed:", err.message);
    }
  }

  return new ApiResponse(
    HTTP_STATUS.CREATED,
    `Membership activated. ${isPartial ? `Partial payment recorded. Balance due: ₹${((totalAmountDue - totalAmountPaid) / 100).toFixed(2)}` : "Full payment received."}`,
    { subscription, payment, installments: createdInstallments, receipt },
  ).send(res);
});

// =============================================================================
// markInstallmentPaid
// PATCH /api/v1/admin/installments/:id
// =============================================================================

export const markInstallmentPaid = asyncHandler(async (req, res) => {
  const { amountPaid, paymentMode, notes } = req.body;

  const installment = await Installment.findById(req.params.id);
  if (!installment) throw ApiError.notFound("Installment not found.");

  if (installment.status === INSTALLMENT_STATUS.PAID) {
    throw ApiError.conflict("This installment is already marked as paid.");
  }
  if (installment.status === INSTALLMENT_STATUS.WAIVED) {
    throw ApiError.conflict("This installment was waived (membership cancelled).");
  }

  const paidAmount = Math.round(Number(amountPaid) * 100); // ₹ → paise
  if (!paidAmount || paidAmount <= 0) {
    throw ApiError.badRequest("Enter a valid amount.");
  }

  const remaining = installment.amountDue - (installment.amountPaid || 0);
  if (paidAmount > remaining) {
    throw ApiError.badRequest(
      `Amount exceeds this installment's remaining ₹${remaining / 100}.`,
    );
  }

  // Accumulate — a second partial payment must not overwrite the first.
  // Conditional on the amount we just read: a double click / two admins at
  // once can't record the same money twice (or issue two receipts).
  const prevPaid = installment.amountPaid || 0;
  const newPaid = prevPaid + paidAmount;
  const updated = await Installment.findOneAndUpdate(
    {
      _id: installment._id,
      amountPaid: installment.amountPaid,
      status: { $nin: [INSTALLMENT_STATUS.PAID, INSTALLMENT_STATUS.WAIVED] },
    },
    {
      $set: {
        amountPaid: newPaid,
        status: newPaid >= installment.amountDue ? INSTALLMENT_STATUS.PAID : INSTALLMENT_STATUS.PENDING,
        paymentMode: paymentMode || PAYMENT_MODE.CASH,
        recordedBy: req.user.userId,
        paidAt: new Date(),
        ...(notes && { notes }),
      },
    },
    { returnDocument: "after" },
  );
  if (!updated) {
    throw ApiError.conflict("This installment was just updated by someone else. Please refresh.");
  }

  // Update running total on the parent Payment record
  const allInstallments = await Installment.find({
    paymentId: installment.paymentId,
  });
  const installmentsPaid = allInstallments.reduce(
    (sum, i) => sum + (i.amountPaid || 0),
    0,
  );

  const payment = await Payment.findById(installment.paymentId);
  payment.amountPaid = (payment.downPayment || 0) + installmentsPaid;
  payment.status =
    payment.amountPaid >= payment.amountDue
      ? PAYMENT_STATUS.COMPLETED
      : PAYMENT_STATUS.PARTIAL;
  await payment.save();

  const subscription = await Subscription.findById(payment.subscriptionId);
  const receipt = await issueReceipt({
    payment,
    subscription,
    amount: paidAmount,
    type: RECEIPT_TYPE.INSTALLMENT,
    paymentMode: paymentMode || PAYMENT_MODE.CASH,
    installment: updated,
    recordedBy: req.user.userId,
    note: `Installment #${updated.installmentNumber}${updated.status === INSTALLMENT_STATUS.PAID ? "" : " (part payment)"}`,
  });

  return new ApiResponse(HTTP_STATUS.OK, "Installment marked as paid.", {
    installment: updated,
    receiptNumber: receipt?.receiptNumber,
    payment: {
      amountPaid: payment.amountPaid,
      amountDue: payment.amountDue,
      status: payment.status,
    },
  }).send(res);
});

// =============================================================================
// getAllSubscriptions
// GET /api/v1/admin/subscriptions
// =============================================================================

export const getAllSubscriptions = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = {};
  if (status) query.status = status;

  const [subscriptions, total] = await Promise.all([
    Subscription.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("userId", "firstName lastName email phoneNumber userId")
      .populate("planId", "name slug"),
    Subscription.countDocuments(query),
  ]);

  return new ApiResponse(HTTP_STATUS.OK, "Subscriptions retrieved.", {
    subscriptions,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  }).send(res);
});

// =============================================================================
// cancelSubscription
// PATCH /api/v1/admin/subscriptions/:id/cancel
// =============================================================================

export const cancelSubscription = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const subscription = await Subscription.findById(req.params.id);
  if (!subscription) throw ApiError.notFound("Subscription not found.");

  if (subscription.status === SUBSCRIPTION_STATUS.CANCELLED) {
    throw ApiError.conflict("Subscription is already cancelled.");
  }

  subscription.status = SUBSCRIPTION_STATUS.CANCELLED;
  subscription.cancelledAt = new Date();
  subscription.cancelReason = reason || "Cancelled by admin";
  await subscription.save();

  // Unpaid installments of a cancelled membership are no longer owed —
  // otherwise they sit in "Pending Installments" (and reminders) forever.
  await Installment.updateMany(
    {
      subscriptionId: subscription._id,
      status: { $in: [INSTALLMENT_STATUS.PENDING, INSTALLMENT_STATUS.OVERDUE] },
    },
    { $set: { status: INSTALLMENT_STATUS.WAIVED } },
  );

  return new ApiResponse(HTTP_STATUS.OK, "Subscription cancelled.", {
    subscription,
  }).send(res);
});

// =============================================================================
// getDashboardStats
// GET /api/v1/admin/dashboard
// =============================================================================
// Single endpoint returns all data needed for the admin dashboard.
// One call — no waterfall requests from the frontend.
// =============================================================================

export const getDashboardStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Start of current and last month
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
  );

  // ── KPIs ──────────────────────────────────────────────────────────────────
  // Membership stats count real members only — an admin/staff account that
  // holds a plan (e.g. for testing) must not inflate "Active Members".
  const memberIds = await User.distinct("_id", { role: "member" });
  const membersOnly = { userId: { $in: memberIds } };

  const [
    activeMembers,
    gracePeriodMembers,
    revenueThisMonth,
    revenueLastMonth,
    newMembersThisMonth,
    newMembersLastMonth,
    expiringSoonCount,
    totalMembers,
  ] = await Promise.all([
    Subscription.countDocuments({ status: SUBSCRIPTION_STATUS.ACTIVE, ...membersOnly }),
    Subscription.countDocuments({ status: SUBSCRIPTION_STATUS.GRACE, ...membersOnly }),

    Payment.aggregate([
      {
        $match: {
          status: { $in: [PAYMENT_STATUS.COMPLETED, PAYMENT_STATUS.PARTIAL] },
          paidAt: { $gte: startOfThisMonth },
        },
      },
      { $group: { _id: null, total: { $sum: "$amountPaid" } } },
    ]).then((r) => r[0]?.total || 0),

    Payment.aggregate([
      {
        $match: {
          status: { $in: [PAYMENT_STATUS.COMPLETED, PAYMENT_STATUS.PARTIAL] },
          paidAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
        },
      },
      { $group: { _id: null, total: { $sum: "$amountPaid" } } },
    ]).then((r) => r[0]?.total || 0),

    User.countDocuments({
      createdAt: { $gte: startOfThisMonth },
      role: "member",
    }),
    User.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
      role: "member",
    }),

    Subscription.countDocuments({
      status: SUBSCRIPTION_STATUS.ACTIVE,
      endDate: { $gte: now, $lte: sevenDays },
      ...membersOnly,
    }),

    User.countDocuments({ role: "member" }),
  ]);

  // ── Revenue last 6 months ──────────────────────────────────────────────────

  const revenueChart = await Payment.aggregate([
    {
      $match: {
        status: { $in: [PAYMENT_STATUS.COMPLETED, PAYMENT_STATUS.PARTIAL] },
        paidAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
      },
    },
    {
      $group: {
        _id: { year: { $year: "$paidAt" }, month: { $month: "$paidAt" } },
        revenue: { $sum: "$amountPaid" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]).then((rows) =>
    rows.map((r) => ({
      month: new Date(r._id.year, r._id.month - 1).toLocaleString("en-IN", {
        month: "short",
        year: "numeric",
      }),
      revenue: r.revenue,
    })),
  );

  // ── Plan distribution (active subscriptions) ──────────────────────────────

  const planDistribution = await Subscription.aggregate([
    {
      $match: {
        status: {
          $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.GRACE],
        },
        ...membersOnly,
      },
    },
    { $group: { _id: "$planSnapshot.planName", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).then((rows) => rows.map((r) => ({ plan: r._id, count: r.count })));

  // ── Expiring soon (within 7 days) ─────────────────────────────────────────

  const expiringSoon = await Subscription.find({
    status: SUBSCRIPTION_STATUS.ACTIVE,
    endDate: { $gte: now, $lte: sevenDays },
    ...membersOnly,
  })
    .sort({ endDate: 1 })
    .limit(10)
    .populate("userId", "firstName lastName email phoneNumber userId");

  // ── Pending / overdue installments ────────────────────────────────────────

  // Online payments that arrived while the member already had a plan
  const refundsDue = await Payment.find({ status: PAYMENT_STATUS.REFUND_DUE })
    .sort({ paidAt: -1 })
    .limit(20)
    .populate("userId", "firstName lastName email userId");

  const pendingInstallments = await Installment.find({
    status: { $in: [INSTALLMENT_STATUS.PENDING, INSTALLMENT_STATUS.OVERDUE] },
  })
    .sort({ dueDate: 1 })
    .limit(10)
    .populate("userId", "firstName lastName email userId");

  // ── Revenue trend (month-over-month % change) ─────────────────────────────

  const revenueTrend =
    revenueLastMonth > 0
      ? Math.round(
          ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100,
        )
      : null; // no baseline → frontend hides the badge

  const memberTrend =
    newMembersLastMonth > 0
      ? Math.round(
          ((newMembersThisMonth - newMembersLastMonth) / newMembersLastMonth) *
            100,
        )
      : null;

  return new ApiResponse(HTTP_STATUS.OK, "Dashboard stats retrieved.", {
    kpis: {
      activeMembers,
      gracePeriodMembers,
      totalMembers,
      revenueThisMonth,
      revenueLastMonth,
      revenueTrend, // % change vs last month
      newMembersThisMonth,
      newMembersLastMonth,
      memberTrend, // % change vs last month
      expiringThisWeek: expiringSoonCount,
    },
    revenueChart,
    planDistribution,
    expiringSoon,
    pendingInstallments,
    refundsDue,
  }).send(res);
});

// =============================================================================
// collectOutstandingBalance
// POST /api/v1/admin/subscriptions/:id/collect
// =============================================================================
// Records an additional payment against an EXISTING active subscription.
// Used when a member pays part of their outstanding installment balance.
// Does NOT create a new subscription.
// =============================================================================

export const collectOutstandingBalance = asyncHandler(async (req, res) => {
  const { amountPaid, paymentMode, notes } = req.body;

  const subscription = await Subscription.findById(req.params.id);
  if (!subscription) throw ApiError.notFound("Subscription not found.");
  if (subscription.status === SUBSCRIPTION_STATUS.CANCELLED) {
    throw ApiError.conflict("Cannot collect payment on a cancelled membership.");
  }

  const payment = await Payment.findOne({ subscriptionId: subscription._id });
  if (!payment) throw ApiError.notFound("Payment record not found.");

  const paidInPaise = Math.round(Number(amountPaid) * 100);
  if (!paidInPaise || paidInPaise <= 0) {
    throw ApiError.badRequest("Enter a valid amount.");
  }

  if (payment.amountPaid + paidInPaise > payment.amountDue) {
    throw ApiError.badRequest(
      `Payment of ₹${amountPaid} exceeds the outstanding balance of ₹${(payment.amountDue - payment.amountPaid) / 100}.`,
    );
  }

  // If an installment schedule exists, allocate the money to pending
  // installments (earliest first). payment.amountPaid is always derived as
  // downPayment + Σ installment.amountPaid — bumping it directly would be
  // wiped out the next time markInstallmentPaid recomputes the total.
  const pending = await Installment.find({
    paymentId: payment._id,
    status: { $in: [INSTALLMENT_STATUS.PENDING, INSTALLMENT_STATUS.OVERDUE] },
  }).sort({ installmentNumber: 1 });

  let newAmountPaid;
  const appliedTo = [];
  if (pending.length > 0) {
    let left = paidInPaise;
    for (const inst of pending) {
      if (left <= 0) break;
      const due = inst.amountDue - (inst.amountPaid || 0);
      const apply = Math.min(due, left);
      inst.amountPaid = (inst.amountPaid || 0) + apply;
      inst.paymentMode = paymentMode || PAYMENT_MODE.CASH;
      inst.recordedBy = req.user.userId;
      inst.paidAt = new Date();
      if (inst.amountPaid >= inst.amountDue) inst.status = INSTALLMENT_STATUS.PAID;
      await inst.save();
      appliedTo.push(`#${inst.installmentNumber}`);
      left -= apply;
    }
    const all = await Installment.find({ paymentId: payment._id });
    newAmountPaid =
      (payment.downPayment || 0) +
      all.reduce((sum, i) => sum + (i.amountPaid || 0), 0);
  } else {
    newAmountPaid = payment.amountPaid + paidInPaise;
  }

  payment.amountPaid = newAmountPaid;
  payment.status =
    newAmountPaid >= payment.amountDue
      ? PAYMENT_STATUS.COMPLETED
      : PAYMENT_STATUS.PARTIAL;
  if (notes) payment.notes = notes;
  await payment.save();

  const receipt = await issueReceipt({
    payment,
    subscription,
    amount: paidInPaise,
    type: RECEIPT_TYPE.BALANCE,
    paymentMode: paymentMode || PAYMENT_MODE.CASH,
    recordedBy: req.user.userId,
    note: appliedTo.length ? `Applied to installment ${appliedTo.join(", ")}` : "Balance payment",
  });

  return new ApiResponse(
    HTTP_STATUS.OK,
    `Payment of ₹${amountPaid} recorded (receipt ${receipt?.receiptNumber}). ${newAmountPaid >= payment.amountDue ? "Balance fully cleared." : `Balance remaining: ₹${(payment.amountDue - newAmountPaid) / 100}`}`,
    { payment, receipt },
  ).send(res);
});

// =============================================================================
// getRefunds
// GET /api/v1/admin/refunds
// =============================================================================
// Duplicate online payments waiting for a refund, plus the most recent
// refunds already sent (for the admin's records).
// =============================================================================
export const getRefunds = asyncHandler(async (req, res) => {
  const [due, history] = await Promise.all([
    Payment.find({ status: PAYMENT_STATUS.REFUND_DUE })
      .sort({ paidAt: -1 })
      .populate("userId", "firstName lastName email phoneNumber userId")
      .populate("planId", "name")
      .lean(),
    Payment.find({ status: PAYMENT_STATUS.REFUNDED })
      .sort({ "refund.initiatedAt": -1 })
      .limit(50)
      .populate("userId", "firstName lastName email userId")
      .populate("planId", "name")
      .populate("refund.initiatedBy", "firstName lastName")
      .lean(),
  ]);

  return new ApiResponse(HTTP_STATUS.OK, "Refunds retrieved.", { due, history }).send(res);
});

// =============================================================================
// refundDuplicatePayment
// POST /api/v1/admin/payments/:id/refund
// =============================================================================
// Refunds an online payment that was flagged REFUND_DUE (member paid while
// already holding an active plan). Full amount, back to the original method.
// A lock on the payment stops two admins (or a double click) refunding twice.
// =============================================================================

export const refundDuplicatePayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findOneAndUpdate(
    {
      _id: req.params.id,
      status: PAYMENT_STATUS.REFUND_DUE,
      "refund.refundId": null,
      "refund.lockedAt": null,
    },
    { $set: { "refund.lockedAt": new Date() } },
    { returnDocument: "after" },
  );

  if (!payment) {
    const existing = await Payment.findById(req.params.id).select("status refund");
    if (!existing) throw ApiError.notFound("Payment not found.");
    if (existing.status === PAYMENT_STATUS.REFUNDED) {
      throw ApiError.conflict("This payment has already been refunded.");
    }
    if (existing.status !== PAYMENT_STATUS.REFUND_DUE) {
      throw ApiError.badRequest("Only duplicate payments marked 'refund due' can be refunded here.");
    }
    throw ApiError.conflict("A refund for this payment is already in progress. Refresh in a moment.");
  }

  const razorpayPaymentId = payment.razorpay?.paymentId;
  const releaseLock = () =>
    Payment.updateOne({ _id: payment._id }, { $set: { "refund.lockedAt": null } });

  if (!razorpayPaymentId) {
    await releaseLock();
    throw ApiError.badRequest("This payment has no Razorpay payment ID to refund.");
  }

  let refund;
  try {
    refund = await razorpay.payments.refund(razorpayPaymentId, {
      amount: payment.amountPaid,
      speed: "normal",
      notes: { reason: "Duplicate payment", paymentRecord: payment._id.toString() },
    });
  } catch (err) {
    // Already refunded outside the app (e.g. from the Razorpay dashboard)?
    const description = err?.error?.description || err?.message || "";
    if (/fully refunded|already been refunded/i.test(description)) {
      try {
        const list = await razorpay.payments.fetchMultipleRefund(razorpayPaymentId);
        refund = list?.items?.[0];
      } catch {
        // fall through to the error below
      }
    }
    if (!refund) {
      await releaseLock();
      console.error("[REFUND] Razorpay refund failed:", description);
      throw ApiError.badRequest(description ? `Razorpay: ${description}` : "Refund failed at Razorpay. Please try again.");
    }
  }

  payment.status = PAYMENT_STATUS.REFUNDED;
  payment.refund = {
    refundId: refund.id,
    amount: refund.amount,
    status: refund.status,
    lockedAt: null,
    initiatedAt: new Date(),
    initiatedBy: req.user.userId,
  };
  await payment.save();

  // Tell the member — never block the admin on email
  (async () => {
    try {
      const user = await User.findById(payment.userId).select("firstName email isActive");
      if (user?.isActive) await sendRefundInitiatedEmail(user, payment);
    } catch (err) {
      console.error("[REFUND] Email failed:", err.message);
    }
  })();

  return new ApiResponse(HTTP_STATUS.OK, "Refund initiated. The member has been emailed.", {
    payment: { _id: payment._id, status: payment.status, refund: payment.refund },
  }).send(res);
});

// =============================================================================
// unlockMemberIdEntry
// POST /api/v1/admin/members/:id/id/unlock
// =============================================================================
// Front desk has checked the member's original ID and lets the member type it
// into their own profile — once, within ID_UNLOCK_MINUTES.
// =============================================================================

export const unlockMemberIdEntry = asyncHandler(async (req, res) => {
  const member = await unlockMemberId(req.params.id, req.user.userId, req.ip);

  return new ApiResponse(
    HTTP_STATUS.OK,
    `ID entry unlocked for ${ID_UNLOCK_MINUTES} minutes. Ask the member to open Profile → ID Proof.`,
    { idStatus: member.toJSON().idStatus },
  ).send(res);
});

// =============================================================================
// revealMemberIdNumber
// POST /api/v1/admin/members/:id/id/reveal
// =============================================================================
// Decrypts and returns the number for one admin click. Every call is logged.
// =============================================================================

export const revealMemberIdNumber = asyncHandler(async (req, res) => {
  const result = await revealMemberId(req.params.id, req.user.userId, req.ip);
  res.set("Cache-Control", "no-store");

  return new ApiResponse(HTTP_STATUS.OK, "ID number retrieved.", result).send(res);
});
