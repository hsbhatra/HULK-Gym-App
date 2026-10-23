// =============================================================================
// src/components/layout/Navbar.jsx
// =============================================================================
// Shared top navigation bar used across all pages.
// Automatically shows different buttons based on auth state.
// Becomes solid on scroll when transparent prop is true.
// =============================================================================

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Logo from "../ui/Logo.jsx";
import { useAuthStore } from "../../store/authStore.js";

export default function Navbar({
  transparent = false,  // true → starts transparent, becomes solid on scroll
  showNavLinks = false, // true → shows section links (landing page only)
}) {
  const navigate        = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user            = useAuthStore((s) => s.user);
  const logout          = useAuthStore((s) => s.logout);

  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);

  // Solid background triggered by scroll (only when transparent mode is on)
  useEffect(() => {
    if (!transparent) return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [transparent]);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 768) setMenuOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isSolid = !transparent || scrolled;

  const navLinks = [
    { label: "Facilities", href: "#facilities" },
    { label: "Plans",      href: "#pricing"    },
    { label: "Visit",      href: "#visit"      },
    { label: "FAQ",        href: "#faq"        },
  ];

  const linkStyle = {
    color         : "#bdbdb6",
    fontSize      : "16px",
    fontWeight    : "600",
    textDecoration: "none",
    transition    : "color 0.2s",
    cursor        : "pointer",
  };

  return (
    <>
      <nav style={{
        position      : "fixed",
        top           : 0,
        left          : 0,
        right         : 0,
        zIndex        : 100,
        height        : "var(--nav-h, 76px)",
        padding       : "0 2rem",
        display       : "flex",
        alignItems    : "center",
        justifyContent: "space-between",
        background    : isSolid ? "rgba(10,10,11,0.92)" : "rgba(10,10,11,0)",
        backdropFilter: isSolid ? "blur(16px)" : "none",
        WebkitBackdropFilter: isSolid ? "blur(16px)" : "none",
        borderBottom  : `1px solid ${isSolid ? "#1e1e21" : "transparent"}`,
        transition    : "background 0.3s, border-color 0.3s",
      }}>

        {/* Logo */}
        <Logo size="xl" clickable={true} highlight className="nav-logo" />

        {/* Center nav links — desktop only, landing page only */}
        {showNavLinks && (
          <div className="nav-links-desktop" style={{ display: "flex", gap: "32px" }}>
            {navLinks.map((l) => (
              <a key={l.label} href={l.href} style={linkStyle}
                onMouseEnter={(e) => e.target.style.color = "#f3d400"}
                onMouseLeave={(e) => e.target.style.color = "#bdbdb6"}>
                {l.label}
              </a>
            ))}
          </div>
        )}

        {/* Right side — CTA buttons desktop */}
        <div className="nav-cta-desktop" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {isAuthenticated ? (
            <>
              <span style={{ fontSize: "15px", color: "#bdbdb6" }}>
                Hi, <span style={{ color: "#f3d400", fontWeight: "600" }}>{user?.firstName}</span>
              </span>
              {user?.role === "admin" && (
                <button onClick={() => navigate("/admin")} className="btn-ghost"
                  style={{ padding: "9px 20px", fontSize: "15px" }}>
                  Dashboard
                </button>
              )}
              <button onClick={() => navigate("/profile")} className="btn-gold"
                style={{ width: "auto", padding: "9px 20px", fontSize: "15px" }}>
                My Profile
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navigate("/login")} className="btn-ghost"
                style={{ padding: "9px 20px", fontSize: "15px" }}>
                Login
              </button>
              <button onClick={() => navigate("/register")} className="btn-gold"
                style={{ width: "auto", padding: "9px 20px", fontSize: "15px" }}>
                Join Now
              </button>
            </>
          )}
        </div>

        {/* Hamburger — mobile only */}
        <button
          type="button"
          className="nav-hamburger"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            display        : "none",
            background     : "transparent",
            border         : "1px solid #2e2e33",
            borderRadius   : "999px",
            width          : "44px",
            height         : "44px",
            cursor         : "pointer",
            flexDirection  : "column",
            gap            : "5px",
            alignItems     : "center",
            justifyContent : "center",
          }}>
          <span style={{ display: "block", width: "20px", height: "2px", background: menuOpen ? "#f3d400" : "white", transition: "all 0.3s", transform: menuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
          <span style={{ display: "block", width: "20px", height: "2px", background: "#f3d400", opacity: menuOpen ? 0 : 1, transition: "opacity 0.3s" }} />
          <span style={{ display: "block", width: "20px", height: "2px", background: menuOpen ? "#f3d400" : "white", transition: "all 0.3s", transform: menuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
        </button>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div style={{
          position      : "fixed",
          top           : "var(--nav-h, 76px)",
          left          : 0,
          right         : 0,
          zIndex        : 99,
          background    : "rgba(10,10,11,0.98)",
          borderBottom  : "1px solid #1e1e21",
          padding       : "20px 24px",
          display       : "flex",
          flexDirection : "column",
          gap           : "4px",
        }}>
          {/* Nav links on mobile */}
          {showNavLinks && navLinks.map((l) => (
            <a key={l.label} href={l.href}
              onClick={() => setMenuOpen(false)}
              style={{
                color         : "#edede8",
                fontSize      : "18px",
                fontWeight    : "500",
                textDecoration: "none",
                padding       : "12px 0",
                borderBottom  : "1px solid #1e1e21",
                transition    : "color 0.2s",
                display       : "block",
              }}
              onMouseEnter={(e) => e.target.style.color = "#f3d400"}
              onMouseLeave={(e) => e.target.style.color = "#edede8"}>
              {l.label}
            </a>
          ))}

          {/* Auth buttons on mobile */}
          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            {isAuthenticated ? (
              <>
                {user?.role === "admin" && (
                  <button onClick={() => { navigate("/admin"); setMenuOpen(false); }}
                    className="btn-ghost" style={{ flex: 1, padding: "12px", fontSize: "16px" }}>
                    Dashboard
                  </button>
                )}
                <button onClick={() => { navigate("/profile"); setMenuOpen(false); }}
                  className="btn-gold" style={{ flex: 1, padding: "12px", fontSize: "16px" }}>
                  My Profile
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { navigate("/login"); setMenuOpen(false); }}
                  className="btn-ghost" style={{ flex: 1, padding: "12px", fontSize: "16px" }}>
                  Login
                </button>
                <button onClick={() => { navigate("/register"); setMenuOpen(false); }}
                  className="btn-gold" style={{ flex: 1, padding: "12px", fontSize: "16px" }}>
                  Join Now
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
