// =============================================================================
// src/services/email/transporter.js
// =============================================================================
// Unified email sender.
// - Production/Testing (Render): uses Brevo HTTP API (no SMTP port needed)
// - Local dev with SKIP_EMAIL=true: prints OTP to terminal, no email sent
// - Local dev without SKIP_EMAIL: uses Gmail SMTP
// =============================================================================

import * as Brevo from "@getbrevo/brevo";
import nodemailer from "nodemailer";
import { GYM_CONFIG } from "../../utils/constants.js";

// =============================================================================
// sendEmail — the one function all email services call
// =============================================================================

export const sendEmail = async ({ to, subject, html }) => {

  // ── Dev shortcut ──────────────────────────────────────────────────────────
  // Set SKIP_EMAIL=true in local .env to skip sending and print OTP to terminal
  if (process.env.SKIP_EMAIL === "true") {
    console.log(`\n[DEV EMAIL] To: ${to} | Subject: ${subject}\n`);
    return;
  }

  const fromName  = GYM_CONFIG.NAME;
  const fromEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER;

  // ── Brevo HTTP API (production & testing on Render) ───────────────────────
  // Uses HTTPS port 443 — never blocked by any hosting provider
  if (process.env.BREVO_API_KEY) {
    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

    const email = new Brevo.SendSmtpEmail();
    email.sender      = { name: fromName, email: fromEmail };
    email.to          = [{ email: to }];
    email.subject     = subject;
    email.htmlContent = html;

    await apiInstance.sendTransacEmail(email);
    console.log(`[EMAIL] Sent via Brevo to ${to}`);
    return;
  }

  // ── Gmail SMTP fallback (local dev without SKIP_EMAIL) ────────────────────
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html,
  });

  console.log(`[EMAIL] Sent via Gmail to ${to}`);
};

// ── Legacy exports — kept so nothing breaks if any old file still imports them
export const FROM_ADDRESS     = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER;
export const createTransporter = () => {
  throw new Error("createTransporter() is removed. Import sendEmail from transporter.js instead.");
};