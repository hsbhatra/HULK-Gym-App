// =============================================================================
// src/services/email/receiptEmail.service.js
// =============================================================================
// One email per receipt — sent for every payment a member makes:
// online, offline (full / down payment), installment, balance collection.
// =============================================================================

import { GYM_CONFIG } from "../../utils/constants.js";
import { sendEmail } from "./transporter.js";

const inr = (paise) => `₹${(paise / 100).toLocaleString("en-IN")}`;
const date = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
const dateTime = (d) =>
  new Date(d).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: "Asia/Kolkata",
  });

// Escape anything that came from user/admin input before it goes into HTML
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const MODE_LABEL = {
  razorpay: "Online", card: "Card", upi: "UPI", netbanking: "Net Banking",
  wallet: "Wallet", cash: "Cash", emi: "EMI",
};
const TYPE_TITLE = {
  online     : "Payment Successful",
  offline    : "Payment Received",
  installment: "Installment Payment Received",
  balance    : "Payment Received",
};

const row = (label, value, opts = {}) => `
  <tr>
    <td style="padding:7px 0; color:#888; font-size:13px;">${label}</td>
    <td style="padding:7px 0; color:${opts.color || "#1a1a1a"}; font-size:${opts.size || "13px"};
               text-align:right; font-weight:${opts.bold ? "700" : "500"};">${value}</td>
  </tr>`;

const shell = (inner) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8" /></head>
<body style="margin:0; padding:0; background:#f4f4f4; font-family:Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0"
        style="max-width:520px; background:#ffffff; border-radius:12px; overflow:hidden;">
        <tr><td style="background:#0a0a0a; padding:24px 28px;">
          <h1 style="margin:0; color:#e8c44a; font-size:20px; letter-spacing:1px;">
            💪 ${esc(GYM_CONFIG.NAME.toUpperCase())}
          </h1>
        </td></tr>
        <tr><td style="padding:28px;">${inner}</td></tr>
        <tr><td style="background:#f9f9f9; padding:16px 28px; border-top:1px solid #eee;">
          <p style="margin:0; color:#aaa; font-size:11px; text-align:center;">
            This is a computer-generated receipt. © ${new Date().getFullYear()} ${esc(GYM_CONFIG.NAME)}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

// -----------------------------------------------------------------------------
// sendReceiptEmail — every payment
// -----------------------------------------------------------------------------
export const sendReceiptEmail = async (user, receipt, subscription) => {
  const fullyPaid = receipt.balanceAfter <= 0;
  const mode = MODE_LABEL[receipt.paymentMode] || receipt.paymentMode;

  const inner = `
    <h2 style="margin:0 0 6px; color:#1a1a1a; font-size:20px;">${TYPE_TITLE[receipt.type] || "Payment Received"}</h2>
    <p style="margin:0 0 22px; color:#666; font-size:14px; line-height:1.6;">
      Hi ${esc(user.firstName)}, we have received your payment of
      <strong>${inr(receipt.amount)}</strong>. Thank you!
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#f9f9f9; border-radius:10px; padding:18px 20px; margin-bottom:18px;">
      ${row("Receipt No.", esc(receipt.receiptNumber), { bold: true })}
      ${row("Date", dateTime(receipt.paidAt))}
      ${row("Member", `${esc(user.firstName)} ${esc(user.lastName)}${user.userId ? ` (${esc(user.userId)})` : ""}`)}
      ${row("Plan", `${esc(receipt.planName)} — ${esc(receipt.durationLabel)}`)}
      ${subscription ? row("Membership", `${date(subscription.startDate)} → ${date(subscription.endDate)}`) : ""}
      ${row("Payment Mode", esc(mode))}
      ${receipt.razorpayPaymentId ? row("Transaction ID", esc(receipt.razorpayPaymentId)) : ""}
      ${receipt.note ? row("Note", esc(receipt.note)) : ""}
      <tr><td colspan="2" style="border-top:1px solid #e5e5e5; padding-top:6px;"></td></tr>
      ${row("Amount Paid", inr(receipt.amount), { bold: true, color: "#c9961a", size: "17px" })}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0"
      style="border:1px solid #eee; border-radius:10px; padding:14px 20px;">
      ${row("Plan Price", inr(receipt.totalDue))}
      ${row("Total Paid So Far", inr(receipt.totalPaidAfter))}
      ${row("Balance Due", fullyPaid ? "Nil — fully paid ✓" : inr(receipt.balanceAfter),
            { bold: true, color: fullyPaid ? "#16a34a" : "#dc2626" })}
    </table>

    <p style="margin:20px 0 0; color:#888; font-size:12px; text-align:center;">
      Keep this email for your records. See you at the gym! 💪
    </p>`;

  await sendEmail({
    to: user.email,
    subject: `Payment Receipt ${receipt.receiptNumber} — ${inr(receipt.amount)} received`,
    html: shell(inner),
  });
};

// -----------------------------------------------------------------------------
// sendComplimentaryEmail — free membership (no money → no receipt)
// -----------------------------------------------------------------------------
export const sendComplimentaryEmail = async (user, subscription) => {
  const inner = `
    <h2 style="margin:0 0 6px; color:#1a1a1a; font-size:20px;">Membership Activated 🎉</h2>
    <p style="margin:0 0 20px; color:#666; font-size:14px; line-height:1.6;">
      Hi ${esc(user.firstName)}, you have been given a complimentary
      <strong>${esc(subscription.planSnapshot.planName)} — ${esc(subscription.planSnapshot.durationLabel)}</strong>
      membership.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#f9f9f9; border-radius:10px; padding:18px 20px;">
      ${row("Valid From", date(subscription.startDate))}
      ${row("Valid Until", date(subscription.endDate))}
      ${row("Amount", "Complimentary", { bold: true, color: "#16a34a" })}
    </table>`;

  await sendEmail({
    to: user.email,
    subject: `Your ${GYM_CONFIG.NAME} membership is active`,
    html: shell(inner),
  });
};

// -----------------------------------------------------------------------------
// sendDuplicatePaymentEmail — paid again while already having an active plan
// -----------------------------------------------------------------------------
export const sendDuplicatePaymentEmail = async (user, payment, planName) => {
  const inner = `
    <h2 style="margin:0 0 6px; color:#1a1a1a; font-size:20px;">Duplicate Payment Received</h2>
    <p style="margin:0 0 20px; color:#666; font-size:14px; line-height:1.6;">
      Hi ${esc(user.firstName)}, we received a payment of <strong>${inr(payment.amountPaid)}</strong>
      for <strong>${esc(planName)}</strong>, but you already have an active membership.
      This extra payment will be <strong>refunded</strong> to your original payment method.
      You don't need to do anything.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#f9f9f9; border-radius:10px; padding:18px 20px;">
      ${row("Transaction ID", esc(payment.razorpay?.paymentId || "—"))}
      ${row("Amount", inr(payment.amountPaid), { bold: true })}
      ${row("Status", "Refund pending", { bold: true, color: "#dc2626" })}
    </table>`;

  await sendEmail({
    to: user.email,
    subject: `Duplicate payment received — refund will be processed`,
    html: shell(inner),
  });
};

// -----------------------------------------------------------------------------
// sendRefundInitiatedEmail — admin refunded a duplicate online payment
// -----------------------------------------------------------------------------
export const sendRefundInitiatedEmail = async (user, payment) => {
  const inner = `
    <h2 style="margin:0 0 6px; color:#1a1a1a; font-size:20px;">Refund Initiated</h2>
    <p style="margin:0 0 20px; color:#666; font-size:14px; line-height:1.6;">
      Hi ${esc(user.firstName)}, we've refunded your duplicate payment of
      <strong>${inr(payment.refund?.amount ?? payment.amountPaid)}</strong> to your original payment method.
      Banks usually take 5–7 working days to show it in your account.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#f9f9f9; border-radius:10px; padding:18px 20px;">
      ${row("Payment ID", esc(payment.razorpay?.paymentId || "—"))}
      ${row("Refund ID", esc(payment.refund?.refundId || "—"))}
      ${row("Amount", inr(payment.refund?.amount ?? payment.amountPaid), { bold: true })}
    </table>`;

  await sendEmail({
    to: user.email,
    subject: "Your refund has been initiated — Hulk Gym",
    html: shell(inner),
  });
};

// -----------------------------------------------------------------------------
// Account deletion — the gym's decision on the member's request
// `contact` = { email, firstName } (captured before the account was erased)
// -----------------------------------------------------------------------------
export const sendDeletionApprovedEmail = async (contact) => {
  const inner = `
    <h2 style="margin:0 0 6px; color:#1a1a1a; font-size:20px;">Your account has been deleted</h2>
    <p style="margin:0 0 14px; color:#666; font-size:14px; line-height:1.6;">
      Hi ${esc(contact.firstName)}, we approved your request. Your name, email, phone number,
      photo, profile details and ID details have been erased, and you are signed out everywhere.
    </p>
    <p style="margin:0; color:#666; font-size:14px; line-height:1.6;">
      Payment and receipt records are kept for as long as tax and accounting laws require,
      without your personal details. Thank you for training with us.
    </p>`;

  await sendEmail({
    to: contact.email,
    subject: `Your ${GYM_CONFIG.NAME} account has been deleted`,
    html: shell(inner),
  });
};

export const sendDeletionRejectedEmail = async (user, note) => {
  const inner = `
    <h2 style="margin:0 0 6px; color:#1a1a1a; font-size:20px;">We couldn't delete your account yet</h2>
    <p style="margin:0 0 14px; color:#666; font-size:14px; line-height:1.6;">
      Hi ${esc(user.firstName)}, we reviewed your request to delete your account, and we
      can't do it right now.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#f9f9f9; border-radius:10px; padding:16px 20px; margin-bottom:14px;">
      ${row("Reason", esc(note), { bold: true })}
    </table>
    <p style="margin:0; color:#666; font-size:14px; line-height:1.6;">
      Your account is unchanged. Once this is sorted out you can send a new request from
      My profile, or speak to the front desk.
    </p>`;

  await sendEmail({
    to: user.email,
    subject: `About your account deletion request — ${GYM_CONFIG.NAME}`,
    html: shell(inner),
  });
};
