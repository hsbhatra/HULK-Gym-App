// =============================================================================
// src/components/ui/GymProps.jsx — decorative animated gym equipment (SVG)
// =============================================================================
// Pure decoration: aria-hidden, CSS-animated (transform only), and frozen by the
// global prefers-reduced-motion rule.
// =============================================================================

// Hex dumbbell seen from the side
export function Dumbbell({ className = "", style, plate = "#1d1d20", accent = "#f3d400", handle = "#8c8c86" }) {
  return (
    <svg viewBox="0 0 240 100" className={className} style={style} aria-hidden="true">
      {/* handle */}
      <rect x="62" y="44" width="116" height="12" rx="4" fill={handle} />
      <g stroke="#0a0a0b" strokeOpacity="0.35" strokeWidth="1">
        {Array.from({ length: 14 }).map((_, i) => (
          <line key={i} x1={92 + i * 4} y1="45" x2={88 + i * 4} y2="55" />
        ))}
      </g>
      {/* collars */}
      <rect x="54" y="38" width="10" height="24" rx="2" fill={accent} />
      <rect x="176" y="38" width="10" height="24" rx="2" fill={accent} />
      {/* hex heads */}
      <polygon points="8,26 30,8 54,8 54,92 30,92 8,74" fill={plate} stroke="#4a4a50" strokeWidth="2" />
      <polygon points="232,26 210,8 186,8 186,92 210,92 232,74" fill={plate} stroke="#4a4a50" strokeWidth="2" />
      <rect x="20" y="40" width="22" height="20" rx="3" fill="none" stroke={accent} strokeWidth="2" opacity="0.8" />
      <rect x="198" y="40" width="22" height="20" rx="3" fill="none" stroke={accent} strokeWidth="2" opacity="0.8" />
    </svg>
  );
}

export function Kettlebell({ className = "", style, body = "#e5482b", handle = "#2e2e33" }) {
  return (
    <svg viewBox="0 0 120 140" className={className} style={style} aria-hidden="true">
      <path d="M34 52 C30 18 90 18 86 52" fill="none" stroke={handle} strokeWidth="12" strokeLinecap="round" />
      <circle cx="60" cy="90" r="44" fill={body} />
      <ellipse cx="46" cy="76" rx="12" ry="18" fill="#ffffff" opacity="0.12" />
      <rect x="40" y="128" width="40" height="8" rx="4" fill="#0a0a0b" opacity="0.35" />
      <text x="60" y="100" textAnchor="middle" fontFamily="Big Shoulders Display, Impact, sans-serif" fontWeight="900" fontSize="26" fill="#ffffff">16</text>
    </svg>
  );
}
