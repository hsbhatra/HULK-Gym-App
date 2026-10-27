// =============================================================================
// src/components/ui/Paged.jsx
// =============================================================================
// Shows a long list a few records at a time (newest first, as given) with
// "← Prev / Next →" buttons, so history sections don't make the page endless.
//
//   <Paged items={receipts}>{(r) => <ReceiptRow r={r} />}</Paged>
//
// • Shows PAGE_SIZE records per page; the pager only appears when there is
//   more than one page.
// • Give it a `key` (e.g. the member's id) where the list can switch to
//   another person, so it starts again from page 1.
// =============================================================================

import { Fragment, useState } from "react";

export const PAGE_SIZE = 5;

const pagerButton = (disabled) => ({
  minHeight: "44px",
  padding: "8px 16px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "transparent",
  color: disabled ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.8)",
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: "15px",
});

export default function Paged({ items = [], pageSize = PAGE_SIZE, gap = "8px", children }) {
  const [requested, setRequested] = useState(1);

  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requested, pages); // list got shorter → stay in range
  const first = (page - 1) * pageSize;
  const visible = items.slice(first, first + pageSize);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap }}>
        {visible.map((item, i) => (
          <Fragment key={item._id ?? first + i}>{children(item)}</Fragment>
        ))}
      </div>

      {pages > 1 && (
        <nav
          aria-label="Pages"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
            marginTop: "12px",
          }}
        >
          <button
            type="button"
            onClick={() => setRequested(page - 1)}
            disabled={page === 1}
            style={pagerButton(page === 1)}
          >
            ← Prev
          </button>
          <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.62)", textAlign: "center" }}>
            Showing {first + 1}–{first + visible.length} of {items.length}
            <br />
            Page {page} of {pages}
          </span>
          <button
            type="button"
            onClick={() => setRequested(page + 1)}
            disabled={page === pages}
            style={pagerButton(page === pages)}
          >
            Next →
          </button>
        </nav>
      )}
    </>
  );
}
