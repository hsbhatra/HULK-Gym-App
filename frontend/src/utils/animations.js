// =============================================================================
// src/utils/animations.js
// =============================================================================
// Central animation variants for Framer Motion.
// Import from here instead of defining animations inline in components.
// Change once → updates everywhere.
// =============================================================================

// =============================================================================
// PAGE TRANSITIONS
// =============================================================================

// Whole page fade — used in App.jsx route changes
export const pageFade = {
  initial  : { opacity: 0 },
  animate  : { opacity: 1 },
  exit     : { opacity: 0 },
  transition: { duration: 0.25 },
};

// Page slide up — used for auth cards and profile sections
export const pageSlideUp = {
  initial  : { opacity: 0, y: 24 },
  animate  : { opacity: 1, y: 0  },
  exit     : { opacity: 0, y: -12 },
  transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
};

// =============================================================================
// ELEMENT ENTRANCE ANIMATIONS
// =============================================================================

// Simple fade in
export const fadeIn = {
  initial  : { opacity: 0 },
  animate  : { opacity: 1 },
  transition: { duration: 0.4 },
};

// Slide up and fade in — most common entrance
export const slideUp = {
  initial  : { opacity: 0, y: 32 },
  animate  : { opacity: 1, y: 0  },
  transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
};

// Slide in from right — profile tab switching
export const slideInRight = {
  initial  : { opacity: 0, x: 24 },
  animate  : { opacity: 1, x: 0  },
  exit     : { opacity: 0, x: -16 },
  transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
};

// Scale + fade — auth cards
export const scaleIn = {
  initial  : { opacity: 0, scale: 0.96 },
  animate  : { opacity: 1, scale: 1    },
  transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
};

// =============================================================================
// STAGGER CONTAINERS
// Wrap a list of children — each child animates in sequence
// =============================================================================

// Parent container — controls stagger timing
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren  : 0.08, // 80ms between each child
      delayChildren    : 0.1,  // wait 100ms before first child
    },
  },
};

// Slower stagger for sections with fewer items (trainers, pricing)
export const staggerContainerSlow = {
  animate: {
    transition: {
      staggerChildren: 0.12,
      delayChildren  : 0.1,
    },
  },
};

// Child item used inside stagger containers
export const staggerItem = {
  initial  : { opacity: 0, y: 28 },
  animate  : { opacity: 1, y: 0  },
  transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
};

// =============================================================================
// SCROLL-TRIGGERED ANIMATIONS
// Used with whileInView prop — animates when element enters viewport
// =============================================================================

export const scrollFadeUp = {
  initial  : { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport : { once: true, margin: "-80px" }, // once:true = only animates once
  transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] },
};

export const scrollFadeIn = {
  initial  : { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport : { once: true, margin: "-60px" },
  transition: { duration: 0.5 },
};

export const scrollScaleIn = {
  initial  : { opacity: 0, scale: 0.94 },
  whileInView: { opacity: 1, scale: 1    },
  viewport : { once: true, margin: "-60px" },
  transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
};

// =============================================================================
// HOVER ANIMATIONS
// Used with whileHover prop on cards
// =============================================================================

export const cardHover = {
  whileHover: {
    y          : -6,
    borderColor: "rgba(243,212,0,0.25)",
    transition : { duration: 0.2 },
  },
};

export const cardHoverSubtle = {
  whileHover: {
    y         : -3,
    transition: { duration: 0.2 },
  },
};

export const buttonHover = {
  whileHover: { scale: 1.02 },
  whileTap  : { scale: 0.98 },
};

// =============================================================================
// HERO SPECIFIC — Staggered text reveal
// =============================================================================

export const heroContainer = {
  animate: {
    transition: {
      staggerChildren: 0.12,
      delayChildren  : 0.2,
    },
  },
};

export const heroItem = {
  initial  : { opacity: 0, y: 40 },
  animate  : { opacity: 1, y: 0  },
  transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
};

// =============================================================================
// SECTION LABEL — small uppercase label above section titles
// =============================================================================

export const labelReveal = {
  initial  : { opacity: 0, x: -16 },
  whileInView: { opacity: 1, x: 0   },
  viewport : { once: true },
  transition: { duration: 0.4 },
};