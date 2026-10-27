// =============================================================================
// src/components/ui/DateInput.jsx
// =============================================================================
// A date field that ALWAYS reads DD-MM-YYYY (the browser's own date box follows
// the computer's language, so it showed MM/DD/YYYY). The value in and out is
// still the plain "YYYY-MM-DD" text the rest of the app and the server use.
//
//   <DateInput value={iso} onChange={(iso) => ...} min={iso} max={iso} />
//
// • Type the date (hyphens are added for you) or press the calendar button.
// • onChange gets "" while the typed date is incomplete or not a real date.
// =============================================================================

import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { inputStyle } from "./formStyles";

export const isoToDmy = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
};

const dmyToIso = (text) => {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(text);
  if (!m) return "";
  const [, d, mo, y] = m;
  const t = new Date(Date.UTC(+y, +mo - 1, +d));
  const real = t.getUTCFullYear() === +y && t.getUTCMonth() === +mo - 1 && t.getUTCDate() === +d;
  return real ? `${y}-${mo}-${d}` : "";
};

// "27102026" / "27-10-2026" → "27-10-2026" (digits only, hyphens added)
const mask = (raw) => {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4)}`;
};

export default function DateInput({
  value = "",
  onChange,
  min,
  max,
  disabled = false,
  style,
  ariaLabel,
  ...rest
}) {
  const [text, setText] = useState(isoToDmy(value));
  const pickerRef = useRef(null);

  // Follow changes made from outside (e.g. "Use automatic date", other fields)
  useEffect(() => {
    setText((current) => (dmyToIso(current) === value ? current : isoToDmy(value)));
  }, [value]);

  const handleType = (e) => {
    const next = mask(e.target.value);
    setText(next);
    onChange?.(dmyToIso(next));
  };

  const openPicker = () => {
    const el = pickerRef.current;
    if (!el || disabled) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
      el.click();
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", ...(style?.flex ? { flex: style.flex } : {}) }}>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd-mm-yyyy"
        maxLength={10}
        aria-label={ariaLabel}
        value={text}
        onChange={handleType}
        disabled={disabled}
        style={{ ...inputStyle, ...style, flex: undefined, width: "100%", paddingRight: "46px" }}
        {...rest}
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        aria-label="Open calendar"
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: "44px",
          background: "transparent",
          border: "none",
          color: "rgba(255,255,255,0.75)",
          cursor: disabled ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CalendarDays size={18} />
      </button>
      {/* Browser calendar, kept invisible — only its popup is used */}
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        min={min}
        max={max}
        value={value || ""}
        onChange={(e) => {
          setText(isoToDmy(e.target.value));
          onChange?.(e.target.value);
        }}
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: "1px",
          height: "1px",
          opacity: 0,
          pointerEvents: "none",
          colorScheme: "dark",
        }}
      />
    </div>
  );
}
