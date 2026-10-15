// =============================================================================
// src/jobs/subscriptionReminder.job.js
// =============================================================================
// Runs daily at 8:00 AM IST.
// Checks for subscriptions expiring in 7, 3, and 1 days and sends reminder
// emails. Also marks overdue installments and expired subscriptions.
// =============================================================================

import cron from "node-cron";
import Subscription from "../models/subscription.model.js";
import Installment  from "../models/installment.model.js";
import { SUBSCRIPTION_STATUS, INSTALLMENT_STATUS, REMINDER_DAYS, EMAIL_CONFIG } from "../utils/constants.js";
import { createTransporter, FROM_ADDRESS } from "../services/email/transporter.js";

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

// =============================================================================
// sendReminderEmail
// =============================================================================

const sendReminderEmail = async (user, subscription, daysLeft) => {
  const transporter = createTransporter();
  const isExpired   = daysLeft <= 0;

  const subject = isExpired
    ? `Your HULK Gym membership has expired`
    : `Your membership expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
          <tr><td align="center">
            <table width="520" cellpadding="0" cellspacing="0"
              style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
              <tr>
                <td style="background:#0a0a0a;padding:28px 32px;">
                  <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;letter-spacing:1px;">⚡ HULK GYM</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:36px 32px;">
                  <h2 style="margin:0 0 12px;color:#1a1a1a;font-size:20px;">
                    ${isExpired ? "⏱️ Membership Expired" : `⚠️ Expiring in ${daysLeft} Day${daysLeft !== 1 ? "s" : ""}`}
                  </h2>
                  <p style="color:#666;font-size:14px;line-height:1.6;margin-bottom:24px;">
                    Hi ${user.firstName},
                    ${isExpired
                      ? " your membership has expired. Renew now to continue your fitness journey."
                      : ` your <strong>${subscription.planSnapshot.planName}</strong> membership expires on <strong>${formatDate(subscription.endDate)}</strong>. Renew now to avoid losing access.`
                    }
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0"
                    style="background:#f9f9f9;border-radius:10px;padding:20px;margin-bottom:24px;">
                    <tr>
                      <td style="color:#888;font-size:13px;padding:5px 0;">Plan</td>
                      <td style="color:#1a1a1a;font-size:13px;text-align:right;font-weight:600;">${subscription.planSnapshot.planName} (${subscription.planSnapshot.durationLabel})</td>
                    </tr>
                    <tr>
                      <td style="color:#888;font-size:13px;padding:5px 0;">Expiry Date</td>
                      <td style="color:${isExpired ? "#ef4444" : "#e8a827"};font-size:13px;text-align:right;font-weight:600;">${formatDate(subscription.endDate)}</td>
                    </tr>
                  </table>
                  <div style="text-align:center;">
                    <a href="${process.env.CLIENT_URL}/#pricing"
                      style="display:inline-block;background:#e8c44a;color:#0a0a0a;padding:14px 32px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">
                      Renew Membership →
                    </a>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background:#f9f9f9;padding:20px 32px;border-top:1px solid #eee;">
                  <p style="margin:0;color:#aaa;font-size:12px;text-align:center;">
                    © ${new Date().getFullYear()} HULK Gym. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from   : `"${EMAIL_CONFIG.FROM_NAME}" <${FROM_ADDRESS}>`,
    to     : user.email,
    subject,
    html,
  });
};

// =============================================================================
// runReminderJob
// =============================================================================

const runReminderJob = async () => {
  console.log(`[CRON] Subscription reminder job started at ${new Date().toISOString()}`);

  // 1. Send reminder emails for expiring subscriptions
  for (const days of REMINDER_DAYS) {
    const reminderKey = days === 7 ? "sevenDay" : days === 3 ? "threeDay" : "oneDay";
    const expiring    = await Subscription.findExpiringSubscriptions(days);

    for (const sub of expiring) {
      if (sub.remindersSent[reminderKey]) continue; // already sent

      try {
        await sendReminderEmail(sub.userId, sub, days);
        sub.remindersSent[reminderKey] = true;
        await sub.save();
        console.log(`[CRON] Sent ${days}-day reminder to ${sub.userId.email}`);
      } catch (err) {
        console.error(`[CRON] Failed to send reminder to ${sub.userId.email}:`, err.message);
      }
    }
  }

  // 2. Mark active subscriptions as expired / grace
  const now = new Date();

  // Active → Grace (endDate passed but still in grace period)
  await Subscription.updateMany(
    { status: SUBSCRIPTION_STATUS.ACTIVE, endDate: { $lt: now }, gracePeriodEnds: { $gt: now } },
    { $set: { status: SUBSCRIPTION_STATUS.GRACE } }
  );

  // Grace → Expired (gracePeriodEnds passed)
  const nowExpired = await Subscription.updateMany(
    { status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.GRACE] }, gracePeriodEnds: { $lt: now } },
    { $set: { status: SUBSCRIPTION_STATUS.EXPIRED } }
  );

  if (nowExpired.modifiedCount > 0) {
    console.log(`[CRON] Marked ${nowExpired.modifiedCount} subscription(s) as expired`);
  }

  // 3. Mark overdue installments
  await Installment.updateMany(
    { status: INSTALLMENT_STATUS.PENDING, dueDate: { $lt: now } },
    { $set: { status: INSTALLMENT_STATUS.OVERDUE } }
  );

  console.log(`[CRON] Subscription reminder job completed`);
};

// =============================================================================
// startSubscriptionReminderJob
// Runs daily at 8:00 AM IST (2:30 AM UTC)
// =============================================================================

export const startSubscriptionReminderJob = () => {
  // "30 2 * * *" = 2:30 AM UTC = 8:00 AM IST
  cron.schedule("30 2 * * *", runReminderJob, {
    timezone: "Asia/Kolkata",
  });

  console.log("[CRON] Subscription reminder job scheduled — runs daily at 8:00 AM IST");
};

export { runReminderJob }; // exported for manual testing