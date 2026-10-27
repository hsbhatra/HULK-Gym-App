// =============================================================================
// src/controllers/webhook.controller.js
// =============================================================================

import crypto from "crypto";
import asyncHandler from "../utils/asyncHandler.js";
import Payment from "../models/payment.model.js";
import { completeOnlinePayment } from "../services/subscription.service.js";
import { SUBSCRIPTION_STATUS, PAYMENT_STATUS } from "../utils/constants.js";

// =============================================================================
// razorpayWebhook
// POST /api/v1/webhooks/razorpay
// =============================================================================
// Receives server-to-server payment confirmation from Razorpay.
// This is the SOURCE OF TRUTH for payment activation — cannot be faked
// because we verify the signature using our webhook secret.
//
// IMPORTANT: This route must receive the RAW request body (not parsed JSON)
// for signature verification to work. See app.js for the special raw body
// middleware applied only to this route.
// =============================================================================

export const razorpayWebhook = asyncHandler(async (req, res) => {
  const webhookSignature = req.headers["x-razorpay-signature"];
  const webhookSecret    = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("RAZORPAY_WEBHOOK_SECRET is not set — webhook ignored. Add it to .env and restart.");
    return res.status(500).json({ success: false, message: "Webhook not configured" });
  }

  // Verify this request genuinely came from Razorpay
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(req.body) // raw buffer, not parsed JSON
    .digest("hex");

  const sigOk =
    typeof webhookSignature === "string" &&
    webhookSignature.length === expectedSignature.length &&
    crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(webhookSignature));
  if (!sigOk) {
    console.error("Webhook signature mismatch — possible spoofed request");
    return res.status(400).json({ success: false, message: "Invalid signature" });
  }

  // Signature confirmed genuine — now safe to parse the body
  const event = JSON.parse(req.body.toString());
  console.log("Razorpay webhook received:", event.event);

  // ── payment.captured / order.paid — activate the subscription ──────────────
  if (event.event === "payment.captured" || event.event === "order.paid") {
    const paymentEntity = event.payload.payment.entity;
    try {
      // Same code path as frontend verify — atomic, idempotent, issues the
      // receipt + email once, and flags duplicates as REFUND_DUE.
      await completeOnlinePayment({
        orderId          : paymentEntity.order_id,
        razorpayPaymentId: paymentEntity.id,
        method           : paymentEntity.method,
        paidAmount       : paymentEntity.amount,
        currency         : paymentEntity.currency,
      });
    } catch (err) {
      // Unknown order (e.g. created by another app on the same account)
      console.error("Webhook completion skipped:", err.message);
    }
  }

  if (event.event === "payment.failed") {
    const paymentEntity = event.payload.payment.entity;
    const orderId = paymentEntity.order_id;

    const payment = await Payment.findOne({ "razorpay.orderId": orderId });
    if (payment && payment.status === PAYMENT_STATUS.PENDING) {
      payment.status = PAYMENT_STATUS.FAILED;
      await payment.save();
    }
  }

  // Always respond 200 quickly — acknowledges receipt to Razorpay
  return res.status(200).json({ success: true });
});
