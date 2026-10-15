// =============================================================================
// src/services/email/paymentEmail.service.js
// =============================================================================

import nodemailer from "nodemailer";
import { 
  EMAIL_CONFIG,
  GYM_CONFIG,
} from "../../utils/constants.js";
import { createTransporter, FROM_ADDRESS } from "./transporter.js";

const formatCurrency = (paise) => `₹${(paise / 100).toLocaleString("en-IN")}`;

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// =============================================================================
// sendPaymentReceipt
// =============================================================================
// Sent immediately after a successful online (Razorpay) payment.
// =============================================================================

export const sendPaymentReceipt = async (user, subscription, payment) => {
  const transporter = createTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="UTF-8" /></head>
      <body style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="520" cellpadding="0" cellspacing="0"
                style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">

                <tr>
                  <td style="background:#0a0a0a; padding:28px 32px;">
                    <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:700; letter-spacing:1px;">
                      💪 ${GYM_CONFIG.NAME.toUpperCase()}
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding:36px 32px;">
                    <div style="text-align:center; margin-bottom:28px;">
                      <div style="width:56px; height:56px; border-radius:50%; background:#e8f5e9;
                                  display:inline-flex; align-items:center; justify-content:center; font-size:26px;">
                        ✅
                      </div>
                      <h2 style="margin:16px 0 4px; color:#1a1a1a; font-size:20px;">Payment Successful</h2>
                      <p style="margin:0; color:#888; font-size:13px;">Thank you for joining HULK Gym, ${user.firstName}!</p>
                    </div>

                    <table width="100%" cellpadding="0" cellspacing="0"
                      style="background:#f9f9f9; border-radius:10px; padding:20px; margin-bottom:24px;">
                      <tr>
                        <td style="padding:6px 0; color:#888; font-size:13px;">Receipt Number</td>
                        <td style="padding:6px 0; color:#1a1a1a; font-size:13px; text-align:right; font-weight:600;">${payment.receiptNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; color:#888; font-size:13px;">Plan</td>
                        <td style="padding:6px 0; color:#1a1a1a; font-size:13px; text-align:right; font-weight:600;">${subscription.planSnapshot.planName} (${subscription.planSnapshot.durationLabel})</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; color:#888; font-size:13px;">Start Date</td>
                        <td style="padding:6px 0; color:#1a1a1a; font-size:13px; text-align:right;">${formatDate(subscription.startDate)}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; color:#888; font-size:13px;">Valid Until</td>
                        <td style="padding:6px 0; color:#1a1a1a; font-size:13px; text-align:right;">${formatDate(subscription.endDate)}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; color:#888; font-size:13px;">Payment Method</td>
                        <td style="padding:6px 0; color:#1a1a1a; font-size:13px; text-align:right; text-transform:uppercase;">${payment.razorpay?.method || "Online"}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0 0; border-top:1px solid #eee; color:#1a1a1a; font-size:15px; font-weight:700;">Amount Paid</td>
                        <td style="padding:12px 0 0; border-top:1px solid #eee; color:#e8a827; font-size:18px; text-align:right; font-weight:800;">${formatCurrency(payment.amountPaid)}</td>
                      </tr>
                    </table>

                    <p style="margin:0 0 8px; color:#888888; font-size:12px; text-align:center;">
                      Your membership is now active. See you at the gym! 💪
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="background:#f9f9f9; padding:20px 32px; border-top:1px solid #eeeeee;">
                    <p style="margin:0; color:#aaaaaa; font-size:12px; text-align:center;">
                      © ${new Date().getFullYear()} ${GYM_CONFIG.NAME}. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"${EMAIL_CONFIG.FROM_NAME}" <${FROM_ADDRESS}>`,
    to: user.email,
    subject: `Payment Receipt — ${payment.receiptNumber}`,
    html,
  });
};

// =============================================================================
// sendOfflinePaymentReceipt
// =============================================================================
// Sent when admin records a cash/offline payment.
// =============================================================================

export const sendOfflinePaymentReceipt = async (
  user,
  subscription,
  payment,
  isPartial,
) => {
  const transporter = createTransporter();

  const statusText = isPartial
    ? `Partial payment received. Balance: <strong style="color:#e8a827;">${formatCurrency(payment.amountDue - payment.amountPaid)}</strong>`
    : "Payment received in full.";

  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="UTF-8" /></head>
      <body style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="520" cellpadding="0" cellspacing="0"
                style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">

                <tr>
                  <td style="background:#0a0a0a; padding:28px 32px;">
                    <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:700; letter-spacing:1px;">
                      ${GYM_CONFIG.NAME}
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding:36px 32px;">
                    <h2 style="margin:0 0 8px; color:#1a1a1a; font-size:20px;">Membership Activated</h2>
                    <p style="margin:0 0 24px; color:#666; font-size:14px; line-height:1.6;">
                      Hi ${user.firstName}, your ${subscription.planSnapshot.planName} membership has been activated by our team. ${statusText}
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0"
                      style="background:#f9f9f9; border-radius:10px; padding:20px;">
                      <tr>
                        <td style="padding:6px 0; color:#888; font-size:13px;">Receipt Number</td>
                        <td style="padding:6px 0; color:#1a1a1a; font-size:13px; text-align:right; font-weight:600;">${payment.receiptNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; color:#888; font-size:13px;">Plan</td>
                        <td style="padding:6px 0; color:#1a1a1a; font-size:13px; text-align:right; font-weight:600;">${subscription.planSnapshot.planName} (${subscription.planSnapshot.durationLabel})</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; color:#888; font-size:13px;">Valid Until</td>
                        <td style="padding:6px 0; color:#1a1a1a; font-size:13px; text-align:right;">${formatDate(subscription.endDate)}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0 0; border-top:1px solid #eee; color:#1a1a1a; font-size:14px; font-weight:700;">Amount Paid</td>
                        <td style="padding:12px 0 0; border-top:1px solid #eee; color:#e8a827; font-size:16px; text-align:right; font-weight:800;">${formatCurrency(payment.amountPaid)}</td>
                      </tr>
                      ${
                        isPartial
                          ? `
                      <tr>
                        <td style="padding:4px 0; color:#888; font-size:13px;">Balance Due</td>
                        <td style="padding:4px 0; color:#ef4444; font-size:13px; text-align:right; font-weight:600;">${formatCurrency(payment.amountDue - payment.amountPaid)}</td>
                      </tr>`
                          : ""
                      }
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="background:#f9f9f9; padding:20px 32px; border-top:1px solid #eeeeee;">
                    <p style="margin:0; color:#aaaaaa; font-size:12px; text-align:center;">
                      © ${new Date().getFullYear()} ${GYM_CONFIG.NAME}. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"${EMAIL_CONFIG.FROM_NAME}" <${FROM_ADDRESS}>`,
    to: user.email,
    subject: `Membership Activated — ${payment.receiptNumber}`,
    html,
  });
};
