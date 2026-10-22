// =============================================================================
// src/content/gymContent.js
// =============================================================================
// Everything the landing page says about the gym itself.
//
// RULE: set `show: true` ONLY after the owner has confirmed the gym really has
// it. Items with `show: false` never render, so nothing unconfirmed goes live.
// Icons are lucide-react names (https://lucide.dev/icons).
// =============================================================================

// ── Training floor & equipment ──────────────────────────────────────────────
export const FACILITIES = [
  {
    show: true, // seen on the gym's Instagram
    icon: "Dumbbell",
    title: "Free weights",
    copy: "Dumbbells, barbells, plates and benches for real strength work.",
  },
  {
    show: true, // seen on the gym's Instagram
    icon: "Activity",
    title: "Functional zone",
    copy: "Open space for kettlebells, battle ropes and bodyweight training.",
  },
  {
    show: false,
    icon: "Cog",
    title: "Strength machines",
    copy: "Plate-loaded and cable machines for every major muscle group.",
  },
  {
    show: false,
    icon: "HeartPulse",
    title: "Cardio section",
    copy: "Treadmills, cross-trainers and bikes for warm-ups and conditioning.",
  },
  {
    show: false, // confirmed by owner: no AC — keep hidden
    icon: "Snowflake",
    title: "Air-conditioned floor",
    copy: "Train comfortably through Kota summers.",
  },
];

// ── Classes & coaching ──────────────────────────────────────────────────────
export const CLASSES = [
  {
    show: false, // owner: no group classes
    icon: "Users",
    title: "Group sessions",
    copy: "Train with a crew — same sweat, more energy.",
  },
  { show: false, icon: "Music", title: "Zumba", copy: "High-energy dance cardio." }, // owner: not offered
  { show: false, icon: "Swords", title: "Boxing", copy: "Pad work, bag work and conditioning." },
  { show: false, icon: "Shield", title: "MMA", copy: "Striking and grappling basics." },
  { show: false, icon: "Flower2", title: "Yoga", copy: "Mobility, breathing and recovery." },
  { show: false, icon: "Flame", title: "HIIT / CrossFit-style", copy: "Short, intense circuits." },
  { show: true, icon: "UserCheck", title: "Personal training", copy: "One-on-one coaching on request — ask at the desk." },
  { show: false, icon: "Salad", title: "Diet guidance", copy: "Simple nutrition plans that fit Indian meals." },
];

// ── Opening hours (used by the landing page, footer and Google structured data)
// days: 0 = Sunday … 6 = Saturday · times are 24h "HH:MM" (India time)
export const HOURS = {
  days: [1, 2, 3, 4, 5, 6],
  daysLabel: "Monday – Saturday",
  closedLabel: "Sunday closed",
  slots: [
    { open: "06:00", close: "11:00", label: "6 – 11 AM", openLabel: "6 AM", closeLabel: "11 AM" },
    { open: "17:00", close: "22:00", label: "5 – 10 PM", openLabel: "5 PM", closeLabel: "10 PM" },
  ],
};

// ── Amenities ───────────────────────────────────────────────────────────────
export const AMENITIES = [
  { show: true, icon: "Lock", title: "Lockers" },
  { show: true, icon: "Shirt", title: "Changing room" },
  { show: true, icon: "Droplets", title: "RO drinking water" },
  { show: true, icon: "ParkingCircle", title: "Parking space" },
  { show: false, icon: "Music2", title: "Music system" }, // every gym has one — not worth listing
  { show: false, icon: "Venus", title: "Women-friendly batches" },
  { show: true, icon: "Cctv", title: "CCTV" },
];

// ── FAQ — these answers describe how this website/app works, so they are
//    accurate already. Owner-dependent ones start hidden.
export const FAQ = [
  {
    show: true,
    q: "Can I join online?",
    a: "Yes. Pick a plan, create your account and pay online by UPI, card or net banking. Your membership starts right away and your receipt is emailed to you.",
  },
  {
    show: true,
    q: "Can I pay at the gym instead?",
    a: "Yes. You can pay in cash or UPI at the desk. The gym can also split the fee into installments — every payment gets its own receipt.",
  },
  {
    show: true,
    q: "Where can I see my membership and receipts?",
    a: "Log in and open My membership. You'll see your plan, days left, any upcoming installment and every receipt.",
  },
  {
    show: true,
    q: "What happens when my plan runs out?",
    a: "Each plan has a short grace period after it ends, so you have a few days to renew without losing your spot.",
  },
  {
    show: false, // "no free trial" — waiting for the owner to confirm
    q: "Is there a free trial?",
    a: "We don't offer free trials at the moment. Drop by during gym hours to see the floor before you join.",
  },
  {
    show: false,
    q: "Do you have separate timings or trainers for women?",
    a: "[Confirm with the owner]",
  },
  {
    show: false,
    q: "Can I freeze or cancel my membership?",
    a: "[Confirm with the owner — must match the refund & cancellation policy]",
  },
];
