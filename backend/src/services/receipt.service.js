// =============================================================================
// src/services/receipt.service.js
// =============================================================================
// issueReceipt() is the ONLY place receipts are created. Call it right after
// money is recorded (online, offline, installment, balance collection).
// =============================================================================

import Counter from "../models/counter.model.js";
import Receipt from "../models/receipt.model.js";
import Payment from "../models/payment.model.js";
import User from "../models/user.model.js";
import { RECEIPT_PREFIX } from "../utils/constants.js";
import { sendReceiptEmail } from "./email/receiptEmail.service.js";

const counterId = (year) => `receipt_${year}`;
const format = (year, seq) => `${RECEIPT_PREFIX}-${year}-${String(seq).padStart(5, "0")}`;

// Atomic — two payments at the same moment can never get the same number,
// and a number is only consumed when a receipt is actually issued.
export const nextReceiptNumber = async () => {
  const year = new Date().getFullYear();
  const c = await Counter.findOneAndUpdate(
    { _id: counterId(year) },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  return format(year, c.seq);
};

/**
 * @param {object} p
 * @param {import("mongoose").Document} p.payment      Payment doc AFTER amountPaid was updated
 * @param {import("mongoose").Document} p.subscription
 * @param {number} p.amount        paise received in this event (> 0)
 * @param {string} p.type          RECEIPT_TYPE
 * @param {string} p.paymentMode
 * @param {object} [p.installment]
 * @param {string} [p.note]
 * @param {string} [p.recordedBy]
 * @param {string} [p.razorpayPaymentId]
 */
export const issueReceipt = async ({
  payment, subscription, amount, type, paymentMode,
  installment = null, note = null, recordedBy = null, razorpayPaymentId = null,
}) => {
  if (!amount || amount <= 0) return null;

  const receipt = await Receipt.create({
    receiptNumber : await nextReceiptNumber(),
    userId        : payment.userId,
    subscriptionId: subscription._id,
    paymentId     : payment._id,
    installmentId : installment?._id || null,
    type,
    amount,
    paymentMode,
    razorpayPaymentId,
    planName      : subscription.planSnapshot.planName,
    durationLabel : subscription.planSnapshot.durationLabel,
    totalDue      : payment.amountDue,
    totalPaidAfter: payment.amountPaid,
    balanceAfter  : Math.max(0, payment.amountDue - payment.amountPaid),
    note,
    recordedBy,
    paidAt        : new Date(),
  });

  // Payment.receiptNumber = the first receipt for that membership (kept for
  // older screens that show a single receipt number)
  if (!payment.receiptNumber) {
    await Payment.updateOne(
      { _id: payment._id, receiptNumber: { $exists: false } },
      { $set: { receiptNumber: receipt.receiptNumber } },
    );
    payment.receiptNumber = receipt.receiptNumber;
  }

  // Email in the background — the member shouldn't wait several seconds for
  // the mail server, and a mail outage must never fail the payment itself.
  // emailSent flips to true once delivery to the provider succeeds.
  (async () => {
    try {
      const user = await User.findById(payment.userId);
      if (!user?.email) return;
      await sendReceiptEmail(user, receipt, subscription);
      await Receipt.updateOne({ _id: receipt._id }, { $set: { emailSent: true } });
    } catch (err) {
      console.error(`Receipt email failed (${receipt.receiptNumber}):`, err.message);
    }
  })();

  return receipt;
};
