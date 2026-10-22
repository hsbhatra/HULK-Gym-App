// =============================================================================
// src/components/ui/AppLoader.jsx
// =============================================================================

import { motion } from "framer-motion";
import { GYM_NAME, GYM_INITIAL } from "../../utils/gymConfig.js";

export default function AppLoader() {
  return (
    <div style={{
      minHeight      : "100vh",
      background     : "var(--iron-950)",
      display        : "flex",
      alignItems     : "center",
      justifyContent : "center",
      flexDirection  : "column",
      gap            : "24px",
    }}>
      {/* Pulsing logo */}
      <motion.div
        animate={{
          scale  : [1, 1.08, 1],
          opacity: [1, 0.8, 1],
        }}
        transition={{
          duration: 1.4,
          repeat  : Infinity,
          ease    : "easeInOut",
        }}
        style={{
          width          : "52px",
          height         : "52px",
          borderRadius   : "12px",
          background     : "#f3d400",
          display        : "flex",
          alignItems     : "center",
          justifyContent : "center",
          fontWeight     : "900",
          color          : "#0a0a0a",
          fontSize       : "26px",
        }}>
          H
        {/* {GYM_INITIAL} */}
      </motion.div>

      {/* Spinner */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        style={{
          width       : "24px",
          height      : "24px",
          borderRadius: "50%",
          border      : "2px solid rgba(255,255,255,0.08)",
          borderTopColor: "#f3d400",
        }}
      />

      <p style={{
        fontSize  : "15px",
        color     : "rgba(255,255,255,0.5)",
        letterSpacing: "1px",
      }}>
        HULK GYM
        {/* {GYM_NAME.toUpperCase()} */}
      </p>
    </div>
  );
}
