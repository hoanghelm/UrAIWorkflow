# Whitepace — SaaS Landing Page · UI Spec

Source: Figma `lP6ylQVf0RInQPWCveSV9J`, node `9:101` — "Landing page V1 / desktop / 1920px".
Canvas: 1920px desktop, single column of full-bleed sections. Root fill: white.

---

## 1. Design Tokens

### 1.1 Color — primitives
| Token | Value | Figma var | Notes |
|---|---|---|---|
| `--color-white` | `#FFFFFF` | fill_658ab2fa | text on dark, card bg |
| `--color-navy-900` | `#043873` | fill_51f47c64 | brand surface (dark sections) |
| `--color-blue-500` | `#4F9CF9` | fill_befa436f | primary CTA / interactive |
| `--color-blue-100` | `#C4DEFD` | Primary/100 | image placeholder surface |
| `--color-yellow-300` | `#FFE492` | fill_56dec632 | accent (price, prices, login btn, card border) |
| `--color-ink-900` | `#212529` | fill_22b210fc | primary text on light |
| `--color-cream` | `#F7F7EE` | one-off | muted body text on navy (footer desc) |
| `--color-navy-700` | `#2E4E73` | one-off | divider line on navy (footer) |

### 1.2 Color — semantic
| Semantic | → primitive | Used for |
|---|---|---|
| `surface-default` | white | page bg, light sections, cards |
| `surface-brand` | navy-900 | dark hero/CTA/footer sections |
| `surface-placeholder` | blue-100 | image containers (see §4) |
| `text-primary` | ink-900 | headings/body on light |
| `text-on-brand` | white | headings/body on navy |
| `text-on-brand-muted` | cream | secondary body on navy |
| `text-accent` | yellow-300 | highlighted price ($11.99), active footer link |
| `interactive-primary` | blue-500 | Try/Get-Started/free-trial buttons |
| `interactive-accent` | yellow-300 | Login button, price-card border |
| `border-accent` | yellow-300 | price card 1px border |
| `border-on-brand` | navy-700 | footer divider |

### 1.3 Typography — family
Body/headings: **Inter**. Nav links only: **DM Sans** (flag: single deviation — confirm whether to unify on Inter). Global letter-spacing `-0.02em` on nearly all styles.

| Token | Font | Weight | Size | Line-height | Used for |
|---|---|---|---|---|---|
| `heading-h1` | Inter | 700 | 72 | — | section headings (`Project Management`, `100% your data`, `Customise it…`) |
| `heading-h1-center` | Inter | 700 | 72 | — | centered headings (`Choose Your Plan`, `Our sponsors`, `Try Whitepace today`) |
| `heading-h2` | Inter | 700 | 64 | — | hero `Get More Done with whitepace` |
| `heading-testimonial` | Inter | 700 | 70 | 84 | `What Our Clients Says` (one-off) |
| `heading-h4` | Inter | 700 | 36 | — | price amounts (`$0`, `$11.99`, `$49.99`) |
| `heading-h5` | Inter | 700 | 28 | 36 | footer `Try It Today`; logo wordmark `whitepace` (28/Bold) |
| `p1-semibold` | Inter | 600 | 24 | 36 | plan name, testimonial name |
| `p1-regular` | Inter | 400 | 24 | 32 | free-trial CTA body (centered) |
| `p2-regular` | Inter | 400 | 18 | 30 | body paragraphs |
| `p2-medium` | Inter | 500 | 18 | 23 | button labels, plan tagline |
| `p2-bold` | Inter | 700 | 18 | — | footer column titles |
| `p3-regular` | Inter | 400 | 16 | 20 | bullet list, footer links, roles |
| `p3-medium` | Inter | 500 | 16 | — | outline-button label |
| `nav-link` | DM Sans | 500 | 18 | 23 | header nav items |

### 1.4 Spacing / radius / effects
- Section rhythm: vertical padding **140px**, horizontal padding **220px** (`Header` = `16px 220px`; footer/CTA = `140px 220px 32px`).
- Radius scale: `6` (hero get-started), `8` (default buttons/cards), `10` (price cards, testimonial cards, large CTA).
- Shadows: price highlight `0 4px 50px rgba(0,0,0,0.08)`; testimonial card `15px 10px 50px rgba(0,0,0,0.1)`.
- Common gaps: 10, 12, 24, 25, 28, 32, 60, 98/100, 200 (section-internal).

---

## 2. Layout tree (top-level sections, visual order)

Full-width sections stacked vertically. `bg` = section fill.

| # | Section (Figma name) | node | bg | Layout |
|---|---|---|---|---|
| 1 | Header | 9:313 | navy | row, space-between, `16 220`, sticky candidate |
| 2 | Hero-section | 9:102 | navy | row, `140 220`, heading left + image right |
| 3 | Work-management | 107:52087 | white | column, `140 220`, gap 100 → two alternating feature rows |
| 4 | "Use as Extension" *(frame "Customise…")* | 9:1936 | navy | row, `140 220`, gap 98, text left + illustration right |
| 5 | Customise it to your needs | 9:4454 | white | row, `140 220`, gap 98, illustration left + text right |
| 6 | Pricing | 9:2149 | white | column, `140 220`, gap 60 |
| 7 | Your-work (CTA band) | 9:2297 | navy | column, `140 220`, centered heading + Try button |
| 8 | Your data | 9:2362 | white | row, `140 220`, text left + illustration right |
| 9 | Our sponsors | 9:2461 | white | column, `140 220`, gap 100, centered title + logo row |
| 10 | Apps | 9:2521 | navy | row, `140 220`, gap 100, illustration left + text right |
| 11 | Testimonial | 9:4709 | white | column, `140 220`, gap 60, centered title + 3 cards + dots |
| 12 | Free Trial (CTA) | 9:4780 | navy | column, `140 220 32`, centered stack |
| 13 | Footer | 9:2757 | navy | column, `140 220 32`, gap 200 |

Note the two "Customise it to your needs"-named frames are distinct sections (4 = navy "Use as Extension"; 5 = white "Customise it to your needs"). Rename in code for clarity.

---

## 3. Component specs

### 3.1 Header (9:313) — `row / space-between / 16px 220px`, bg navy
- **Logo** (9:314, w 191): `logo-icon.svg` (37×29) + wordmark `whitepace` (Inter Bold 28, white), gap ~10.
- **Nav-menu** (9:324, row gap 32): items `Products · Solutions · Resources · Pricing`, each = label (`nav-link`, DM Sans 500/18, white) + `chevron-down.svg` (10×5). 60px gap between nav group and buttons.
- **Buttons** (9:337, row gap 24, height 60):
  - `Login` — bg yellow-300, radius 8, pad `16 40`, label navy `p2-medium`.
  - `Try Whitepace free` — bg blue-500, radius 8, pad `16 24`, label white `p2-medium` + `arrow-sm.svg`.

### 3.2 Hero (9:102) — `row / align-center / 140 220`, bg navy
- Absolute decorative `hero-wave.svg` (2652×548, opacity 0.30) behind content.
- **Heading** (col, gap 60): text-block (col gap 24) = H2 white `Get More Done with whitepace` + `p2-regular` white subcopy; then **Btn-free-trial** blue-500, radius 8, pad 20, `Try Whitepace free` + `arrow-sm.svg`.
- **Image-container** (9:179): placeholder box, bg blue-100 → hero product screenshot slot.

### 3.3 Feature row (repeats: 107:52088, 107:52345, 9:1936, 9:4454, 9:2362, 9:2521)
Two-column `row / align-center`, alternating image/text side per section:
- **Text side** (col gap 60): heading H1 + `p2-regular` body + a CTA. Behind heading: absolute decorative `Element` SVG underline/scribble (per-section, opacity varies).
- **Image side**: either blue-100 placeholder box (`Project Management`, `Use as Extension`, `Customise`) or real illustration (`illustration-work-together.svg`, `illustration-your-data.svg`, `illustration-apps.svg`).
- CTA variants used: `Get Started` (blue pill w/ arrow — EL-4d128f6c, radius 6), `Read more`/`Try it now`/`Try Taskey` (blue pill EL-d36d84bd, radius 8).

### 3.4 Pricing (9:2149)
- Centered heading: H1-center `Choose Your Plan` + `p2-regular` (w 979, centered) subcopy, gap 24.
- **Price list** (row, center, gap 32) — 3 cards:
  - **Free** (9:2183) & **Organization** (9:2259): white bg, **1px yellow-300 border**, radius 10, pad `40 44`, gap 25.
  - **Personal** (9:2221, highlighted/elevated): **navy bg**, radius 10, shadow `0 4px 50px rgba(0,0,0,0.08)`, pad `80 44` (taller). Plan name & body white; **price `$11.99` yellow-300**.
  - Card content: plan name `p1-semibold`, amount `heading-h4`, tagline `p2-medium`, bullet list (6 rows: `check.svg` 21×21 + `p3-regular`/`p2-medium`), CTA button.
  - CTA: light cards → outline `Get Started` (white bg, 1px yellow border, radius 8, pad `16 40`, `p3-medium` ink); Personal → solid blue-500 `Get Started`.

### 3.5 Testimonial (9:4709)
- Centered `heading-testimonial` `What Our Clients Says`.
- **Content** (row gap 32): 3 **Client cards**:
  - Default (9:4741): white bg, radius 10, shadow `15px 10px 50px rgba(0,0,0,0.1)`, pad `60 40`, gap 60.
  - **Middle card (9:4754) highlighted: bg blue-500** (active state), white text.
  - Card = Comment block (quote `quote.svg` 86×62 + `p2-regular` quote, 1px bottom border, pad-bottom 40) + Name-box (avatar ellipse 95×95 `avatar-1..3.png` + name `p1-semibold` + role `p3-regular`, align flex-end, gap 42).
- **Slider dots** (36:26343, row gap 12): three 12×12 ellipses; active = blue-500, inactive = navy-900.

### 3.6 CTA bands (Your-work 9:2297, Free Trial 9:4780)
- Centered heading H1(-center) white + body, plus blue-500 pill CTA. Free Trial adds secondary text `On a big team? Contact sales` and app-icon row (`appicon-apple/windows/android.svg`, 60×60, gap 40). `Your-work` has absolute decorative background SVG (opacity 0.20).

### 3.7 Sponsors (9:2461)
Centered H1-center `Our sponsors` + logo row (space-between): `sponsor-apple.svg` (56×68), `sponsor-microsoft.svg` (287×62), `sponsor-slack.svg` (280×71), `sponsor-google.svg` (211×70).

### 3.8 Footer (9:2757) — bg navy, `140 220 32`, gap 200
- **Info row** (gap 100): Logo+description (240w, body `p2-regular` in cream) · `Product` · `Resources` · `Company` link columns (title `p2-bold`, links `p3-regular`; first Product link `Overview` uses yellow-300 = active) · `Try It Today` block (`heading-h5` + `p3-regular` + blue `Start today` pill).
- **Bottom row** (space-between): language selector (globe + `English` + chevron) + `Terms & privacy · Security · Status · ©2021 Whitepace LLC.` + social icons (`social-facebook/twitter/linkedin.svg`, gap 32).
- Absolute divider `LINE` 1480×1px, stroke navy-700.

---

## 4. Image placeholders (no bitmap in Figma — need real assets at build)
These are `blue-100` (#C4DEFD) filled boxes; supply product screenshots/illustrations:
- Hero image (9:179), Project Management image (107:52128, 748×547), Use-as-Extension (107:52083, 686×479), Customise image (9:4455).

---

## 5. Interactive states (⚠ inferred — Figma has no hover/focus variants)
- **Buttons**: default per §3. Hover: darken blue-500 ~8% / raise elevation; yellow login hover: slight darken. Active: translateY(1px). Focus-visible: 3px outline `#005FCC` offset 2px (a11y). Disabled: 50% opacity, no pointer.
- **Nav items**: hover underline or opacity 0.8; chevron rotates 180° when its menu open (`aria-expanded`).
- **Pricing / testimonial cards**: one card pre-highlighted per design (Personal = navy, middle testimonial = blue). On hover of non-highlighted cards, lift with shadow.
- **Slider dots**: clickable; active = blue-500, others navy; `aria-selected` on active.
- **Links (footer/nav)**: hover color → yellow-300 (matches active `Overview`).

## 6. Accessibility notes
- Contrast: white on navy-900 ✓ (>12:1); ink-900 on white ✓. **Check** blue-500 text on navy and yellow-300 as text — verify ≥4.5:1; use for large/emphasis only.
- Decorative `hero-wave` / `Element` scribbles → `alt=""` / `aria-hidden`.
- Sponsor & social SVGs need accessible names (`aria-label`).
- Nav dropdowns: keyboard operable, `role="button"`+`aria-expanded`.
- Maintain heading hierarchy: one `h1` per page (hero H2 acts as page title — promote to h1 semantically), section titles h2.

---

## 7. Exported assets (`public/assets/`)
| File | Size | Purpose |
|---|---|---|
| `logo-icon.svg` | 37×29 | brand mark (header + footer) |
| `hero-wave.svg` | 2652×548 | hero bg decoration (opacity .30) |
| `check.svg` | 21×21 | pricing bullet tick |
| `chevron-down.svg` | 10×5 | nav / language dropdown arrow |
| `arrow-sm.svg` | 11×11 | small button arrow |
| `arrow.svg` | 15×15 | button arrow (get-started/try) |
| `quote.svg` | 86×62 | testimonial quote mark |
| `sponsor-apple.svg` | 56×68 | sponsors row |
| `sponsor-microsoft.svg` | 287×62 | sponsors row |
| `sponsor-slack.svg` | 280×71 | sponsors row |
| `sponsor-google.svg` | 211×70 | sponsors row |
| `social-facebook.svg` | 9×17 | footer social |
| `social-twitter.svg` | 17×14 | footer social |
| `social-linkedin.svg` | 15×15 | footer social |
| `appicon-apple.svg` | 60×60 | free-trial app icons |
| `appicon-windows.svg` | 60×60 | free-trial app icons |
| `appicon-android.svg` | 60×60 | free-trial app icons |
| `illustration-apps.svg` | 582×471 | Apps section |
| `illustration-work-together.svg` | 710×661 | Work-management row 2 |
| `illustration-your-data.svg` | 759×400 | Your data section |
| `avatar-1.png` | 200×200 | testimonial avatar |
| `avatar-2.png` | 200×200 | testimonial avatar |
| `avatar-3.png` | 200×200 | testimonial avatar |

All saved to `D:\tools\VCC-Workflow\examples\sass-landingpages\public\assets`.
