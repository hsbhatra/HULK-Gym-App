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
import { sendEmail } from "../services/email/transporter.js";

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

// =============================================================================
// sendReminderEmail
// =============================================================================

const sendReminderEmail = async (user, subscription, daysLeft) => {
  await sendEmail({ to: user.email, subject, html });
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
  // Cron fields are read in the timezone below, so this is 8:00 AM IST.
  // (It was "30 2 * * *" — 2:30 AM IST — while the log claimed 8 AM.)
  cron.schedule("0 8 * * *", runReminderJob, {
    timezone: "Asia/Kolkata",
  });

  console.log("[CRON] Subscription reminder job scheduled — runs daily at 8:00 AM IST");
};

export { runReminderJob }; // exported for manual testing