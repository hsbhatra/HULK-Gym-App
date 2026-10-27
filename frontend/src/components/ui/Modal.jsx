// =============================================================================
// src/components/ui/Modal.jsx
// =============================================================================
// The shared pop-up shell: dark backdrop + rounded panel that fades and rises
// in (and out, when the parent wraps it in <AnimatePresence>).
//
//   <AnimatePresence>
//     {open && <Modal label="Cancel membership" maxWidth="420px">…</Modal>}
//   </AnimatePresence>
//
// • Phone-first: small side gutters, the panel scrolls if it is taller than the screen.
// • Respects "reduce motion": no movement, instant.
// • `onBackdropClick` is optional — most money pop-ups should NOT close by accident.
// =============================================================================

import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";

export default function Modal({
  children,
  label,
  zIndex = 200,
  maxWidth = "560px",
  padding = "clamp(18px, 5vw, 32px)",
  backdrop = "rgba(0,0,0,0.75)",
  onBackdropClick,
  panelStyle,
}) {
  const reduce = useReducedMotion();
  const ease = [0.22, 1, 0.36, 1];

  // Rendered on <body> so a pop-up inside another pop-up is never clipped or
  // offset by the outer one (blur/transform on a parent trap fixed children).
  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={onBackdropClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex,
        background: backdrop,
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(10px, 3vw, 24px)",
      }}
    >
      <motion.div
        onClick={onBackdropClick ? (e) => e.stopPropagation() : undefined}
        initial={reduce ? false : { opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: reduce ? 0 : 0.28, ease }}
        style={{
          background: "var(--iron-850)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px",
          padding,
          maxWidth,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          ...panelStyle,
        }}
      >
        {children}
      </motion.div>
    </motion.div>,
    document.body,
  );
}
