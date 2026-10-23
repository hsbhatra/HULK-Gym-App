// =============================================================================
// src/components/ui/Logo.jsx
// =============================================================================
// Single source of truth for the Hulk Gym logo (the real brand mark).
// The mark has black parts, so on dark UI it sits on a light pill.
// =============================================================================

import { Link } from "react-router-dom";

const SIZES = {
  sm: { h: 26, padX: 10, padY: 3 },
  md: { h: 34, padX: 14, padY: 4 },
  lg: { h: 48, padX: 18, padY: 6 },
  xl: { h: 46, padX: 20, padY: 6 }, // navbar
  hero: { h: 104, padX: 30, padY: 14 }, // landing hero badge
};

export default function Logo({
  size = "md", // "sm" | "md" | "lg"
  clickable = true, // links to "/"
  highlight = false, // yellow ring + ember offset shadow (navbar / hero)
  className = "",
  style = {}, // extra wrapper styles
}) {
  const s = SIZES[size] || SIZES.md;

  const mark = (
    <picture>
      <source srcSet="/logo.webp" type="image/webp" />
      <img
        src="/logo.png"
        alt="Hulk Gym"
        width={Math.round(s.h * 1.33)}
        height={s.h}
        style={{ height: `${s.h}px`, width: "auto", display: "block" }}
      />
    </picture>
  );

  const pill = {
    display: "inline-flex",
    alignItems: "center",
    background: "#edede8",
    borderRadius: "999px",
    padding: `${s.padY}px ${s.padX}px`,
    lineHeight: 0,
    textDecoration: "none",
    minHeight: 0,
    ...(highlight
      ? { border: "2px solid var(--yellow)", boxShadow: "4px 4px 0 var(--ember)" }
      : null),
    ...style,
  };

  return clickable ? (
    <Link to="/" aria-label="Hulk Gym — home" className={className} style={pill}>
      {mark}
    </Link>
  ) : (
    <span className={className} style={pill}>{mark}</span>
  );
}
