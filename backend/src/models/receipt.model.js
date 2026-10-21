// =============================================================================
// src/models/receipt.model.js
// =============================================================================
// One Receipt per money-received event: online payment, offline payment
// (full or down payment), installment payment, or balance collection.
// Receipt numbers come from an atomic counter, so they are only consumed
// when money actually arrives — no gaps from abandoned checkouts.
// =============================================================================

import mongoose from "mongoose";

export const RECEIPT_TYPE = {
  ONLINE     : "online",      // Razorpay
  OFFLINE    : "offline",     // admin recorded at sign-up (full or down payment)
  INSTALLMENT: "installment", // admin marked an installment paid
  BALANCE    : "balance",     // admin collected part of the outstanding balance
};

const receiptSchema = new mongoose.Schema(
  {
    receiptNumber : { type: String, required: true, unique: true },
    userId        : { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", required: true },
    paymentId     : { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true, index: true },
    installmentId : { type: mongoose.Schema.Types.ObjectId, ref: "Installment", default: null },

    type       : { type: String, enum: Object.values(RECEIPT_TYPE), required: true },
    amount     : { type: Number, required: true, min: 1 }, // paise received in THIS event
    paymentMode: { type: String, required: true },          // cash | upi | card | netbanking | ...
    razorpayPaymentId: { type: String, default: null },

    // Snapshot at the time of payment (receipts must never change later)
    planName      : { type: String, required: true },
    durationLabel : { type: String, required: true },
    totalDue      : { type: Number, required: true }, // plan price (paise)
    totalPaidAfter: { type: Number, required: true }, // cumulative paid after this receipt
    balanceAfter  : { type: Number, required: true }, // remaining after this receipt
    note          : { type: String, default: null },  // e.g. "Applied to installment #2, #3"

    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    paidAt    : { type: Date, default: Date.now },
    emailSent : { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  },
);

receiptSchema.index({ userId: 1, paidAt: -1 });

const Receipt = mongoose.model("Receipt", receiptSchema);
export default Receipt;
