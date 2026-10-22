# UI/UX Brief — "Molten Iron" Design System
## Hulk Gym Web App
**Last updated:** 22 October 2026 · Direction F "Molten Iron", chosen Oct 2026

---

## 1. Design idea
Dark steel surfaces, the logo's **yellow** for every primary action, and its **ember red-orange** as an offset "forged" shadow and for alerts. Heavy condensed display type for headings and prices; a clean sans for reading. It should feel like a serious strength gym — no stock-photo gloss, no invented claims, no emoji in the UI.

Readable by every age group: 17 px body text, 15 px minimum for secondary text, strong contrast, 44 px tap targets.

---

## 2. Tokens (`frontend/src/index.css` `:root`)

| Token | Value | Use |
|---|---|---|
| `--iron-950` | #0a0a0b | page background |
| `--iron-850` | #151517 | cards, surfaces |
| `--iron-700` | #2e2e33 | borders, dividers |
| `--text-1` / `--text-2` / `--text-3` | #edede8 / #bdbdb6 / #8c8c86 | primary / secondary / muted (all ≥ 4.5:1) |
| `--yellow` | #f3d400 | CTAs, active nav, prices, accents |
| `--ember` | #e5482b | offset shadows, alerts, danger, badges |
| `--font-display` | Big Shoulders Display 900 | h1/h2, numbers, prices — UPPERCASE |
| `--font-body` | Inter Tight 400–700 | everything else |

Fonts are self-hosted (`@fontsource`) and preloaded. Legacy names (`--gold`, `--dark-*`, `--white-*`) map onto these tokens.

## 3. Typography

| Style | Size | Use |
|---|---|---|
| `.hero-title` | clamp(64 px, 10 vw, 150 px) | landing hero |
| `.section-title` | clamp(44 px, 6 vw, 84 px) | section headings |
| `.page-title` | clamp(36 px, 4.4 vw, 52 px) | app/admin page titles (`--sm` 30–40 px) |
| `.hero-lead` | clamp(18 px, 2 vw, 21 px) | intro paragraph |
| Body | 17 px | default (`body`) |
| Secondary / labels | 15–16 px | meta, form labels, chips |
| Smallest | 12–14 px | badges, eyebrows (uppercase, tracked) |

## 4. Components (classes)

- **Buttons:** `.btn-gold` (yellow pill; ember offset shadow on hover) · `.btn-ghost` (outline pill) · `.btn-dark` / `.btn-outline-dark` (on yellow) · `.btn-danger` · `.btn-lg` / `.btn-sm`. Work on `<a>` and `<button>`.
- **Cards:** `.card-iron` · `.plan-card` (+ `--featured`) · `.contact-card` · `.refund-row` · `.plan-row`
- **Inputs:** `.input-dark`; consent `.consent-box` / `.consent-option`
- **Nav:** admin + profile sidebars — active item is a solid yellow pill with a 3 px ember shadow (`.admin-nav-item--active`); on phones the admin nav becomes a 2×2 grid. Pending counts use `.nav-badge` (ember).
- **Misc:** `.eyebrow`, `.text-molten`, `.status-pill` (open/closed), `.tab-pill`, `.faq-item` (`<details>`), `.amenity-list`, `.modal-card`, `.danger-zone`, `.refund-alert`
- **Icons:** lucide-react only; Instagram glyph in `components/ui/InstagramIcon.jsx`
- **Logo:** real brand mark on a light pill (`components/ui/Logo.jsx`)

## 5. Layout

- Containers: `.container-wide`; vertical rhythm `.section-block` (back-to-back blocks share one gap)
- `#root` / `body` use `overflow-x: clip` (not hidden) so sticky sidebars work
- Breakpoints used: 480, 640, 768, 1024 px (+ 520 px for small-phone tweaks)
- **Landing order:** hero (+ open-now pill) → fact strip → The floor (facilities) → amenities → plans → FAQ → Walk in (hours, map, contact) → final CTA → footer
- **Footer:** gym info, Gym / Policies / Contact columns, then a highlighted **developer credit card** (yellow border, ember shadow, large name, WhatsApp as the primary button), then copyright
- **Admin:** fixed top bar, sticky sidebar, max 1200 px content; Plans page shows position numbers, drag handle (hidden on phones) and ↑/↓ buttons

## 6. Motion

- Background: `components/three/ParticleBackground.jsx` — 2D-canvas ember field (no three.js)
- Hero: 3 parallax layers, transform-only, rAF-throttled; rotating weight plates
- Props: `components/ui/GymProps.jsx` (dumbbell, kettlebell) with `.prop-spin3d`, `.prop-curl`, `.prop-swing`, `.prop-float`; hidden on phones
- Framer Motion for entrances, tabs and drag-to-reorder
- Everything respects `prefers-reduced-motion`

## 7. Content rules

- Only verifiable facts. No invented member counts, trainers, testimonials or "since 20XX".
- Offer, amenities, hours, FAQ: `src/content/gymContent.js` — items render only with `show: true`.
  - Shown: free weights, functional zone, personal training (on request); lockers, changing room, RO water, parking, CCTV; Mon–Sat 6–11 AM & 5–10 PM, Sunday closed.
  - Hidden: group sessions, Zumba, AC (not offered), music system, free trial (pending owner).
- Policies: `src/content/legal.js`.
- Contacts only from env vars (`src/utils/gymConfig.js`); empty = hidden. WhatsApp and email links open with a prefilled message.
- The owner's name is never shown publicly.

## 8. Accessibility checklist
- Visible focus rings; real `<button>`/`<a>` elements; labelled icon buttons
- Tap targets ≥ 44 px; 17 px body text; only tiny badges go below 14 px
- AA contrast on all text tokens; no information by colour alone (status badges have text)
- Forms show errors inline and in a toast
