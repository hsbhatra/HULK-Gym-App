// =============================================================================
// src/models/payment.model.js
// =============================================================================

import mongoose from "mongoose";
import { PAYMENT_STATUS, PAYMENT_MODE } from "../utils/constants.js";

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId is required"],
      index: true,
    },

    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: [true, "subscriptionId is required"],
    },

    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MembershipPlan",
      required: [true, "planId is required"],
    },

    // Auto-generated receipt number e.g. "ATM-2026-00001"
    // First receipt issued for this membership. Set only when money is
    // actually received (see services/receipt.service.js) — pending
    // checkouts have none, hence sparse. Every individual payment also gets
    // its own Receipt document.
    receiptNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Total amount the member should pay (full plan price in paise)
    amountDue: {
      type: Number,
      required: [true, "amountDue is required"],
      min: [0, "Amount cannot be negative"],
    },

    // Amount actually received so far (in paise)
    // For full payments: amountPaid === amountDue
    // For partial: amountPaid < amountDue
    amountPaid: {
      type: Number,
      default: 0,
      min: [0, "Amount cannot be negative"],
    },

    // Amount paid at the time of subscription creation (for installment plans)
    downPayment: {
      type: Number,
      default: 0,
    },

    currency: {
      type: String,
      default: "INR",
    },

    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },

    paymentMode: {
      type: String,
      enum: Object.values(PAYMENT_MODE),
      required: [true, "paymentMode is required"],
    },

    // ── Online Payment Fields (Razorpay) ──────────────────────────────────────
    // Only populated for online payments
    razorpay: {
      orderId: { type: String, default: null }, // order_XXXXXXXXXX
      paymentId: { type: String, default: null }, // pay_XXXXXXXXXX
      signature: { type: String, default: null }, // HMAC signature
      method: { type: String, default: null }, // "upi", "card", "netbanking"
    },

    // ── Offline Payment Fields ────────────────────────────────────────────────
    // Only populated for cash/offline payments recorded by admin
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      // The admin who recorded this payment
    },

    paidAt: {
      type: Date,
      default: null,
      // For online: set when Razorpay webhook confirms payment
      // For offline: set by admin when recording payment
    },

    notes: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        // Never expose Razorpay signature in API responses
        if (ret.razorpay) delete ret.razorpay.signature;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// =============================================================================
// Indexes
// =============================================================================

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ "razorpay.orderId": 1 });

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
