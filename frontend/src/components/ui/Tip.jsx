// =============================================================================
// src/components/ui/Tip.jsx
// =============================================================================
// Plain-language hint for controls whose label alone isn't enough.
//
//   <Tip text="What this does"><button>Archive</button></Tip>
//       Shows on mouse hover and keyboard focus. On touch screens (no hover) a
//       small "i" button appears next to the control; tapping it shows the text.
//
//   <InfoTip text="What this means" />
//       A standalone "i" button for things that aren't buttons (checkboxes,
//       field labels).
//
// The bubble is rendered in <body> so no overflow:hidden / transformed parent
// (modals, drag-to-reorder rows) can clip or misplace it.
// =============================================================================

import { cloneElement, isValidElement, useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

const GAP = 10;
const EDGE = 12;
const SHOW_DELAY = 250;

function useBubble() {
  const anchorRef = useRef(null);
  const timer = useRef(null);
  const pinned = useRef(false); // opened by a click/tap, so hover/focus changes don't close it
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0, below: false });

  const place = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = r.top < 130; // not enough room above → drop below
    const left = Math.min(Math.max(r.left + r.width / 2, EDGE + 140), window.innerWidth - EDGE - 140);
    setPos({ left, top: below ? r.bottom + GAP : r.top - GAP, below });
  }, []);

  const show = useCallback((delay = 0) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { place(); setOpen(true); }, delay);
  }, [place]);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    pinned.current = false;
    setOpen(false);
  }, []);

  // Click / tap on the "i": open and keep open; click again to close
  const toggle = useCallback(() => {
    clearTimeout(timer.current);
    if (pinned.current) { hide(); return; }
    pinned.current = true;
    place();
    setOpen(true);
  }, [hide, place]);

  // Moving the pointer away closes a hover tip, but not one opened by a click/tap
  const leave = useCallback(() => { if (!pinned.current) hide(); }, [hide]);

  // Hover only means something on devices that can hover
  const showOnHover = useCallback((delay) => {
    if (window.matchMedia?.("(hover: none)").matches) return;
    show(delay);
  }, [show]);

  // Close on Escape, scroll or resize so the bubble never floats away from its control
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && hide();
    const onDown = (e) => { if (anchorRef.current && !anchorRef.current.contains(e.target)) hide(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [open, hide]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { anchorRef, open, pos, show, showOnHover, hide, leave, toggle };
}

function Bubble({ id, text, pos }) {
  return createPortal(
    <span
      id={id}
      role="tooltip"
      className={pos.below ? "tip-bubble tip-bubble--below" : "tip-bubble"}
      style={{ left: pos.left, top: pos.top }}
    >
      {text}
    </span>,
    document.body,
  );
}

export function Tip({ text, children, touch = true }) {
  const id = useId();
  const { anchorRef, open, pos, show, showOnHover, hide, leave, toggle } = useBubble();
  if (!text || !isValidElement(children)) return children;

  const described = cloneElement(children, { "aria-describedby": open ? id : undefined });

  return (
    <span
      ref={anchorRef}
      className="tip"
      onMouseEnter={() => showOnHover(SHOW_DELAY)}
      onMouseLeave={leave}
      onFocus={(e) => { if (!e.target.closest?.(".tip__touch")) show(0); }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) hide(); }}
    >
      {described}
      {touch && <button
        type="button"
        className="tip__touch"
        aria-label="What does this do?"
        onClick={(e) => { e.stopPropagation(); toggle(); }}
      >
        <Info size={15} aria-hidden="true" />
      </button>}
      {open && <Bubble id={id} text={text} pos={pos} />}
    </span>
  );
}

export function InfoTip({ text, label = "More info" }) {
  const id = useId();
  const { anchorRef, open, pos, show, showOnHover, hide, leave, toggle } = useBubble();

  return (
    <span ref={anchorRef} className="tip" onMouseEnter={() => showOnHover(150)} onMouseLeave={leave}>
      <button
        type="button"
        className="tip__info"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        onFocus={(e) => { if (e.target.matches?.(":focus-visible")) show(0); }}
        onBlur={hide}
        onClick={(e) => {
          // Inside a <label> a click would also toggle the checkbox — don't
          e.preventDefault();
          e.stopPropagation();
          toggle();
        }}
      >
        <Info size={15} aria-hidden="true" />
      </button>
      {open && <Bubble id={id} text={text} pos={pos} />}
    </span>
  );
}

export default Tip;
