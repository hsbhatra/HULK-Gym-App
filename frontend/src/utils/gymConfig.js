// =============================================================================
// src/utils/gymConfig.js
// =============================================================================
// Single source of truth for business + developer contact details.
// Everything comes from VITE_* env vars (see .env.example) so contacts can be
// changed per deployment without touching code. Anything left empty is simply
// not shown — no placeholders reach the live site.
// =============================================================================

const env = import.meta.env;
const clean = (v) => (typeof v === "string" ? v.trim() : "");

// "+91 89553 63976" / "8955363976" → { href: "tel:+918955363976", display: "89553 63976", wa: "918955363976" }
export function parsePhone(raw) {
  let digits = clean(raw).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) digits = `91${digits}`; // assume India
  const local = digits.slice(-10);
  return {
    e164: `+${digits}`,
    href: `tel:+${digits}`,
    display: `${local.slice(0, 5)} ${local.slice(5)}`,
    wa: digits,
  };
}

const whatsappLink = (phone, text) =>
  phone ? `https://wa.me/${phone.wa}${text ? `?text=${encodeURIComponent(text)}` : ""}` : "";

// Accept "google.com/maps?..." as well as full URLs
const asUrl = (v) => {
  const u = clean(v);
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `https://${u.replace(/^\/+/, "")}`;
};

const mailtoLink = (email, subject, body) =>
  email
    ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : "";

const instagramHandle = (url) => {
  const m = clean(url).match(/instagram\.com\/([^/?#]+)/i);
  return m ? `@${m[1]}` : "";
};

// ── Gym ─────────────────────────────────────────────────────────────────────
export const GYM_NAME = clean(env.VITE_GYM_NAME) || "HULK GYM";
export const GYM_INITIAL = GYM_NAME.charAt(0).toUpperCase();

const gymPhone = parsePhone(env.VITE_GYM_PHONE);
const gymWhatsapp = parsePhone(env.VITE_GYM_WHATSAPP) || gymPhone;
const gymAddress = clean(env.VITE_GYM_ADDRESS);
const gymInstagram = asUrl(env.VITE_GYM_INSTAGRAM_URL);
const gymEmail = clean(env.VITE_GYM_EMAIL);
// Map search text — don't repeat the gym name if the address already starts with it
const mapQuery = /^hulk gym/i.test(gymAddress) ? gymAddress : `Hulk Gym, ${gymAddress}`;

export const GYM = {
  name: "Hulk Gym",
  city: clean(env.VITE_GYM_CITY) || "Kota",
  address: gymAddress,
  email: gymEmail,
  emailHref: mailtoLink(
    gymEmail,
    "Membership enquiry — Hulk Gym website",
    "Hi Hulk Gym team,\n\nI found you on your website and I'd like to know more about joining.\n\nName:\nPhone:\n",
  ),
  phone: gymPhone, // { href, display, ... } or null
  whatsappHref: whatsappLink(gymWhatsapp, "Hi, I'd like to know more about joining Hulk Gym."),
  instagramHref: gymInstagram,
  instagramHandle: instagramHandle(gymInstagram),
  mapEmbedSrc: gymAddress ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed` : "",
  mapsHref:
    asUrl(env.VITE_GYM_MAPS_URL) ||
    (gymAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
      : ""),
};

// ── Developer credit (footer) ───────────────────────────────────────────────
const devPhone = parsePhone(env.VITE_DEV_PHONE);
const devWhatsapp = parsePhone(env.VITE_DEV_WHATSAPP) || devPhone;

export const DEVELOPER = {
  name: clean(env.VITE_DEV_NAME) || "Himanshu Sharma",
  url: asUrl(env.VITE_DEV_URL), // portfolio / LinkedIn
  email: clean(env.VITE_DEV_EMAIL),
  emailHref: mailtoLink(
    clean(env.VITE_DEV_EMAIL),
    "Website / app enquiry (via Hulk Gym website)",
    "Hi Himanshu,\n\nI saw the Hulk Gym website you built and I'd like a website/app for my business.\n\nBusiness name:\nWhat I need:\nPhone:\n",
  ),
  phone: devPhone,
  whatsappHref: whatsappLink(
    devWhatsapp,
    "Hi Himanshu, I saw the Hulk Gym website and I'd like a website/app for my business.",
  ),
};
