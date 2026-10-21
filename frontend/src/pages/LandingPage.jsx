// =============================================================================
// src/pages/LandingPage.jsx
// =============================================================================

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { useAuthStore } from "../store/authStore.js";
import ParticleBackground from "../components/three/ParticleBackground.jsx";
import Logo from "../components/ui/Logo.jsx";
import Navbar from "../components/layout/Navbar.jsx";
import Footer from "../components/layout/Footer.jsx";
import { motion } from "framer-motion";
import {
  heroContainer,
  heroItem,
  staggerContainer,
  staggerItem,
  staggerContainerSlow,
  cardHover,
  scrollFadeUp,
  scrollFadeIn,
  labelReveal,
  scaleIn,
  buttonHover,
  scrollScaleIn,
} from "../utils/animations.js";
import { getPublicPlans } from "../services/planService.js";

// =============================================================================
// Reusable Section Label
// =============================================================================
const SectionLabel = ({ text }) => (
  <p
    style={{
      fontSize: "11px",
      letterSpacing: "3px",
      color: "#e8c44a",
      marginBottom: "14px",
      fontWeight: "600",
      textTransform: "uppercase",
    }}
  >
    {text}
  </p>
);

// =============================================================================
// LandingPage
// =============================================================================
export default function LandingPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authUser = useAuthStore((s) => s.user);
  const isAdmin = authUser?.role === "admin";

  // Logged-in visitors must not be sent to /register or /login —
  // PublicRoute bounces them straight back here, so the click looks broken.
  const scrollToPricing = () =>
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  const handlePrimaryCta = () =>
    isAuthenticated ? scrollToPricing() : navigate("/register");
  const handleSecondaryCta = () =>
    navigate(isAuthenticated ? (isAdmin ? "/admin" : "/profile") : "/login");
  const secondaryCtaLabel = isAuthenticated
    ? isAdmin ? "Admin Dashboard" : "My Profile"
    : null;

  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedDuration, setSelectedDuration] = useState(30); // default: monthly

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await getPublicPlans();
      setPlans(res.data.data.plans);
    } catch (err) {
      console.error("Failed to load plans:", err);
    } finally {
      setPlansLoading(false);
    }
  };

  // Helper: get the price for the currently selected duration
  const getPriceForDuration = (plan, durationDays) => {
    const tier = plan.pricingTiers.find((t) => t.durationDays === durationDays);
    if (!tier) return null;

    const now = new Date();
    const hasOffer =
      tier.offerPrice &&
      (!tier.offerValidUntil || new Date(tier.offerValidUntil) > now);
    return {
      price: hasOffer ? tier.offerPrice : tier.price,
      originalPrice: hasOffer ? tier.price : null,
      label: tier.label,
    };
  };

  const durationOptions = [
    { days: 30, label: "Monthly" },
    { days: 90, label: "Quarterly" },
    { days: 180, label: "Half-Yearly" },
    { days: 365, label: "Annual" },
  ];

  // ── Data ────────────────────────────────────────────────────────────────────

  const programs = [
    {
      icon: "🏋️",
      title: "Strength & Power",
      desc: "Build raw strength with compound lifts, progressive overload, and structured periodization programs.",
      tag: "Popular",
    },
    {
      icon: "🏃",
      title: "Cardio & Endurance",
      desc: "Improve stamina and heart health with treadmills, bikes, rowing machines and guided cardio plans.",
      tag: "",
    },
    {
      icon: "🔥",
      title: "HIIT Training",
      desc: "Burn maximum calories in minimum time with high-intensity interval training sessions led by certified coaches.",
      tag: "Intense",
    },
    {
      icon: "🧘",
      title: "Yoga & Flexibility",
      desc: "Recover faster, move better, and reduce injury risk with dedicated yoga and mobility sessions.",
      tag: "",
    },
    {
      icon: "🥊",
      title: "Boxing & MMA",
      desc: "Learn real fighting techniques while getting an incredible full-body workout in our combat sports zone.",
      tag: "New",
    },
    {
      icon: "🚴",
      title: "Spin Classes",
      desc: "High-energy group cycling sessions with pumping music and motivating instructors. No experience needed.",
      tag: "",
    },
  ];

  const trainers = [
    {
      name: "Arjun Mehta",
      role: "Head Strength Coach",
      exp: "12 years",
      spec: ["Powerlifting", "Olympic Lifting", "Body Recomposition"],
      initial: "A",
    },
    {
      name: "Priya Sharma",
      role: "HIIT & Cardio Specialist",
      exp: "8 years",
      spec: ["HIIT", "Fat Loss", "Functional Fitness"],
      initial: "P",
    },
    {
      name: "Rohan Kapoor",
      role: "Combat Sports Coach",
      exp: "10 years",
      spec: ["Boxing", "MMA", "Self Defense"],
      initial: "R",
    },
  ];

  const transformations = [
    { stat: "94%", label: "Members hit their goals within 90 days" },
    { stat: "12kg", label: "Average fat loss in the first 3 months" },
    {
      stat: "2.4x",
      label: "Strength increase reported by members after 6 months",
    },
    {
      stat: "98%",
      label: "Member retention rate — people stay because it works",
    },
  ];

  const equipment = [
    {
      name: "Free Weights Zone",
      desc: "Dumbbells from 1kg to 100kg, barbells, EZ bars, and full rack stations.",
      icon: "🏋️",
    },
    {
      name: "Cardio Floor",
      desc: "50+ treadmills, bikes, ellipticals, stair climbers, and rowing machines.",
      icon: "🏃",
    },
    {
      name: "Cable & Machine Zone",
      desc: "Full range of cable machines, plate-loaded equipment, and isolation machines.",
      icon: "⚙️",
    },
    {
      name: "Functional Training",
      desc: "Battle ropes, kettlebells, sleds, pull-up rigs, and TRX suspension systems.",
      icon: "🔗",
    },
  ];

  const testimonials = [
    {
      name: "Vikram S.",
      result: "Lost 18kg in 4 months",
      text: "Hulk Gym completely changed my life. The trainers are incredibly knowledgeable and the community keeps you accountable. I've never felt stronger.",
      rating: 5,
    },
    {
      name: "Neha R.",
      result: "Gained 6kg muscle",
      text: "I was skeptical at first but the results speak for themselves. Coach Arjun built a program perfectly suited to my body and goals.",
      rating: 5,
    },
    {
      name: "Aditya K.",
      result: "Running 10km now",
      text: "Joined for weight loss but fell in love with fitness. The HIIT classes with Priya are absolutely brutal — in the best possible way.",
      rating: 5,
    },
  ];

  const navLinks = [
    { label: "Programs", href: "#programs" },
    { label: "Trainers", href: "#trainers" },
    { label: "Pricing", href: "#pricing" },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        overflowX: "hidden",
        position: "relative",
      }}
    >
      {/* Full page 3D background — sits behind everything */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <ParticleBackground />
      </div>
      {/* ══ NAVBAR ══════════════════════════════════════════════════════════════ */}
      <Navbar transparent={true} showNavLinks={true} />

      {/* ══ HERO ════════════════════════════════════════════════════════════════ */}
      <section
        className="hero-section"
        style={{
          position: "relative",
          // minHeight (not height): on short laptop screens the hero content is
          // taller than 100vh and used to overflow under the Programs section,
          // making the hero buttons unclickable.
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: "110px",
          paddingBottom: "60px",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            background:
              "radial-gradient(ellipse at 50% 40%, rgba(232,196,74,0.05) 0%, transparent 65%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "220px",
            zIndex: 1,
            background: "linear-gradient(to top, #0a0a0a, transparent)",
          }}
        />

        <motion.div
          variants={heroContainer}
          initial="initial"
          animate="animate"
          style={{
            position: "relative",
            zIndex: 2,
            textAlign: "center",
            padding: "0 1.5rem",
            maxWidth: "860px",
          }}
        >
          <motion.div variants={heroItem}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(232,196,74,0.08)",
                border: "1px solid rgba(232,196,74,0.25)",
                borderRadius: "100px",
                padding: "7px 18px",
                marginBottom: "36px",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#e8c44a",
                  display: "inline-block",
                  boxShadow: "0 0 8px #e8c44a",
                }}
              />
              <span
                style={{
                  fontSize: "12px",
                  color: "#e8c44a",
                  letterSpacing: "2px",
                  fontWeight: "600",
                }}
              >
                KOTA'S PREMIER FITNESS DESTINATION
              </span>
            </div>
          </motion.div>

          <motion.div variants={heroItem}>
            <h1
              style={{
                fontSize: "clamp(52px, 9vw, 104px)",
                fontWeight: "900",
                lineHeight: "0.95",
                marginBottom: "28px",
                letterSpacing: "-3px",
              }}
            >
              WHERE
              <br />
              <span className="text-gold-gradient">LEGENDS</span>
              <br />
              ARE MADE
            </h1>
          </motion.div>

          <motion.div variants={heroItem}>
            <p
              style={{
                fontSize: "clamp(15px, 2vw, 18px)",
                color: "rgba(255,255,255,0.45)",
                maxWidth: "500px",
                margin: "0 auto 44px",
                lineHeight: "1.75",
              }}
            >
              State-of-the-art equipment. Elite coaching. A community obsessed
              with results. Your transformation starts the moment you walk
              through our doors.
            </p>
          </motion.div>

          <motion.div variants={heroItem} className="hero-cta">
            <button
              onClick={handlePrimaryCta}
              className="btn-gold"
              style={{
                width: "auto",
                padding: "15px 36px",
                fontSize: "15px",
                letterSpacing: "0.5px",
              }}
            >
              {isAuthenticated ? "View Membership Plans →" : "Start Free Today →"}
            </button>
            <button
              onClick={handleSecondaryCta}
              className="btn-ghost"
              style={{ padding: "15px 36px", fontSize: "15px" }}
            >
              {secondaryCtaLabel || "Member Login"}
            </button>
          </motion.div>

          {/* Stats */}
          <div className="hero-stats">
            {[
              ["10,000+", "Members Transformed"],
              ["48", "Expert Trainers"],
              ["6", "Gym Locations"],
              ["15+", "Years Strong"],
            ].map(([num, label], i, arr) => (
              <div
                key={label}
                className="stat-item"
                style={{ textAlign: "center" }}
              >
                <div
                  style={{
                    fontSize: "clamp(24px, 3vw, 32px)",
                    fontWeight: "800",
                    color: "#e8c44a",
                    letterSpacing: "-1px",
                  }}
                >
                  {num}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.35)",
                    letterSpacing: "1px",
                    marginTop: "6px",
                    textTransform: "uppercase",
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <div
          className="scroll-indicator"
          style={{
            position: "absolute",
            bottom: "32px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 2,
            animation: "fadeSlideUp 1s ease 1s both",
          }}
        >
          <div
            style={{
              width: "1px",
              height: "50px",
              background: "linear-gradient(to bottom, transparent, #e8c44a)",
              margin: "0 auto",
            }}
          />
        </div>
      </section>

      {/* ══ PROGRAMS ════════════════════════════════════════════════════════════ */}
      <section
        id="programs"
        className="section-pad"
        style={{ position: "relative" }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: "600px",
            height: "400px",
            background:
              "radial-gradient(ellipse, rgba(232,196,74,0.04) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div
            style={{
              textAlign: "center",
              marginBottom: "64px",
              paddingTop: "250px",
            }}
          >
            <motion.div variants={labelReveal}>
              <SectionLabel text="Training Programs" />
            </motion.div>
            <motion.h2
              // scrollFadeUp
              variants={scrollFadeUp}
              style={{
                fontSize: "clamp(28px, 4vw, 46px)",
                fontWeight: "800",
                letterSpacing: "-1.5px",
                marginBottom: "16px",
              }}
            >
              Train with <span className="text-gold-gradient">purpose</span>
            </motion.h2>
            <p
              style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: "15px",
                maxWidth: "480px",
                margin: "0 auto",
                lineHeight: "1.7",
              }}
            >
              Six specialized training programs designed for every fitness level
              — from complete beginners to seasoned athletes.
            </p>
          </div>

          <motion.div
            className="grid-auto"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-60px" }}
          >
            {programs.map((p) => (
              <motion.div
                key={p.title}
                variants={staggerItem}
                whileHover={{
                  y: -6,
                  borderColor: "rgba(232,196,74,0.25)",
                  transition: { duration: 0.2 },
                }}
                style={{
                  padding: "28px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  position: "relative",
                  cursor: "pointer",
                }}
              >
                {p.tag && (
                  <span
                    style={{
                      position: "absolute",
                      top: "16px",
                      right: "16px",
                      fontSize: "10px",
                      fontWeight: "700",
                      letterSpacing: "1px",
                      color: "#0a0a0a",
                      background: "#e8c44a",
                      borderRadius: "6px",
                      padding: "3px 10px",
                    }}
                  >
                    {p.tag}
                  </span>
                )}
                <div style={{ fontSize: "32px", marginBottom: "16px" }}>
                  {p.icon}
                </div>
                <h3
                  style={{
                    fontSize: "17px",
                    fontWeight: "700",
                    marginBottom: "10px",
                  }}
                >
                  {p.title}
                </h3>
                <p
                  style={{
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.42)",
                    lineHeight: "1.75",
                  }}
                >
                  {p.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ TRANSFORMATION STATS ════════════════════════════════════════════════ */}
      <section
        style={{
          padding: "100px 1.5rem",
          background:
            "linear-gradient(135deg, rgba(232,196,74,0.05) 0%, rgba(232,196,74,0.02) 50%, transparent 100%)",
          borderTop: "1px solid rgba(232,196,74,0.08)",
          borderBottom: "1px solid rgba(232,196,74,0.08)",
        }}
      >
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <SectionLabel text="Real Results" />
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 46px)",
                fontWeight: "800",
                letterSpacing: "-1.5px",
              }}
            >
              Numbers that <span className="text-gold-gradient">don't lie</span>
            </h2>
          </div>

          <motion.div
            className="stats-grid"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {transformations.map((t, i) => (
              <motion.div
                key={i}
                variants={staggerItem}
                style={{
                  padding: "40px 32px",
                  textAlign: "center",
                  background:
                    i % 2 === 0
                      ? "rgba(255,255,255,0.02)"
                      : "rgba(232,196,74,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "16px",
                }}
              >
                <div
                  style={{
                    fontSize: "clamp(36px, 5vw, 52px)",
                    fontWeight: "900",
                    color: "#e8c44a",
                    letterSpacing: "-2px",
                    marginBottom: "12px",
                  }}
                >
                  {t.stat}
                </div>
                <p
                  style={{
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.45)",
                    lineHeight: "1.6",
                  }}
                >
                  {t.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ TRAINERS ════════════════════════════════════════════════════════════ */}
      <section id="trainers" className="section-pad">
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <SectionLabel text="Meet the Team" />
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 46px)",
                fontWeight: "800",
                letterSpacing: "-1.5px",
                marginBottom: "16px",
              }}
            >
              Trained by the <span className="text-gold-gradient">best</span>
            </h2>
            <p
              style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: "15px",
                maxWidth: "460px",
                margin: "0 auto",
              }}
            >
              Our coaches aren't just certified — they've lived the
              transformation themselves.
            </p>
          </div>

          <motion.div
            className="grid-3"
            variants={staggerContainerSlow}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-60px" }}
          >
            {trainers.map((t) => (
              <motion.div
                key={t.name}
                variants={staggerItem}
                whileHover={{
                  y: -6,
                  borderColor: "rgba(232,196,74,0.2)",
                  transition: { duration: 0.2 },
                }}
                style={{
                  padding: "32px",
                  transition: "transform 0.25s, border-color 0.25s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.borderColor = "rgba(232,196,74,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    marginBottom: "24px",
                  }}
                >
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "16px",
                      background: "linear-gradient(135deg, #e8c44a, #c9a832)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "26px",
                      fontWeight: "800",
                      color: "#0a0a0a",
                      flexShrink: 0,
                    }}
                  >
                    {t.initial}
                  </div>
                  <div>
                    <h3
                      style={{
                        fontWeight: "700",
                        fontSize: "17px",
                        marginBottom: "4px",
                      }}
                    >
                      {t.name}
                    </h3>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#e8c44a",
                        fontWeight: "500",
                      }}
                    >
                      {t.role}
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "20px",
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "8px",
                  }}
                >
                  <span
                    style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}
                  >
                    Experience:
                  </span>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#e8c44a",
                    }}
                  >
                    {t.exp}
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {t.spec.map((s) => (
                    <span
                      key={s}
                      style={{
                        fontSize: "11px",
                        padding: "4px 12px",
                        borderRadius: "100px",
                        background: "rgba(232,196,74,0.08)",
                        border: "1px solid rgba(232,196,74,0.15)",
                        color: "rgba(255,255,255,0.6)",
                        fontWeight: "500",
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ EQUIPMENT ═══════════════════════════════════════════════════════════ */}
      <section
        style={{
          padding: "100px 1.5rem",
          background: "rgba(10,10,10,0.6)",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div className="equipment-layout">
            {/* Left */}
            <div>
              <SectionLabel text="World Class Facility" />
              <h2
                style={{
                  fontSize: "clamp(26px, 3.5vw, 42px)",
                  fontWeight: "800",
                  letterSpacing: "-1.5px",
                  marginBottom: "20px",
                  lineHeight: "1.1",
                }}
              >
                Equipment that
                <br />
                <span className="text-gold-gradient">
                  matches your ambition
                </span>
              </h2>
              <p
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "15px",
                  lineHeight: "1.8",
                  marginBottom: "32px",
                }}
              >
                Over ₹5 crore invested in premium gym equipment across our
                facilities. Every machine, every weight, every station is
                maintained to perfection so your workout is never compromised.
              </p>
              <button
                onClick={handlePrimaryCta}
                className="btn-gold"
                style={{
                  width: "auto",
                  padding: "13px 28px",
                  fontSize: "14px",
                }}
              >
                Book a Free Tour →
              </button>
            </div>

            {/* Right */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              {equipment.map((e) => (
                <div
                  key={e.name}
                  style={{
                    padding: "20px",
                    borderRadius: "14px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    transition: "border-color 0.2s",
                  }}
                  onMouseEnter={(el) =>
                    (el.currentTarget.style.borderColor =
                      "rgba(232,196,74,0.2)")
                  }
                  onMouseLeave={(el) =>
                    (el.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.06)")
                  }
                >
                  <div style={{ fontSize: "24px", marginBottom: "10px" }}>
                    {e.icon}
                  </div>
                  <h4
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      marginBottom: "6px",
                    }}
                  >
                    {e.name}
                  </h4>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "rgba(255,255,255,0.38)",
                      lineHeight: "1.6",
                    }}
                  >
                    {e.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ PRICING ═════════════════════════════════════════════════════════════ */}
      <section id="pricing" className="section-pad">
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <SectionLabel text="Membership Plans" />
            <h2 className="section-title" style={{ marginBottom: "16px" }}>
              Invest in your{" "}
              <span className="text-gold-gradient">best self</span>
            </h2>
            <p className="section-subtitle">
              No hidden fees. Choose the duration that works for you.
            </p>
          </div>

          {/* Duration Selector Tabs */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "8px",
              marginBottom: "40px",
              flexWrap: "wrap",
            }}
          >
            {durationOptions.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setSelectedDuration(opt.days)}
                style={{
                  padding: "9px 20px",
                  borderRadius: "100px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  border:
                    selectedDuration === opt.days
                      ? "1px solid rgba(232,196,74,0.4)"
                      : "1px solid rgba(255,255,255,0.1)",
                  background:
                    selectedDuration === opt.days
                      ? "rgba(232,196,74,0.1)"
                      : "transparent",
                  color:
                    selectedDuration === opt.days
                      ? "#e8c44a"
                      : "rgba(255,255,255,0.5)",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {plansLoading ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              Loading plans...
            </div>
          ) : plans.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              Membership plans coming soon.
            </div>
          ) : (
            <motion.div
              className="pricing-grid"
              variants={staggerContainerSlow}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {plans.map((plan) => {
                const pricing = getPriceForDuration(plan, selectedDuration);
                if (!pricing) return null;

                return (
                  <motion.div
                    key={plan._id}
                    variants={staggerItem}
                    whileHover={
                      !plan.isFeatured
                        ? { y: -4, transition: { duration: 0.2 } }
                        : {}
                    }
                    className={plan.isFeatured ? "pricing-card--featured" : ""}
                    style={{
                      padding: "36px 28px",
                      borderRadius: "20px",
                      border: plan.isFeatured
                        ? "1px solid rgba(232,196,74,0.4)"
                        : "1px solid rgba(255,255,255,0.06)",
                      background: plan.isFeatured
                        ? "linear-gradient(145deg, rgba(232,196,74,0.08), rgba(232,196,74,0.02))"
                        : "rgba(255,255,255,0.02)",
                      position: "relative",
                      transform: plan.isFeatured ? "scale(1.03)" : "scale(1)",
                    }}
                  >
                    {plan.isFeatured && (
                      <div
                        style={{
                          position: "absolute",
                          top: "-14px",
                          left: "50%",
                          transform: "translateX(-50%)",
                          background: "#e8c44a",
                          color: "#0a0a0a",
                          fontSize: "11px",
                          fontWeight: "800",
                          letterSpacing: "1px",
                          padding: "5px 18px",
                          borderRadius: "100px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Most Popular
                      </div>
                    )}

                    <h3
                      style={{
                        fontSize: "15px",
                        fontWeight: "700",
                        color: plan.isFeatured
                          ? "#e8c44a"
                          : "rgba(255,255,255,0.6)",
                        letterSpacing: "2px",
                        textTransform: "uppercase",
                        marginBottom: "8px",
                      }}
                    >
                      {plan.name}
                    </h3>

                    <p
                      style={{
                        fontSize: "13px",
                        color: "rgba(255,255,255,0.4)",
                        marginBottom: "20px",
                        minHeight: "36px",
                      }}
                    >
                      {plan.description}
                    </p>

                    <div style={{ marginBottom: "28px" }}>
                      {pricing.originalPrice && (
                        <span
                          style={{
                            fontSize: "16px",
                            color: "rgba(255,255,255,0.3)",
                            textDecoration: "line-through",
                            marginRight: "8px",
                          }}
                        >
                          ₹
                          {(pricing.originalPrice / 100).toLocaleString(
                            "en-IN",
                          )}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: "42px",
                          fontWeight: "900",
                          letterSpacing: "-2px",
                        }}
                      >
                        ₹{(pricing.price / 100).toLocaleString("en-IN")}
                      </span>
                      <span
                        style={{
                          fontSize: "14px",
                          color: "rgba(255,255,255,0.35)",
                          marginLeft: "4px",
                        }}
                      >
                        / {pricing.label.toLowerCase()}
                      </span>
                      {(() => {
                        // Per-month equivalent + savings vs paying monthly
                        if (selectedDuration === 30) return null;
                        const months = selectedDuration === 365 ? 12 : selectedDuration / 30;
                        const monthly = getPriceForDuration(plan, 30);
                        const perMonth = Math.round(pricing.price / 100 / months);
                        const savings = monthly
                          ? Math.round((monthly.price * months - pricing.price) / 100)
                          : 0;
                        return (
                          <div style={{ marginTop: "8px", fontSize: "13px", color: "rgba(255,255,255,0.45)" }}>
                            ≈ ₹{perMonth.toLocaleString("en-IN")}/month
                            {savings > 0 && (
                              <span style={{ marginLeft: "8px", color: "#22c55e", fontWeight: "600" }}>
                                Save ₹{savings.toLocaleString("en-IN")}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div
                      style={{
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                        paddingTop: "24px",
                        marginBottom: "28px",
                      }}
                    >
                      {plan.features.map((f) => (
                        <div
                          key={f}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "12px",
                          }}
                        >
                          <span
                            style={{
                              color: "#e8c44a",
                              fontSize: "14px",
                              flexShrink: 0,
                            }}
                          >
                            ✓
                          </span>
                          <span
                            style={{
                              fontSize: "13px",
                              color: "rgba(255,255,255,0.55)",
                            }}
                          >
                            {f}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() =>
                        navigate(
                          `/plans/${plan.slug}?duration=${selectedDuration}`,
                        )
                      }
                      style={{
                        width: "100%",
                        padding: "13px",
                        borderRadius: "10px",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        border: "none",
                        background: plan.isFeatured ? "#e8c44a" : "transparent",
                        color: plan.isFeatured
                          ? "#0a0a0a"
                          : "rgba(255,255,255,0.6)",
                        borderColor: plan.isFeatured
                          ? "transparent"
                          : "rgba(255,255,255,0.12)",
                        borderWidth: plan.isFeatured ? 0 : "1px",
                        borderStyle: "solid",
                      }}
                    >
                      Get Started
                    </button>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* ══ TESTIMONIALS ════════════════════════════════════════════════════════ */}
      <section
        style={{
          padding: "100px 1.5rem",
          background: "rgba(10,10,10,0.6)",
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <SectionLabel text="Success Stories" />
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 46px)",
                fontWeight: "800",
                letterSpacing: "-1.5px",
              }}
            >
              Hear it from our{" "}
              <span className="text-gold-gradient">members</span>
            </h2>
          </div>

          <motion.div
            className="grid-3"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-60px" }}
          >
            {testimonials.map((t) => (
              <motion.div
                key={t.name}
                variants={staggerItem}
                className="auth-card"
                style={{ padding: "32px" }}
              >
                {/* Stars */}
                <div style={{ marginBottom: "20px" }}>
                  {"★"
                    .repeat(t.rating)
                    .split("")
                    .map((s, i) => (
                      <span
                        key={i}
                        style={{ color: "#e8c44a", fontSize: "16px" }}
                      >
                        {s}
                      </span>
                    ))}
                </div>
                <p
                  style={{
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.55)",
                    lineHeight: "1.8",
                    marginBottom: "24px",
                    fontStyle: "italic",
                  }}
                >
                  "{t.text}"
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    paddingTop: "20px",
                  }}
                >
                  <div>
                    <p style={{ fontWeight: "700", fontSize: "14px" }}>
                      {t.name}
                    </p>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "rgba(255,255,255,0.35)",
                        marginTop: "2px",
                      }}
                    >
                      Hulk Gym Member
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#e8c44a",
                      background: "rgba(232,196,74,0.1)",
                      border: "1px solid rgba(232,196,74,0.2)",
                      borderRadius: "100px",
                      padding: "4px 12px",
                    }}
                  >
                    {t.result}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ FINAL CTA ═══════════════════════════════════════════════════════════ */}
      <section style={{ padding: "100px 1.5rem 120px" }}>
        <div
          style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}
        >
          <motion.div
            variants={scrollScaleIn}
            style={{
              padding: "70px 48px",
              borderRadius: "28px",
              background:
                "linear-gradient(135deg, rgba(232,196,74,0.1), rgba(232,196,74,0.03))",
              border: "1px solid rgba(232,196,74,0.2)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Decorative circles */}
            <div
              style={{
                position: "absolute",
                top: "-60px",
                right: "-60px",
                width: "200px",
                height: "200px",
                borderRadius: "50%",
                border: "1px solid rgba(232,196,74,0.1)",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "-40px",
                left: "-40px",
                width: "140px",
                height: "140px",
                borderRadius: "50%",
                border: "1px solid rgba(232,196,74,0.08)",
              }}
            />

            <div style={{ position: "relative", zIndex: 1 }}>
              <p
                style={{
                  fontSize: "12px",
                  color: "#e8c44a",
                  letterSpacing: "3px",
                  fontWeight: "600",
                  marginBottom: "16px",
                }}
              >
                START TODAY — NO EXCUSES
              </p>
              <h2
                style={{
                  fontSize: "clamp(28px, 4vw, 44px)",
                  fontWeight: "900",
                  letterSpacing: "-1.5px",
                  marginBottom: "16px",
                  lineHeight: "1.1",
                }}
              >
                Your strongest self
                <br />
                <span className="text-gold-gradient">is waiting for you</span>
              </h2>
              <p
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "15px",
                  marginBottom: "36px",
                  lineHeight: "1.7",
                }}
              >
                Join 10,000+ members who chose to stop waiting and start
                transforming. First week is completely free — no credit card
                required.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={handlePrimaryCta}
                  className="btn-gold"
                  style={{
                    width: "auto",
                    padding: "15px 40px",
                    fontSize: "15px",
                  }}
                >
                  {isAuthenticated ? "Choose Your Plan" : "Create Free Account"}
                </button>
                <button
                  onClick={handleSecondaryCta}
                  className="btn-ghost"
                  style={{ padding: "15px 32px", fontSize: "15px" }}
                >
                  {secondaryCtaLabel || "Already a member?"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════════════════ */}
      <Footer />
    </div>
  );
}
