// =============================================================================
// src/pages/legal/LegalPage.jsx — shared layout for Privacy / Terms / Refunds
// =============================================================================

import { Link } from "react-router-dom";
import Navbar from "../../components/layout/Navbar.jsx";
import Footer from "../../components/layout/Footer.jsx";
import { GYM } from "../../utils/gymConfig.js";
import { privacyPolicy, termsOfService, refundPolicy } from "../../content/legal.js";

const POLICIES = {
  privacy: privacyPolicy,
  terms: termsOfService,
  refunds: refundPolicy,
};

const OTHER_LINKS = [
  { key: "privacy", to: "/privacy", label: "Privacy Policy" },
  { key: "terms", to: "/terms", label: "Terms & Conditions" },
  { key: "refunds", to: "/refund-policy", label: "Refund & Cancellation" },
];

const contact = {
  email: GYM.email,
  phone: GYM.phone?.display,
  address: GYM.address,
};

function Body({ item }) {
  if (typeof item === "string") return <p className="legal-p">{item}</p>;
  if (item.list)
    return (
      <ul className="legal-list">
        {item.list.map((li) => (
          <li key={li}>{li}</li>
        ))}
      </ul>
    );
  return null;
}

export default function LegalPage({ policy }) {
  const doc = POLICIES[policy](contact);

  return (
    <div style={{ minHeight: "100vh", background: "var(--iron-950)" }}>
      <Navbar />
      <main className="legal-wrap">
        <article>
          <p className="eyebrow">Hulk Gym · Policies</p>
          <h1 className="page-title" style={{ marginTop: "10px" }}>{doc.title}</h1>
          <p className="legal-updated">Last updated: {doc.updated}</p>
          <p className="legal-intro">{doc.intro}</p>

          {doc.sections.map((s) => (
            <section key={s.heading} className="legal-section">
              <h2 className="legal-h2">{s.heading}</h2>
              {s.body.map((b, i) => (
                <Body key={i} item={b} />
              ))}
            </section>
          ))}
        </article>

        <nav aria-label="Other policies" className="legal-other">
          {OTHER_LINKS.filter((l) => l.key !== policy).map((l) => (
            <Link key={l.key} to={l.to} className="btn-ghost">
              {l.label}
            </Link>
          ))}
          <Link to="/contact" className="btn-ghost">Contact us</Link>
        </nav>
      </main>
      <Footer />
    </div>
  );
}
