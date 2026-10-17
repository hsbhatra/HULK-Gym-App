// =============================================================================
// src/services/email/transporter.js
// =============================================================================
// Unified email sender.
// On Render (production/testing): uses Brevo REST API over HTTPS (port 443)
// Local dev with SKIP_EMAIL=true: prints to terminal, no email sent
// Local dev without SKIP_EMAIL: uses Gmail SMTP via nodemailer
// =============================================================================

import nodemailer from "nodemailer";
import { GYM_CONFIG } from "../../utils/constants.js";

// =============================================================================
// sendEmail — the single function all email services call
// =============================================================================

export const sendEmail = async ({ to, subject, html }) => {

  // ── Dev shortcut ───────────────────────────────────────────────────────────
  if (process.env.SKIP_EMAIL === "true") {
    console.log(`\n[DEV EMAIL] To: ${to} | Subject: ${subject}\n`);
    return;
  }

  const fromName  = GYM_CONFIG.NAME || "Hulk Gym";
  const fromEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER;

  // ── Brevo REST API (Render — no SMTP port issues) ─────────────────────────
  if (process.env.BREVO_API_KEY) {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method : "POST",
      headers: {
        "accept"      : "application/json",
        "api-key"     : process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender     : { name: fromName, email: fromEmail },
        to         : [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Brevo API error ${response.status}: ${err.message || JSON.stringify(err)}`);
    }

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

// ── Legacy exports so nothing breaks if any file still imports them ──────────
export const FROM_ADDRESS     = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER;
export const createTransporter = () => {
  throw new Error("createTransporter() removed. Use sendEmail() from transporter.js.");
};