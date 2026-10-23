// =============================================================================
// src/content/legal.js — Privacy, Terms, Refund & Cancellation
// =============================================================================
// Plain-language policies that describe how THIS app actually works.
// Owner-dependent rules (refunds, cancellation) must be confirmed by the gym
// owner before going live — edit the text here, the pages update themselves.
//
// Each policy: { title, updated, intro, sections: [{ heading, body: [ ... ] }] }
// A body item is a string (paragraph) or { list: [...] }.
// `c` = contact details from env (see utils/gymConfig.js).
// =============================================================================

export const LAST_UPDATED = "22 October 2026";
// The privacy policy changed on its own (government ID), so it has its own date
const PRIVACY_UPDATED = "23 October 2026";

const contactLine = (c) =>
  [c.email && `email ${c.email}`, c.phone && `call ${c.phone}`, c.address && `visit us at ${c.address}`]
    .filter(Boolean)
    .join(", ");

export const privacyPolicy = (c) => ({
  title: "Privacy Policy",
  updated: PRIVACY_UPDATED,
  intro:
    "This policy explains what personal data Hulk Gym collects through this website and app, why we collect it, who we share it with, and the choices you have. We follow India's Digital Personal Data Protection Act, 2023.",
  sections: [
    {
      heading: "What we collect",
      body: [
        {
          list: [
            "Account details: your first and last name, email address, mobile number and a password (stored only as a secure hash — we can never see it).",
            "Optional profile details you choose to add: profile photo, height, weight, date of birth, gender and a short bio.",
            "Membership records: plans you buy, start and end dates, payments, installments and receipts.",
            "Government ID: the type of ID you show us (for example PAN card, driving licence, Voter ID or passport) and its number, which you type in yourself at the front desk. We do not collect Aadhaar numbers, and we do not keep photos or copies of your ID.",
            "Login sessions: the device/browser name and IP address of each active login, so you can see and end your sessions.",
            "Messages you send us by email or WhatsApp.",
          ],
        },
        "We do not collect or store your card, UPI or bank details. Online payments are handled entirely by Razorpay.",
      ],
    },
    {
      heading: "Why we use it",
      body: [
        {
          list: [
            "To create and secure your account and verify your email with a one-time code.",
            "To sell and manage your membership, record payments and installments, and email you receipts.",
            "To remind you before your membership or an installment is due.",
            "To confirm who our members are: the front desk checks your original ID once, and we keep its type and number on your account for member verification.",
            "To answer your questions and keep the gym safe.",
            "To meet legal, tax and accounting obligations.",
          ],
        },
        "We do not sell your data, and we do not use it for advertising.",
      ],
    },
    {
      heading: "Who we share it with",
      body: [
        "Only with service providers who help us run the app, and only what they need:",
        {
          list: [
            "Razorpay — to process online payments.",
            "Brevo — to send account and receipt emails.",
            "Cloudinary — to store profile photos.",
            "Our hosting and database providers — to run the website and store data securely.",
          ],
        },
        "We do not share your government ID with any of them: it is stored encrypted in our database. We may also share data when the law requires it, for example when a court or the police lawfully ask for it.",
      ],
    },
    {
      heading: "Your government ID",
      body: [
        {
          list: [
            "You show your original ID at the front desk. After the receptionist unlocks the page, you type the ID type and number into your own profile while they watch.",
            "The number is stored encrypted. Only the gym's admin can view it, and every time it is viewed, the date, time and the person who viewed it are recorded.",
            "Once saved, it cannot be changed from the app, by you or by the gym. If you notice a mistake, tell the front desk and we will arrange a correction.",
            "It is erased when you delete your account.",
          ],
        },
      ],
    },
    {
      heading: "Cookies and storage",
      body: [
        "We use one essential, secure cookie to keep you logged in. While you reset your password or verify your email, the browser temporarily remembers your email address for that tab only. We do not use analytics or advertising cookies, so there is no cookie banner.",
        "The map on our home page is provided by Google Maps, which may set its own cookies when it loads.",
      ],
    },
    {
      heading: "How long we keep it",
      body: [
        "We keep your account data while your account is active. Payment and receipt records are kept for as long as Indian tax and accounting laws require, even after an account is deleted. Your government ID details are erased when your account is deleted. The record of who viewed an ID is kept for at least one year, and it never contains the ID number. Login session records expire automatically.",
      ],
    },
    {
      heading: "Your rights",
      body: [
        {
          list: [
            "See and update your details any time from My profile.",
            "End any active login from Active sessions.",
            "Ask us to delete your account: use “Delete my account” in My profile → Profile. We remove your personal details, including your government ID, and keep only the payment records the law requires. Your account is deleted straight away, with no approval step.",
            "Withdraw consent or raise a complaint with us first, and if unresolved, with the Data Protection Board of India.",
          ],
        },
      ],
    },
    {
      heading: "Age",
      body: [
        "Memberships are for adults (18+). Anyone under 18 may join only with the consent of a parent or legal guardian, who is responsible for the account.",
      ],
    },
    {
      heading: "Contact & grievances",
      body: [
        `For any privacy question, correction or complaint, ${contactLine(c) || "contact the gym front desk"}. We aim to respond within 7 days.`,
      ],
    },
  ],
});

export const termsOfService = (c) => ({
  title: "Terms & Conditions",
  updated: LAST_UPDATED,
  intro:
    "These terms apply when you create an account, buy a membership or use Hulk Gym. By joining you agree to them, so please read them once.",
  sections: [
    {
      heading: "Who can join",
      body: [
        "You must be 18 or older, or have a parent or legal guardian's consent. The details you give us must be accurate, and you are responsible for keeping your password private.",
      ],
    },
    {
      heading: "Your health",
      body: [
        "Exercise carries risk. Check with a doctor before starting if you have any medical condition, injury or doubt. Tell the staff about anything that could affect your training. You train at your own risk and must stop if you feel unwell.",
      ],
    },
    {
      heading: "Memberships",
      body: [
        {
          list: [
            "A membership is personal and cannot be transferred or shared.",
            "It starts on the date shown on your receipt and runs for the plan's duration. Each plan includes a short grace period after it ends to renew.",
            "The price you pay is locked for that membership. Later price changes apply only to new purchases.",
            "Personal training is available on request — ask at the desk for details.",
          ],
        },
      ],
    },
    {
      heading: "Payments and installments",
      body: [
        "You can pay online through Razorpay (UPI, cards, net banking) or at the desk. Every payment gets a numbered receipt by email. If you pay in installments, please pay each one by its due date — your profile shows the schedule.",
      ],
    },
    {
      heading: "Gym rules",
      body: [
        {
          list: [
            "Wear clean sports shoes and carry a towel.",
            "Re-rack weights and wipe equipment after use.",
            "Follow staff instructions and respect other members.",
            "No smoking, alcohol, drugs or abusive behaviour on the premises.",
          ],
        },
        "The gym may suspend or cancel a membership for serious or repeated breaking of these rules.",
      ],
    },
    {
      heading: "Belongings and liability",
      body: [
        "Lockers are provided for convenience; keep valuables with you. To the extent the law allows, Hulk Gym is not responsible for loss or damage to personal belongings or for injuries caused by not following instructions.",
      ],
    },
    {
      heading: "Refunds",
      body: ["Refunds and cancellations follow our Refund & Cancellation Policy."],
    },
    {
      heading: "Services and delivery",
      body: [
        "Memberships are services used at the gym. Nothing is shipped; your membership is active as soon as payment is confirmed, and your receipt is emailed immediately.",
      ],
    },
    {
      heading: "Changes and law",
      body: [
        "We may update these terms; the date at the top shows the latest version. These terms are governed by the laws of India, and courts in Kota, Rajasthan have jurisdiction.",
        `Questions? ${contactLine(c) || "Ask at the front desk"}.`,
      ],
    },
  ],
});

export const refundPolicy = (c) => ({
  title: "Refund & Cancellation Policy",
  updated: LAST_UPDATED,
  intro: "How refunds and cancellations work for Hulk Gym memberships.",
  sections: [
    {
      heading: "Membership fees",
      body: [
        "Once a membership is active, its fee is non-refundable and cannot be transferred, including if you stop attending.",
      ],
    },
    {
      heading: "When you get a full refund",
      body: [
        {
          list: [
            "You were charged twice for the same membership (duplicate payment).",
            "Money was deducted but your membership was not activated.",
          ],
        },
        "These refunds go back to the original payment method. Once we start the refund, banks usually take 5–7 working days to show it. Payments that fail at the bank are reversed automatically by your bank.",
      ],
    },
    {
      heading: "Cancellation",
      body: [
        "If a membership is cancelled, any installments not yet due are waived — you are not asked to pay them. Amounts already paid are not refunded, except in the cases above.",
      ],
    },
    {
      heading: "How to ask for a refund",
      body: [
        `${contactLine(c) ? `Please ${contactLine(c)}` : "Please contact the front desk"} with your registered email and receipt number (it starts with HLK-). We reply within 2 working days.`,
      ],
    },
  ],
});
