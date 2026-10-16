// =============================================================================
// src/services/email/transporter.js
// =============================================================================

import * as Brevo from "@getbrevo/brevo";

// Brevo API client — used when BREVO_API_KEY is set (production/testing)
const getBrevoClient = () => {
  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;
  return apiInstance;
};

// =============================================================================
// sendEmail — unified send function
// Works with Brevo API (production) or logs to console (dev with SKIP_EMAIL)
// =============================================================================

export const sendEmail = async ({ to, subject, html, fromName, fromEmail }) => {

  // Dev shortcut — print to terminal instead of sending
  if (process.env.SKIP_EMAIL === "true") {
    console.log(`\n[DEV EMAIL] To: ${to} | Subject: ${subject}\n`);
    return;
  }

  const name  = fromName  || process.env.GYM_NAME    || "Hulk Gym";
  const email = fromEmail || process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER;

  // Use Brevo HTTP API (no SMTP port needed)
  if (process.env.BREVO_API_KEY) {
    const apiInstance  = getBrevoClient();
    const sendSmtpEmail = new Brevo.SendSmtpEmail();

    sendSmtpEmail.sender    = { name, email };
    sendSmtpEmail.to        = [{ email: to }];
    sendSmtpEmail.subject   = subject;
    sendSmtpEmail.htmlContent = html;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    return;
  }

  // Fallback: Nodemailer + Gmail for local dev
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.default.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({ from: `"${name}" <${email}>`, to, subject, html });
};

// Keep FROM_ADDRESS export for any file still referencing it
export const FROM_ADDRESS = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER;

// Legacy createTransporter — kept so existing imports don't break immediately
// TODO: migrate all callers to sendEmail()
export const createTransporter = () => {
  throw new Error("createTransporter() is deprecated. Use sendEmail() from transporter.js instead.");
};