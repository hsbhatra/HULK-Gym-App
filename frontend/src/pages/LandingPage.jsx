// =============================================================================
// src/pages/LandingPage.jsx — "Molten Iron"
// =============================================================================
// Only real, verifiable content. What the gym offers is driven by
// src/content/gymContent.js (only owner-confirmed items render) and contacts
// by env (src/utils/gymConfig.js). Plans come live from the API.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity, CalendarClock, Cctv, ChevronDown, Clock, Cog, CreditCard, Droplets,
  Dumbbell, Flame, Flower2, HeartPulse, Lock, Mail, MapPin, MessageCircle, Music, Music2,
  ParkingCircle, Phone, Receipt, Salad, Shield, Shirt, ShowerHead, Smartphone, Snowflake,
  Swords, UserCheck, Users, Venus,
} from "lucide-react";
import { useAuthStore } from "../store/authStore.js";
import ParticleBackground from "../components/three/ParticleBackground.jsx";
import Navbar from "../components/layout/Navbar.jsx";
import Footer from "../components/layout/Footer.jsx";
import Logo from "../components/ui/Logo.jsx";
import { getPublicPlans } from "../services/planService.js";
import { GYM } from "../utils/gymConfig.js";
import { FACILITIES, CLASSES, AMENITIES, FAQ, HOURS } from "../content/gymContent.js";
import { openStatus } from "../utils/hours.js";
import { Dumbbell as DumbbellProp, Kettlebell } from "../components/ui/GymProps.jsx";
import { inr } from "../utils/format.js";

const ICONS = {
  Activity, Cctv, Cog, Droplets, Dumbbell, Flame, Flower2, HeartPulse, Lock, Music,
  Music2, ParkingCircle, Salad, Shield, Shirt, ShowerHead, Snowflake, Swords, UserCheck,
  Users, Venus,
};
const Icon = ({ name, size = 28 }) => {
  const C = ICONS[name] || Dumbbell;
  return <C size={size} aria-hidden="true" />;
};

const visible = (list) => list.filter((i) => i.show);

// ── Scroll parallax (transform-only, rAF-throttled, reduced-motion aware) ────
function useScrollY() {
  const [y, setY] = useState(0);
  const ticking = useRef(false);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        ticking.current = false;
        setY(Math.min(window.scrollY, 1600)); // only the hero needs it
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return y;
}

// Re-evaluates every minute so "Open now" flips on its own
function useOpenStatus() {
  const [status, setStatus] = useState(() => openStatus());
  useEffect(() => {
    const id = setInterval(() => setStatus(openStatus()), 60_000);
    return () => clearInterval(id);
  }, []);
  return status;
}

function StatusPill({ status }) {
  return (
    <span className={status.open ? "status-pill status-pill--open" : "status-pill"} role="status">
      <span className="status-dot" aria-hidden="true" />
      {status.text}
    </span>
  );
}

const shift = (y, factor) => ({ transform: `translate3d(0, ${(y * factor).toFixed(1)}px, 0)` });

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6, ease: [0.2, 0.7, 0.2, 1] },
};

// ── Decorative plates ────────────────────────────────────────────────────────
function SteelPlate() {
  return (
    <svg viewBox="0 0 200 200" className="hg-spin" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <radialGradient id="plateFill" cx="45%" cy="70%" r="80%">
          <stop offset="0" stopColor="#4a2a1c" />
          <stop offset="0.45" stopColor="#232124" />
          <stop offset="1" stopColor="#101012" />
        </radialGradient>
        <path id="plateRim" d="M100,100 m-80,0 a80,80 0 1,1 160,0 a80,80 0 1,1 -160,0" />
      </defs>
      <circle cx="100" cy="100" r="98" fill="url(#plateFill)" />
      <circle cx="100" cy="100" r="98" fill="none" stroke="#5a3a2a" strokeWidth="1" />
      <circle cx="100" cy="100" r="88" fill="none" stroke="#2c2a2e" strokeWidth="6" />
      <circle cx="100" cy="100" r="40" fill="#151517" stroke="#3b3b3f" strokeWidth="2" />
      <circle cx="100" cy="100" r="14" fill="#0a0a0b" stroke="#f3d400" strokeWidth="1.5" />
      <text fontFamily="Big Shoulders Display, Impact, sans-serif" fontWeight="900" fontSize="11" letterSpacing="3" fill="#f3d400">
        <textPath href="#plateRim">HULK GYM · KOTA · 20 KG · HULK GYM · KOTA · 20 KG ·</textPath>
      </text>
    </svg>
  );
}

function RedPlate() {
  return (
    <svg viewBox="0 0 200 200" className="hg-spin-back" style={{ width: "100%", height: "100%", display: "block" }}>
      <circle cx="100" cy="100" r="98" fill="#e5482b" />
      <circle cx="100" cy="100" r="86" fill="none" stroke="#b9341c" strokeWidth="5" />
      <circle cx="100" cy="100" r="38" fill="#9e2c17" />
      <circle cx="100" cy="100" r="14" fill="#0a0a0b" />
      <text x="100" y="62" textAnchor="middle" fontFamily="Big Shoulders Display, Impact, sans-serif" fontWeight="900" fontSize="22" fill="#ffffff">25</text>
    </svg>
  );
}

// ── Static copy that describes how this app works (always accurate) ──────────
const APP_PERKS = [
  { icon: Smartphone, title: "Your pass, online", copy: "See your plan, start date and days left any time you log in." },
  { icon: Receipt, title: "Receipt for every payment", copy: "Online, cash or installment — each payment emails you a numbered receipt." },
  { icon: CreditCard, title: "Pay your way", copy: "UPI, card or net banking online, or cash at the desk." },
  { icon: CalendarClock, title: "Installments at the desk", copy: "Split longer plans into parts; your schedule shows what's due and when." },
];

const STEPS = [
  { n: "01", title: "Pick a plan", copy: "Choose a plan and duration and create your account." },
  { n: "02", title: "Pay your way", copy: "Online in a minute — or at the desk, in installments if you need." },
  { n: "03", title: "Show up & lift", copy: "Your receipt lands in your email. Your pass lives in your profile." },
];

const DURATIONS = [
  { days: 30, label: "Monthly" },
  { days: 90, label: "Quarterly" },
  { days: 180, label: "Half-yearly" },
  { days: 365, label: "Annual" },
];

const rupees = inr;

// ── Small building blocks ────────────────────────────────────────────────────
function SectionHead({ eyebrow, title, intro, id }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "32px", maxWidth: "760px" }}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <motion.h2 {...reveal} id={id} className="section-title">{title}</motion.h2>
      {intro && <p className="section-subtitle">{intro}</p>}
    </div>
  );
}

function FeatureCard({ item, index }) {
  const lead = index === 0 && !!item.image;
  return (
    <motion.article
      {...reveal}
      transition={{ ...reveal.transition, delay: Math.min(index, 4) * 0.06 }}
      className={`card-iron floor-card${lead ? " floor-card--lead" : ""}${item.image ? "" : " floor-card--plain"}`}
    >
      {item.image && (
        <div className="floor-card__media">
          <img src={item.image} alt={item.imageAlt || item.title} loading="lazy" decoding="async" width="1600" height="1015" />
        </div>
      )}
      <div className="floor-card__body">
        <span style={{ color: "var(--yellow)" }}><Icon name={item.icon} /></span>
        <h3 className="font-display floor-card__title">{item.title}</h3>
        {item.copy && <p className="floor-card__copy">{item.copy}</p>}
      </div>
    </motion.article>
  );
}

// =============================================================================
// LandingPage
// =============================================================================
export default function LandingPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authUser = useAuthStore((s) => s.user);
  const isAdmin = authUser?.role === "admin";
  const y = useScrollY();
  const status = useOpenStatus();

  const facilities = visible(FACILITIES);
  const classes = visible(CLASSES);
  const amenities = visible(AMENITIES);
  const faq = visible(FAQ);
  // Floor + coaching render as one grid (the gym runs no group classes)
  const offerings = [...facilities, ...classes];
  const highlights = offerings.slice(0, 3).map((i) => i.title);

  // ── Plans ──────────────────────────────────────────────────────────────────
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(30);

  const loadPlans = () =>
    getPublicPlans()
      .then((res) => setPlans(res.data.data.plans))
      .catch(() => setPlansError(true))
      .finally(() => setPlansLoading(false));

  const retryPlans = () => {
    setPlansLoading(true);
    setPlansError(false);
    loadPlans();
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const availableDurations = useMemo(
    () =>
      DURATIONS.filter((d) =>
        plans.some((p) => p.pricingTiers.some((t) => t.durationDays === d.days)),
      ),
    [plans],
  );
  const activeDuration = availableDurations.some((d) => d.days === selectedDuration)
    ? selectedDuration
    : (availableDurations[0]?.days ?? 30);

  const getPriceForDuration = (plan, durationDays) => {
    const tier = plan.pricingTiers.find((t) => t.durationDays === durationDays);
    if (!tier) return null;
    const hasOffer =
      tier.offerPrice && (!tier.offerValidUntil || new Date(tier.offerValidUntil) > new Date());
    return {
      price: hasOffer ? tier.offerPrice : tier.price,
      originalPrice: hasOffer ? tier.price : null,
      label: tier.label,
    };
  };

  const scrollToPricing = () =>
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });

  // Logged-in visitors must not be sent to /register or /login (PublicRoute bounces them)
  const primaryCta = isAuthenticated
    ? { label: "See plans", onClick: scrollToPricing }
    : { label: "Join now", onClick: () => navigate("/register") };
  const accountCta = isAuthenticated
    ? { label: isAdmin ? "Admin dashboard" : "My membership", to: isAdmin ? "/admin" : "/profile" }
    : null;

  const mapEmbed = GYM.mapEmbedSrc;

  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden", position: "relative" }}>
      <ParticleBackground particleCount={150} />
      <Navbar transparent={true} showNavLinks={true} />

      <main>
        {/* ══ HERO ═══════════════════════════════════════════════════════════ */}
        <section className="hero-molten" aria-labelledby="hero-title">
          <div aria-hidden="true" className="hero-word" style={shift(y, 0.6)}>IRON</div>
          <div aria-hidden="true" className="hero-plate-big" style={shift(y, 0.35)}>
            <SteelPlate />
          </div>
          <div aria-hidden="true" className="hero-plate-small" style={shift(y, 0.22)}>
            <RedPlate />
          </div>

          <div className="hero-inner" style={shift(y, 0.08)}>
            <Logo size="hero" clickable={false} highlight className="hero-logo hg-rise" />
            <p className="eyebrow hg-rise" style={{ animationDelay: "0.05s" }}>{GYM.name} · {GYM.city}</p>
            <h1 id="hero-title" className="hero-title hg-rise" style={{ maxWidth: "780px", animationDelay: "0.1s" }}>
              <span className="sr-only">{GYM.name}, {GYM.city} — </span>
              Forge
              <br />
              your <span className="text-molten">iron.</span>
            </h1>
            <p className="hg-rise hero-lead" style={{ animationDelay: "0.2s" }}>
              A strength gym in {GYM.city}. Free weights, a functional zone and personal training on
              request — join online in two minutes, or walk in and pay at the desk.
            </p>
            <div className="hero-cta hg-rise" style={{ justifyContent: "flex-start", animationDelay: "0.3s" }}>
              <button type="button" className="btn-gold btn-lg" onClick={primaryCta.onClick}>
                {primaryCta.label}
              </button>
              {accountCta ? (
                <button type="button" className="btn-ghost btn-lg" onClick={() => navigate(accountCta.to)}>
                  {accountCta.label}
                </button>
              ) : GYM.whatsappHref ? (
                <a href={GYM.whatsappHref} target="_blank" rel="noopener" className="btn-ghost btn-lg">
                  <MessageCircle size={18} aria-hidden="true" /> Ask on WhatsApp
                </a>
              ) : null}
            </div>
            <div className="hg-rise" style={{ animationDelay: "0.4s" }}>
              <StatusPill status={status} />
            </div>
          </div>
        </section>

        {/* ══ HIGHLIGHT STRIP (confirmed items only) ═════════════════════════ */}
        {highlights.length > 0 && (
          <section className="fact-strip" aria-label="Highlights">
            <div>
              {highlights.map((h) => <span key={h}>{h}</span>)}
              <span>Pay online or at desk</span>
            </div>
          </section>
        )}

        {/* ══ FACILITIES ═════════════════════════════════════════════════════ */}
        {offerings.length > 0 && (
          <section id="facilities" className="section-dark section-block has-prop" aria-labelledby="facilities-title">
            <div className="section-prop section-prop--hide-sm" style={{ right: "6%", top: "56px", width: "120px" }}>
              <Kettlebell className="prop-swing" style={{ width: "100%", height: "auto", display: "block" }} />
            </div>
            <div className="container-wide">
              <SectionHead
                id="facilities-title"
                eyebrow="Inside the gym"
                title="The floor"
                intro="What you can train with from day one."
              />
              <div className="floor-grid">
                {offerings.map((f, i) => <FeatureCard key={f.title} item={f} index={i} />)}
              </div>
            </div>
          </section>
        )}

        {/* ══ AMENITIES ══════════════════════════════════════════════════════ */}
        {amenities.length > 0 && (
          <section className="section-dark" style={{ padding: "0 24px 48px" }} aria-label="Amenities">
            <ul className="container-wide amenity-list">
              {amenities.map((a) => (
                <li key={a.title}>
                  <Icon name={a.icon} size={18} />
                  {a.title}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ══ OUTLINE BAND ═══════════════════════════════════════════════════ */}
        <section aria-hidden="true" className="section-dark band-wrap">
          <div className="band-outline band-marquee">
            Lift · Recover · Repeat · Lift · Recover · Repeat · Lift · Recover · Repeat ·
          </div>
        </section>

        {/* ══ PRICING ════════════════════════════════════════════════════════ */}
        <section id="pricing" className="section-dark section-block" aria-labelledby="pricing-title">
          <div className="container-wide">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "20px", flexWrap: "wrap", marginBottom: "28px" }}>
              <div>
                <p className="eyebrow" style={{ marginBottom: "10px" }}>Membership</p>
                <motion.h2 {...reveal} id="pricing-title" className="section-title">Plans</motion.h2>
              </div>
              <p style={{ color: "var(--text-2)", fontSize: "17px" }}>
                The price you see is the price you pay.
              </p>
            </div>

            {availableDurations.length > 1 && (
              <div role="group" aria-label="Choose duration" className="duration-tabs">
                {availableDurations.map((opt) => {
                  const active = activeDuration === opt.days;
                  return (
                    <button
                      key={opt.days}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedDuration(opt.days)}
                      className={active ? "tab-pill tab-pill--active" : "tab-pill"}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {plansLoading ? (
              <div className="pricing-grid" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="card-iron skeleton" style={{ height: "380px" }} />
                ))}
              </div>
            ) : plansError ? (
              <div className="card-iron" style={{ padding: "40px", textAlign: "center", color: "var(--text-2)" }}>
                <p style={{ marginBottom: "16px" }}>Couldn’t load plans right now.</p>
                <button type="button" className="btn-ghost" onClick={retryPlans}>Try again</button>
              </div>
            ) : plans.length === 0 ? (
              <div className="card-iron" style={{ padding: "40px", textAlign: "center", color: "var(--text-2)" }}>
                Plans are being updated.
                {GYM.phone && (
                  <> Call <a href={GYM.phone.href} style={{ color: "var(--yellow)" }}>{GYM.phone.display}</a> to join today.</>
                )}
              </div>
            ) : (
              <div className="pricing-grid">
                {plans.map((plan) => {
                  const pricing = getPriceForDuration(plan, activeDuration);
                  if (!pricing) return null;
                  const featured = plan.isFeatured;
                  const months = activeDuration === 365 ? 12 : activeDuration / 30;
                  const monthly = getPriceForDuration(plan, 30);
                  const savings =
                    activeDuration !== 30 && monthly
                      ? Math.round((monthly.price * months - pricing.price) / 100)
                      : 0;

                  return (
                    <motion.article
                      key={plan._id}
                      {...reveal}
                      className={featured ? "plan-card plan-card--featured" : "plan-card"}
                    >
                      <h3 className="plan-card__name">
                        {plan.name}
                        {featured && " · most picked"}
                      </h3>
                      {plan.description && <p className="plan-card__desc">{plan.description}</p>}
                      <div>
                        {pricing.originalPrice && (
                          <span style={{ fontSize: "19px", textDecoration: "line-through", marginRight: "10px", opacity: 0.7 }}>
                            {rupees(pricing.originalPrice)}
                          </span>
                        )}
                        <span className="font-display" style={{ fontSize: "clamp(48px, 6vw, 60px)", lineHeight: 1 }}>
                          {rupees(pricing.price)}
                        </span>
                        <span style={{ fontSize: "16px", marginLeft: "6px", opacity: 0.8 }}>
                          / {pricing.label.toLowerCase()}
                        </span>
                        {activeDuration !== 30 && (
                          <div style={{ marginTop: "6px", fontSize: "15px", opacity: 0.85 }}>
                            ≈ ₹{Math.round(pricing.price / 100 / months).toLocaleString("en-IN")}/month
                            {savings > 0 && <strong style={{ marginLeft: "8px" }}>Save ₹{savings.toLocaleString("en-IN")}</strong>}
                          </div>
                        )}
                      </div>

                      {plan.features?.length > 0 && (
                        <ul className="plan-card__features">
                          {plan.features.map((f) => (
                            <li key={f}>
                              <span aria-hidden="true" className="plan-card__tick">✓</span>
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <button
                        type="button"
                        className="plan-card__cta"
                        onClick={() => navigate(`/plans/${plan.slug}?duration=${activeDuration}`)}
                      >
                        Choose {plan.name}
                      </button>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ══ MEMBER APP PERKS ═══════════════════════════════════════════════ */}
        <section className="section-dark section-block has-prop" aria-labelledby="perks-title">
          <div className="section-prop section-prop--hide-sm prop-float" style={{ right: "4%", top: "70px", width: "240px", perspective: "800px" }}>
            <DumbbellProp className="prop-spin3d" style={{ width: "100%", height: "auto", display: "block" }} />
          </div>
          <div className="container-wide">
            <SectionHead
              id="perks-title"
              eyebrow="Membership, sorted"
              title="No paper slips. No guesswork."
              intro="Every member gets an online account with their pass, payments and receipts."
            />
            <div className="grid-4 perks-grid">
              {APP_PERKS.map((p, i) => {
                const PerkIcon = p.icon;
                return (
                  <motion.div
                    key={p.title}
                    {...reveal}
                    transition={{ ...reveal.transition, delay: i * 0.06 }}
                    style={{ display: "flex", flexDirection: "column", gap: "10px" }}
                  >
                    <span className="perk-icon"><PerkIcon size={22} aria-hidden="true" /></span>
                    <h3 style={{ fontSize: "18px", fontWeight: 700 }}>{p.title}</h3>
                    <p style={{ color: "var(--text-2)", fontSize: "17px", lineHeight: 1.6 }}>{p.copy}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══ HOW JOINING WORKS ══════════════════════════════════════════════ */}
        <section className="section-dark section-block" aria-labelledby="steps-title">
          <div className="container-wide">
            <SectionHead id="steps-title" title="How joining works" />
            <ol className="grid-3" style={{ listStyle: "none" }}>
              {STEPS.map((s) => (
                <motion.li key={s.n} {...reveal} style={{ borderTop: "2px solid var(--yellow)", paddingTop: "18px" }}>
                  <span className="font-display" style={{ fontSize: "44px", color: "var(--yellow)", lineHeight: 1 }}>{s.n}</span>
                  <h3 className="font-display" style={{ fontSize: "30px", textTransform: "uppercase", margin: "8px 0" }}>{s.title}</h3>
                  <p style={{ color: "var(--text-2)", lineHeight: 1.6 }}>{s.copy}</p>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        {/* ══ VISIT (hours + map) ════════════════════════════════════════════ */}
        {(GYM.address || GYM.phone || HOURS.slots.length > 0) && (
          <section id="visit" className="section-dark section-block" aria-labelledby="visit-title">
            <motion.figure {...reveal} className="container-wide visit-banner">
              <img src="/photos/dumbbell-rack.webp" alt="Rows of hex dumbbells on the gym's rack" loading="lazy" decoding="async" width="1600" height="1015" />
              <figcaption>
                <span className="eyebrow">Doors open</span>
                <span className="font-display visit-banner__hours">{HOURS.daysLabel} · {HOURS.slots.map((x) => x.label).join(" · ")}</span>
              </figcaption>
            </motion.figure>
            <div className="container-wide visit-grid">
              <motion.div {...reveal} className="card-iron visit-card">
                <h2 id="visit-title" className="section-title" style={{ fontSize: "clamp(44px, 5vw, 60px)" }}>
                  Walk <span style={{ color: "var(--yellow)" }}>in</span>
                </h2>
                <dl className="visit-facts">
                  {GYM.address && (
                    <div>
                      <dt><MapPin size={18} aria-hidden="true" /> Address</dt>
                      <dd>{GYM.address}</dd>
                    </div>
                  )}
                  <div>
                    <dt><Clock size={18} aria-hidden="true" /> Hours</dt>
                    <dd className="hours-slots">
                      <span>{HOURS.daysLabel}</span>
                      {HOURS.slots.map((s) => <span key={s.open}>{s.label}</span>)}
                      <span style={{ color: "var(--text-3)" }}>{HOURS.closedLabel}</span>
                      <span style={{ marginTop: "8px" }}><StatusPill status={status} /></span>
                    </dd>
                  </div>
                  {GYM.phone && (
                    <div>
                      <dt><Phone size={18} aria-hidden="true" /> Phone</dt>
                      <dd><a href={GYM.phone.href} style={{ color: "var(--text-1)" }}>{GYM.phone.display}</a></dd>
                    </div>
                  )}
                </dl>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {GYM.phone && (
                    <a href={GYM.phone.href} className="btn-gold" style={{ width: "auto" }}>
                      <Phone size={17} aria-hidden="true" /> Call the gym
                    </a>
                  )}
                  {GYM.whatsappHref && (
                    <a href={GYM.whatsappHref} target="_blank" rel="noopener" className="btn-ghost">
                      <MessageCircle size={17} aria-hidden="true" /> WhatsApp
                    </a>
                  )}
                  {GYM.mapsHref && (
                    <a href={GYM.mapsHref} target="_blank" rel="noopener" className="btn-ghost">
                      <MapPin size={17} aria-hidden="true" /> Directions
                    </a>
                  )}
                  {GYM.emailHref && (
                    <a href={GYM.emailHref} className="btn-ghost">
                      <Mail size={17} aria-hidden="true" /> Email
                    </a>
                  )}
                </div>
              </motion.div>
              {mapEmbed && (
                <div className="map-frame">
                  <iframe
                    title={`Map showing ${GYM.name}, ${GYM.city}`}
                    src={mapEmbed}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* ══ FAQ ════════════════════════════════════════════════════════════ */}
        {faq.length > 0 && (
          <section id="faq" className="section-dark section-block" aria-labelledby="faq-title">
            <div className="container-wide" style={{ maxWidth: "900px" }}>
              <SectionHead id="faq-title" eyebrow="Good to know" title="Questions" />
              <div className="faq-list">
                {faq.map((f) => (
                  <details key={f.q} className="faq-item">
                    <summary>
                      <span>{f.q}</span>
                      <ChevronDown size={20} aria-hidden="true" className="faq-chevron" />
                    </summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ══ FINAL CTA ══════════════════════════════════════════════════════ */}
        <section className="final-cta has-prop" aria-labelledby="cta-title">
          <div className="section-prop section-prop--hide-sm" style={{ right: "3%", bottom: "-18px", width: "200px", opacity: 0.9 }}>
            <DumbbellProp className="prop-curl" plate="#0a0a0b" accent="#e5482b" handle="#2e2e33" style={{ width: "100%", height: "auto", display: "block" }} />
          </div>
          <div className="container-wide final-cta__inner">
            <h2 id="cta-title" className="section-title" style={{ color: "var(--iron-950)" }}>
              First rep starts today.
            </h2>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button type="button" className="btn-dark btn-lg" onClick={primaryCta.onClick}>
                {primaryCta.label}
              </button>
              {GYM.whatsappHref && (
                <a href={GYM.whatsappHref} target="_blank" rel="noopener" className="btn-outline-dark btn-lg">
                  <MessageCircle size={18} aria-hidden="true" /> WhatsApp us
                </a>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
