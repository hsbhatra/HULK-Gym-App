// =============================================================================
// src/services/subscription.service.js
// =============================================================================
// Online (Razorpay) membership purchase.
//
// Double-payment protection, in three layers:
//   1. ONE open checkout per member — opening checkout again for the same
//      plan/duration reuses the same Razorpay order (Razorpay refuses to
//      take a second payment on an order that is already paid).
//   2. RECONCILE before charging again — if an earlier order was in fact
//      paid (tab closed before verify, webhook late), activate it instead
//      of creating a new charge.
//   3. GUARD at activation — if, despite the above, a second payment lands
//      while the member already has an active plan, it is marked
//      REFUND_DUE (no second membership) and shown to the admin.
// =============================================================================

import crypto from "crypto";
import razorpay from "../config/razorpay.js";
import Subscription from "../models/subscription.model.js";
import Payment from "../models/payment.model.js";
import Installment from "../models/installment.model.js";
import MembershipPlan from "../models/membershipPlan.model.js";
import Receipt, { RECEIPT_TYPE } from "../models/receipt.model.js";
import ApiError from "../utils/apiError.js";
import {
  SUBSCRIPTION_STATUS,
  PAYMENT_STATUS,
  PAYMENT_MODE,
  GRACE_PERIOD_DAYS,
} from "../utils/constants.js";
import { issueReceipt } from "./receipt.service.js";
import { sendDuplicatePaymentEmail } from "./email/receiptEmail.service.js";

const REUSE_WINDOW_MS = 30 * 60 * 1000;          // reuse an open order for 30 min
const RECONCILE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // look back 3 days for paid-but-unrecorded

const ACTIVE_STATUSES = [
  SUBSCRIPTION_STATUS.ACTIVE,
  SUBSCRIPTION_STATUS.GRACE,
  SUBSCRIPTION_STATUS.COMPLIMENTARY,
];

const orderResponse = (payment, plan, label) => ({
  razorpayOrderId: payment.razorpay.orderId,
  amount         : payment.amountDue,
  currency       : "INR",
  keyId          : process.env.RAZORPAY_KEY_ID,
  subscriptionId : payment.subscriptionId,
  paymentId      : payment._id,
  planName       : plan.name,
  durationLabel  : label,
});

// =============================================================================
// completeOnlinePayment — shared by verify (frontend) and webhook
// =============================================================================
// Safe to call concurrently: only ONE caller wins the atomic status change,
// so the membership is activated and the receipt/email sent exactly once.
// =============================================================================

export const completeOnlinePayment = async ({ orderId, razorpayPaymentId, method }) => {
  const existing = await Payment.findOne({ "razorpay.orderId": orderId });
  if (!existing) throw ApiError.notFound("Payment record not found for this order.");

  const done = [PAYMENT_STATUS.COMPLETED, PAYMENT_STATUS.REFUND_DUE];
  if (done.includes(existing.status)) {
    const subscription = await Subscription.findById(existing.subscriptionId);
    return {
      payment: existing,
      subscription,
      alreadyProcessed: true,
      duplicate: existing.status === PAYMENT_STATUS.REFUND_DUE,
    };
  }

  const now = new Date();
  const payment = await Payment.findOneAndUpdate(
    { _id: existing._id, status: { $in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.FAILED] } },
    {
      $set: {
        status               : PAYMENT_STATUS.COMPLETED,
        amountPaid           : existing.amountDue,
        "razorpay.paymentId" : razorpayPaymentId,
        "razorpay.method"    : method || "online",
        paidAt               : now,
      },
    },
    { returnDocument: "after" },
  );

  // Lost the race — the other caller is handling it
  if (!payment) {
    const fresh = await Payment.findById(existing._id);
    const subscription = await Subscription.findById(fresh.subscriptionId);
    return {
      payment: fresh,
      subscription,
      alreadyProcessed: true,
      duplicate: fresh.status === PAYMENT_STATUS.REFUND_DUE,
    };
  }

  const subscription = await Subscription.findById(payment.subscriptionId).populate("userId");

  // ── Layer 3: duplicate guard ──────────────────────────────────────────────
  const otherActive = await Subscription.findOne({
    userId         : payment.userId,
    _id            : { $ne: subscription._id },
    status         : { $in: ACTIVE_STATUSES },
    gracePeriodEnds: { $gt: now },
  });

  if (otherActive) {
    payment.status = PAYMENT_STATUS.REFUND_DUE;
    payment.notes  = `Duplicate payment — member already had an active ${otherActive.planSnapshot?.planName} plan. Refund due.`;
    await payment.save();

    subscription.status       = SUBSCRIPTION_STATUS.CANCELLED;
    subscription.cancelledAt  = now;
    subscription.cancelReason = "Duplicate payment — refund due";
    await subscription.save();

    sendDuplicatePaymentEmail(subscription.userId, payment, subscription.planSnapshot.planName)
      .catch((err) => console.error("Duplicate-payment email failed:", err.message));
    return { payment, subscription, alreadyProcessed: false, duplicate: true };
  }

  // ── Activate — membership runs from the moment of payment ────────────────
  const days = subscription.planSnapshot.durationDays;
  const grace = subscription.planSnapshot.gracePeriodDays || GRACE_PERIOD_DAYS;
  subscription.startDate = now;
  subscription.endDate = new Date(now.getTime() + days * 86400000);
  subscription.gracePeriodEnds = new Date(subscription.endDate.getTime() + grace * 86400000);
  subscription.status = SUBSCRIPTION_STATUS.ACTIVE;
  subscription.activatedAt = now;
  await subscription.save();

  await issueReceipt({
    payment,
    subscription,
    amount           : payment.amountDue,
    type             : RECEIPT_TYPE.ONLINE,
    paymentMode      : method || "razorpay",
    razorpayPaymentId,
  });

  return { payment, subscription, alreadyProcessed: false, duplicate: false };
};

// =============================================================================
// Layer 2: reconcile — was any recent open order actually paid?
// =============================================================================

const reconcileOpenOrders = async (openPayments) => {
  for (const p of openPayments) {
    let order;
    try {
      order = await razorpay.orders.fetch(p.razorpay.orderId);
    } catch {
      continue; // Razorpay unreachable — don't block the member
    }
    if (order.status !== "paid") continue;

    const { items = [] } = await razorpay.orders.fetchPayments(order.id).catch(() => ({}));
    const captured = items.find((x) => x.status === "captured");
    if (!captured) continue;

    return completeOnlinePayment({
      orderId          : order.id,
      razorpayPaymentId: captured.id,
      method           : captured.method,
    });
  }
  return null;
};

// =============================================================================
// initiateSubscription
// =============================================================================

export const initiateSubscription = async (userId, planId, durationDays) => {
  const plan = await MembershipPlan.findById(planId);
  if (!plan || plan.status !== "active") {
    throw ApiError.notFound("This membership plan is not available.");
  }

  const tier = plan.getTier(durationDays);
  if (!tier) throw ApiError.badRequest("Invalid plan duration selected.");

  const existingActive = await Subscription.findActiveSubscription(userId);
  if (existingActive) {
    throw ApiError.conflict(
      "You already have an active membership. Please wait until it expires to purchase a new plan.",
    );
  }

  const now = Date.now();
  const openPayments = await Payment.find({
    userId,
    paymentMode       : PAYMENT_MODE.RAZORPAY,
    status            : { $in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.FAILED] },
    "razorpay.orderId": { $ne: null },
    createdAt         : { $gt: new Date(now - RECONCILE_WINDOW_MS) },
  })
    .sort({ createdAt: -1 })
    .populate("subscriptionId");

  // Layer 2
  const reconciled = await reconcileOpenOrders(openPayments);
  if (reconciled && !reconciled.duplicate) {
    throw ApiError.conflict(
      `Your earlier payment for ${reconciled.subscription.planSnapshot.planName} was successful — your membership is now active.`,
    );
  }

  const amountInPaise = plan.getEffectivePrice(durationDays);

  // Layer 1: reuse the open order for the same plan + duration + price
  const reusable = openPayments.find(
    (p) =>
      p.status === PAYMENT_STATUS.PENDING &&
      p.createdAt.getTime() > now - REUSE_WINDOW_MS &&
      String(p.planId) === String(plan._id) &&
      p.subscriptionId?.planSnapshot?.durationDays === durationDays &&
      p.amountDue === amountInPaise,
  );
  if (reusable) return orderResponse(reusable, plan, tier.label);

  // New order
  const razorpayOrder = await razorpay.orders.create({
    amount  : amountInPaise,
    currency: "INR",
    receipt : `order_rcpt_${now}`,
    notes   : { userId: String(userId), planId: String(planId), durationDays },
  });

  // Dates are provisional — recalculated at the moment payment succeeds
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + durationDays);
  const gracePeriodEnds = new Date(endDate);
  gracePeriodEnds.setDate(gracePeriodEnds.getDate() + (plan.gracePeriodDays || GRACE_PERIOD_DAYS));

  const subscription = await Subscription.create({
    userId,
    planId,
    planSnapshot: {
      planName       : plan.name,
      planSlug       : plan.slug,
      durationDays,
      durationLabel  : tier.label,
      features       : plan.features,
      price          : amountInPaise,
      gracePeriodDays: plan.gracePeriodDays || GRACE_PERIOD_DAYS,
    },
    status     : SUBSCRIPTION_STATUS.PENDING,
    paymentMode: PAYMENT_MODE.RAZORPAY,
    startDate,
    endDate,
    gracePeriodEnds,
  });

  // No receipt number yet — it is issued only when money is received
  const payment = await Payment.create({
    userId,
    subscriptionId: subscription._id,
    planId,
    amountDue  : amountInPaise,
    amountPaid : 0,
    status     : PAYMENT_STATUS.PENDING,
    paymentMode: PAYMENT_MODE.RAZORPAY,
    razorpay   : { orderId: razorpayOrder.id },
  });

  return orderResponse(payment, plan, tier.label);
};

// =============================================================================
// verifyAndActivateSubscription — frontend path (after checkout success)
// =============================================================================

export const verifyAndActivateSubscription = async (orderId, paymentId, signature) => {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature || ""));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw ApiError.unauthorized("Payment verification failed. Signature mismatch.");
  }

  let method = "online";
  try {
    method = (await razorpay.payments.fetch(paymentId)).method || method;
  } catch {
    // non-critical
  }

  return completeOnlinePayment({ orderId, razorpayPaymentId: paymentId, method });
};

// =============================================================================
// Reads
// =============================================================================

export const getMySubscriptionHistory = async (userId) => {
  // Pending = checkout opened but never paid — hide it, otherwise an
  // abandoned attempt shows next to the real plan like a double charge.
  return await Subscription.find({ userId, status: { $ne: SUBSCRIPTION_STATUS.PENDING } })
    .sort({ createdAt: -1 })
    .populate("planId", "name slug");
};

export const getMyActiveSubscription = async (userId) => {
  const subscription = await Subscription.findActiveSubscription(userId);
  if (!subscription) return null;

  const payment = await Payment.findOne({ subscriptionId: subscription._id });
  const installments = payment
    ? await Installment.find({ paymentId: payment._id }).sort({ installmentNumber: 1 })
    : [];

  return { subscription, payment, installments };
};

export const getMyReceipts = async (userId) =>
  Receipt.find({ userId }).sort({ paidAt: -1 }).limit(100);
