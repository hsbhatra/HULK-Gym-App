// =============================================================================
// src/utils/hours.js — opening-hours helpers (always evaluated in India time)
// =============================================================================

import { HOURS } from "../content/gymContent.js";

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// Current weekday + minutes in Asia/Kolkata, whatever the visitor's timezone
function nowInIndia(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export const hoursSummary = () =>
  `${HOURS.daysLabel} · ${HOURS.slots.map((s) => s.label).join(" & ")}`;

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// { open: boolean, text: "Open now · till 10 PM" | "Closed · opens 5 PM" | ... }
export function openStatus(date = new Date()) {
  const { day, minutes } = nowInIndia(date);

  if (HOURS.days.includes(day)) {
    const current = HOURS.slots.find((s) => minutes >= toMin(s.open) && minutes < toMin(s.close));
    if (current) return { open: true, text: `Open now · till ${current.closeLabel}` };
    const later = HOURS.slots.find((s) => minutes < toMin(s.open));
    if (later) return { open: false, text: `Closed · opens ${later.openLabel}` };
  }

  // Next open day
  for (let i = 1; i <= 7; i++) {
    const d = (day + i) % 7;
    if (HOURS.days.includes(d)) {
      const when = i === 1 ? "tomorrow" : DAY_NAMES[d];
      return { open: false, text: `Closed · opens ${when} ${HOURS.slots[0].openLabel}` };
    }
  }
  return { open: false, text: "Closed" };
}
