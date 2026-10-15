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
import { sendOfflinePaymentReceipt } from "../services/email/paymentEmail.service.js";

// =============================================================================
// searchMembers
// GET /api/v1/admin/members?q=search_term
// =============================================================================

export const searchMembers = asyncHandler(async (req, res) => {
  const { q = "", page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const trimmed = q.trim() || "gym"; // default shows all members

  const orConditions = [
    { firstName: { $regex: trimmed, $options: "i" } },
    { lastName: { $regex: trimmed, $options: "i" } },
    { email: { $regex: trimmed, $options: "i" } },
    { phoneNumber: { $regex: trimmed, $options: "i" } },
    { userId: { $regex: trimmed, $options: "i" } },
  ];

  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    for (let i = 1; i < parts.length; i++) {
      const firstPart = parts.slice(0, i).join(" ");
      const lastPart = parts.slice(i).join(" ");
      orConditions.push(
        {
          $and: [
            { firstName: { $regex: firstPart, $options: "i" } },
            { lastName: { $regex: lastPart, $options: "i" } },
          ],
        },
        {
          $and: [
            { firstName: { $regex: lastPart, $options: "i" } },
            { lastName: { $regex: firstPart, $options: "i" } },
          ],
        },
      );
    }
  }

  const [members, total] = await Promise.all([
    User.find({ $or: orConditions })
      .select(
        "firstName lastName email phoneNumber userId role isActive profilePicture",
      )
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: 1 }),
    User.countDocuments({ $or: orConditions }),
  ]);

  return new ApiResponse(HTTP_STATUS.OK, "Members retrieved.", {
    members,
    total,
    page: Number(page),
    limit: Number(limit),
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
  const subscriptionHistory = await Subscription.find({ userId: req.params.id })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("planId", "name slug");

  // Get payment history
  const paymentHistory = await Payment.find({ userId: req.params.id })
    .sort({ createdAt: -1 })
    .limit(10);

  // ── NEW: fetch installments for each payment ─────────────────────────────
  const paymentIds = paymentHistory.map((p) => p._id);
  const installments = await Installment.find({
    paymentId: { $in: paymentIds },
  }).sort({ installmentNumber: 1 });

  return new ApiResponse(HTTP_STATUS.OK, "Member profile retrieved.", {
    user,
    activeSubscription,
    subscriptionHistory,
    paymentHistory,
    installments,
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

  const isPartial = !isComplimentary && totalAmountPaid < totalAmountDue;
  const isFull = isComplimentary || totalAmountPaid >= totalAmountDue;

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

  // ── Create Payment Record ──────────────────────────────────────────────────
  const receiptNumber = await Payment.generateReceiptNumber();

  const payment = await Payment.create({
    userId,
    subscriptionId: subscription._id,
    planId,
    receiptNumber,
    amountDue: totalAmountDue,
    amountPaid: totalAmountPaid,
    currency: "INR",
    status: isFull ? PAYMENT_STATUS.COMPLETED : PAYMENT_STATUS.PARTIAL,
    paymentMode: finalPaymentMode,
    recordedBy: req.user.userId,
    paidAt: new Date(),
    notes,
  });

  // ── Create Installments (only for partial payments) ────────────────────────
  // Block installments if full payment was received — no point tracking them
  let createdInstallments = [];
  if (
    installments &&
    installments.length > 0 &&
    !isComplimentary &&
    isPartial
  ) {
    const installmentDocs = installments.map((inst, i) => ({
      paymentId: payment._id,
      subscriptionId: subscription._id,
      userId,
      installmentNumber: i + 1,
      amountDue: Math.round(Number(inst.amountDue) * 100), // ₹ → paise
      amountPaid: i === 0 ? totalAmountPaid : 0, // first installment = amount already paid
      dueDate: new Date(inst.dueDate),
      status: i === 0 ? INSTALLMENT_STATUS.PAID : INSTALLMENT_STATUS.PENDING,
      paymentMode: i === 0 ? finalPaymentMode : null,
      recordedBy: req.user.userId,
      paidAt: i === 0 ? new Date() : null,
    }));

    createdInstallments = await Installment.insertMany(installmentDocs);
  }

  // ── Send Email ─────────────────────────────────────────────────────────────
  try {
    await sendOfflinePaymentReceipt(user, subscription, payment, isPartial);
  } catch (err) {
    console.error("Failed to send offline payment receipt:", err.message);
  }

  return new ApiResponse(
    HTTP_STATUS.CREATED,
    `Membership activated. ${isPartial ? `Partial payment recorded. Balance due: ₹${((totalAmountDue - totalAmountPaid) / 100).toFixed(2)}` : "Full payment received."}`,
    { subscription, payment, installments: createdInstallments },
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

  const paidAmount = Math.round(Number(amountPaid) * 100); // ₹ → paise

  installment.amountPaid = paidAmount;
  installment.status =
    paidAmount >= installment.amountDue
      ? INSTALLMENT_STATUS.PAID
      : INSTALLMENT_STATUS.PENDING;
  installment.paymentMode = paymentMode || PAYMENT_MODE.CASH;
  installment.recordedBy = req.user.userId;
  installment.paidAt = new Date();
  if (notes) installment.notes = notes;
  await installment.save();

  // Update running total on the parent Payment record
  const allInstallments = await Installment.find({
    paymentId: installment.paymentId,
  });
  const totalPaid = allInstallments.reduce(
    (sum, i) => sum + (i.amountPaid || 0),
    0,
  );

  const payment = await Payment.findById(installment.paymentId);
  payment.amountPaid = totalPaid;
  payment.status =
    totalPaid >= payment.amountDue
      ? PAYMENT_STATUS.COMPLETED
      : PAYMENT_STATUS.PARTIAL;
  await payment.save();

  return new ApiResponse(HTTP_STATUS.OK, "Installment marked as paid.", {
    installment,
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

  return new ApiResponse(HTTP_STATUS.OK, "Subscription cancelled.", {
    subscription,
  }).send(res);
});
