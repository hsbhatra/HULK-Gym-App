// =============================================================================
// src/pages/ContactPage.jsx — business details (also required by Razorpay)
// =============================================================================

import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Navbar from "../components/layout/Navbar.jsx";
import Footer from "../components/layout/Footer.jsx";
import InstagramIcon from "../components/ui/InstagramIcon.jsx";
import { GYM } from "../utils/gymConfig.js";
import { HOURS } from "../content/gymContent.js";

export default function ContactPage() {
  const rows = [
    GYM.address && { icon: <MapPin size={20} aria-hidden="true" />, label: "Address", value: GYM.address, href: GYM.mapsHref, external: true },
    GYM.phone && { icon: <Phone size={20} aria-hidden="true" />, label: "Phone", value: GYM.phone.display, href: GYM.phone.href },
    GYM.whatsappHref && { icon: <MessageCircle size={20} aria-hidden="true" />, label: "WhatsApp", value: "Message us", href: GYM.whatsappHref, external: true },
    GYM.email && { icon: <Mail size={20} aria-hidden="true" />, label: "Email", value: GYM.email, href: GYM.emailHref },
    GYM.instagramHref && { icon: <InstagramIcon size={20} />, label: "Instagram", value: GYM.instagramHandle || "Instagram", href: GYM.instagramHref, external: true },
  ].filter(Boolean);

  return (
    <div style={{ minHeight: "100vh", background: "var(--iron-950)" }}>
      <Navbar />
      <main className="legal-wrap">
        <p className="eyebrow">Get in touch</p>
        <h1 className="page-title" style={{ marginTop: "10px" }}>Contact us</h1>
        <p className="legal-intro">
          Questions about memberships, payments or your account? Reach us any way below, or walk
          in during gym hours.
        </p>

        <div className="contact-grid">
          {rows.map((r) => (
            <a
              key={r.label}
              href={r.href}
              className="card-iron contact-card"
              {...(r.external ? { target: "_blank", rel: "noopener" } : {})}
            >
              <span className="perk-icon">{r.icon}</span>
              <span>
                <span className="contact-label">{r.label}</span>
                <span className="contact-value">{r.value}</span>
              </span>
            </a>
          ))}
          <div className="card-iron contact-card">
            <span className="perk-icon"><Clock size={20} aria-hidden="true" /></span>
            <span>
              <span className="contact-label">Hours</span>
              <span className="contact-value">{HOURS.daysLabel}</span>
              {HOURS.slots.map((s) => (
                <span key={s.open} className="contact-value">{s.label}</span>
              ))}
              <span className="contact-value" style={{ color: "var(--text-3)" }}>{HOURS.closedLabel}</span>
            </span>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
