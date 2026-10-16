import { EMAIL_CONFIG, OTP_CONFIG, GYM_CONFIG } from "../../utils/constants.js";
import { sendEmail } from "../email/transporter.js";

const sendOtpEmail = async (to, subject, htmlBody) => {
  await sendEmail({ to, subject, html: htmlBody });
};

const buildOtpEmailHtml = (otp, headingText, bodyText) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="480" cellpadding="0" cellspacing="0"
                style="background:#ffffff; border-radius:12px; overflow:hidden;
                       box-shadow:0 2px 8px rgba(0,0,0,0.08);">

                <!-- Header -->
                <tr>
                  <td style="background:#1a1a1a; padding:28px 32px;">
                    <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:700;
                               letter-spacing:1px;">
                      ⚡ ${GYM_CONFIG.NAME}
                    </h1>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:36px 32px;">
                    <h2 style="margin:0 0 12px; color:#1a1a1a; font-size:20px;">
                      ${headingText}
                    </h2>
                    <p style="margin:0 0 28px; color:#555555; font-size:15px; line-height:1.6;">
                      ${bodyText}
                    </p>

                    <!-- OTP Box -->
                    <div style="background:#f0f0f0; border-radius:8px; padding:20px;
                                text-align:center; margin-bottom:28px;">
                      <p style="margin:0 0 6px; color:#888888; font-size:12px;
                                 text-transform:uppercase; letter-spacing:1px;">
                        Your verification code
                      </p>
                      <p style="margin:0; color:#1a1a1a; font-size:36px; font-weight:700;
                                 letter-spacing:8px;">
                        ${otp}
                      </p>
                    </div>

                    <p style="margin:0 0 8px; color:#888888; font-size:13px;">
                      ⏱ This code expires in
                      <strong>${OTP_CONFIG.EXPIRY_MINUTES} minutes</strong>.
                    </p>
                    <p style="margin:0; color:#888888; font-size:13px;">
                      🔒 Never share this code with anyone.
                      Hulk Gym will never ask for your OTP.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background:#f9f9f9; padding:20px 32px;
                              border-top:1px solid #eeeeee;">
                    <p style="margin:0; color:#aaaaaa; font-size:12px; text-align:center;">
                      If you did not request this, please ignore this email.<br/>
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
};

export const sendRegistrationOtp = async (email, otp) => {
  const html = buildOtpEmailHtml(
    otp,
    "Verify Your Email Address",
    "Welcome to Hulk Gym! Use the code below to verify your email address and complete your registration.",
  );

  await sendOtpEmail(email, EMAIL_CONFIG.SUBJECTS.REGISTRATION_OTP, html);
};

export const sendForgotPasswordOtp = async (email, otp) => {
  const html = buildOtpEmailHtml(
    otp,
    "Reset Your Password",
    "We received a request to reset your Hulk Gym password. Use the code below to proceed. If you did not request this, you can safely ignore this email.",
  );

  await sendOtpEmail(email, EMAIL_CONFIG.SUBJECTS.FORGOT_PASSWORD_OTP, html);
};

