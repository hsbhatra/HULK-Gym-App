// =============================================================================
// src/components/layout/Footer.jsx
// =============================================================================
// Real links only — every contact comes from env (utils/gymConfig.js) and is
// hidden when not set. Includes the developer credit.
// =============================================================================

import { Link } from "react-router-dom";
import { Globe, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Logo from "../ui/Logo.jsx";
import InstagramIcon from "../ui/InstagramIcon.jsx";
import { GYM, DEVELOPER } from "../../utils/gymConfig.js";
import { hoursSummary } from "../../utils/hours.js";

const linkStyle = {
  fontSize: "16px",
  color: "#d6d6d0",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  minHeight: "36px",
};

const headStyle = {
  fontSize: "14px",
  fontWeight: "700",
  letterSpacing: "2px",
  color: "#8c8c86",
  textTransform: "uppercase",
  marginBottom: "8px",
};

const chipStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 12px",
  minHeight: "36px",
  borderRadius: "999px",
  border: "1px solid var(--iron-700)",
  color: "var(--text-1)",
  fontSize: "15px",
  fontWeight: 600,
  textDecoration: "none",
};

function DeveloperCredit() {
  const contacts = [
    DEVELOPER.whatsappHref && {
      label: "WhatsApp",
      href: DEVELOPER.whatsappHref,
      icon: <MessageCircle size={15} aria-hidden="true" />,
      external: true,
    },
    DEVELOPER.phone && {
      label: "Call",
      href: DEVELOPER.phone.href,
      icon: <Phone size={15} aria-hidden="true" />,
    },
    DEVELOPER.email && {
      label: "Email",
      href: DEVELOPER.emailHref,
      icon: <Mail size={15} aria-hidden="true" />,
    },
    DEVELOPER.url && {
      label: "Portfolio",
      href: DEVELOPER.url,
      icon: <Globe size={15} aria-hidden="true" />,
      external: true,
    },
  ].filter(Boolean);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
      <span style={{ position: "relative", width: "96px", height: "96px", flexShrink: 0 }} aria-hidden="true">
        <svg className="hg-spin" viewBox="0 0 120 120" style={{ width: "100%", height: "100%", display: "block" }}>
          <defs>
            <path id="devRim" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
          </defs>
          <circle cx="60" cy="60" r="58" fill="#151517" stroke="#5a3a2a" />
          <text fontFamily="Inter Tight, sans-serif" fontWeight="700" fontSize="9.5" letterSpacing="2.2" fill="#bdbdb6">
            <textPath href="#devRim">FORGED BY HIMANSHU SHARMA · WEB &amp; APP DEV ·</textPath>
          </text>
        </svg>
        <span
          style={{
            position: "absolute",
            inset: "30px",
            borderRadius: "50%",
            background: "var(--ember)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: "19px",
          }}
        >
          →
        </span>
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <span style={{ fontSize: "15px", color: "var(--text-3)" }}>This site was forged by</span>
        <span style={{ fontWeight: 700, fontSize: "18px", color: "var(--text-1)" }}>{DEVELOPER.name}</span>
        {contacts.length > 0 && (
          <>
            <span style={{ fontSize: "16px", color: "var(--yellow)", fontWeight: 600 }}>
              Want a website or app for your business?
            </span>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
              {contacts.map((c) => (
                <a
                  key={c.label}
                  href={c.href}
                  style={chipStyle}
                  aria-label={`${c.label} ${DEVELOPER.name}`}
                  {...(c.external ? { target: "_blank", rel: "noopener" } : {})}
                >
                  {c.icon}
                  {c.label}
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Footer() {
  const contactLinks = [
    GYM.phone && { href: GYM.phone.href, label: `Call ${GYM.phone.display}`, icon: <Phone size={16} aria-hidden="true" /> },
    GYM.whatsappHref && { href: GYM.whatsappHref, label: "WhatsApp", icon: <MessageCircle size={16} aria-hidden="true" />, external: true },
    GYM.email && { href: GYM.emailHref, label: GYM.email, icon: <Mail size={16} aria-hidden="true" /> },
    GYM.instagramHref && { href: GYM.instagramHref, label: GYM.instagramHandle || "Instagram", icon: <InstagramIcon size={16} />, external: true },
    GYM.mapsHref && { href: GYM.mapsHref, label: "Directions", icon: <MapPin size={16} aria-hidden="true" />, external: true },
  ].filter(Boolean);

  return (
    <footer
      style={{
        borderTop: "1px solid #1e1e21",
        background: "rgba(10,10,11,0.94)",
        padding: "56px 16px 32px",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          gap: "40px",
          justifyContent: "space-between",
        }}
      >
        <div style={{ flex: "1 1 260px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <Logo size="lg" style={{ alignSelf: "flex-start" }} />
          <p style={{ fontSize: "16px", color: "var(--text-2)", lineHeight: 1.7, maxWidth: "340px" }}>
            {GYM.address && (
              <>
                {GYM.address}
                <br />
              </>
            )}
            {hoursSummary()}
          </p>
        </div>

        <nav aria-label="Footer" style={{ display: "flex", gap: "56px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={headStyle}>Gym</span>
            <a href="/#facilities" style={linkStyle}>Facilities</a>
            <a href="/#pricing" style={linkStyle}>Plans</a>
            <a href="/#faq" style={linkStyle}>FAQ</a>
            <Link to="/login" style={linkStyle}>Member login</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={headStyle}>Policies</span>
            <Link to="/terms" style={linkStyle}>Terms & conditions</Link>
            <Link to="/privacy" style={linkStyle}>Privacy policy</Link>
            <Link to="/refund-policy" style={linkStyle}>Refunds & cancellation</Link>
            <Link to="/contact" style={linkStyle}>Contact us</Link>
          </div>
          {contactLinks.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={headStyle}>Contact</span>
              {contactLinks.map((c) => (
                <a key={c.label} href={c.href} style={linkStyle} {...(c.external ? { target: "_blank", rel: "noopener" } : {})}>
                  {c.icon}
                  {c.label}
                </a>
              ))}
            </div>
          )}
        </nav>
      </div>

      <div
        style={{
          maxWidth: "1200px",
          margin: "40px auto 0",
          paddingTop: "28px",
          borderTop: "1px solid #1e1e21",
          display: "flex",
          flexWrap: "wrap",
          gap: "24px",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "15px", color: "var(--text-3)" }}>
          © {new Date().getFullYear()} {GYM.name}, {GYM.city}. All rights reserved.
        </span>
        <DeveloperCredit />
      </div>
    </footer>
  );
}
