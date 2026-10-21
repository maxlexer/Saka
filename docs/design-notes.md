# Design notes

The brand brief in `CLAUDE.md` wins any conflict with tool suggestions. Each section records what `ui-ux-pro-max` proposed and what was accepted or rejected.

## Pass 1 tokens

Query: luxury perfume boutique, minimal, calm, editorial (variance 2, motion 2, density 2).

Accepted:
- Minimalism style with generous white space and a grid-based layout.
- Subtle hover transitions between 200ms and 300ms. The brief sets 250ms for buttons, 300ms for link underlines and 400ms for card images, and those values are used.
- Visible keyboard focus, `prefers-reduced-motion` respected, 4.5:1 text contrast.
- Pointer cursor on enabled buttons. Tailwind v4 resets it to default, so `globals.css` restores it.
- A scroll-reveal of 12px over a short duration. The brief says 500ms, so 500ms is used. It fires once on enter, never tied to scroll position, and uses an IntersectionObserver instead of ScrollTrigger.

Rejected:
- Purple and green palette (#7C3AED, #059669), white card (#FFFFFF) and black text on accent. All are off-brand. The palette in the brief is used.
- Lora and Raleway. The brief fixes Montserrat for headings and Jost for body, with no serif.
- "Hero + Testimonials + CTA" page pattern. There are no testimonials, and the home page structure comes from the spec.
- ScrollTrigger reveal with `toggleActions: reverse`. Sections fade up once only.

Deviation recorded from the plan header: product cards use 16px padding below 768px so two columns fit at 390px. 24px applies from 768px up.

## Pass 1 header, menu, footer

Queries: modal focus handling, mobile navigation overlay.

Accepted:
- A 2px focus outline with 2px offset on every control, including dialog controls. This is the global `:focus-visible` rule.
- A sticky header, not a fixed one, so it takes up layout space and needs no body padding. `scroll-padding-top` keeps anchor targets clear of it.
- Native `<dialog>` with `showModal()` for the cart and the mobile menu. Focus trap, Escape and focus return come from the platform.

Rejected:
- Blue focus ring example. The ring uses the brand secondary, #8C7964.
- Pushing history entries for the menu. It is a transient overlay and closes on link click, so back behaves normally.

## Pass 1 product card and section rhythm

Queries: expandable card with size selector and quantity stepper, ecommerce card out-of-stock state. Both returned only loosely related generic guidance, so no database match was found for the card itself and the card follows the brief.

Accepted:
- Body text stays at 16px on mobile. Captions and metadata use the brief's 13px and 14px small style, which is below the generic 16px suggestion on purpose.
- A consistent type scale. The scale is the brief's: 12, 13, 14, 16, 17, 18, 22, 24, 32, 48.

Brief wins:
- Card is an outlined 2px-radius surface with a 1px border that turns #8C7964 on hover, not a shadowed tile.
- Size selector is three outlined segments, the selected one filled with the primary color.
- Out of stock is text plus an icon in the error color, never color alone, and the add button is disabled.

## Pass 1 hero, home, Visit us and 404

Queries: single product hero (landing patterns), 404 and error states.

Accepted:
- Minimal single column hero: headline, one short line, one centered call to action, lots of space.
- Call to action label contrast above 4.5:1 (cream on #171A12).

Rejected:
- White #FFFFFF in the suggested color strategy. The brief forbids it.
- "Benefit bullets" and a features row. They would be filler sections.
- Sticky hero call to action. The header already stays in view, and the hero must stay uncluttered.

## Pass 2 checkout form and payment screen

Queries: inline validation error near field, checkout form submit loading, countdown timer screen reader live region. The first two returned matching form guidance. The countdown query returned only generic screen reader advice, so no verified match was found for the countdown and it follows the brief.

Accepted:
- Each invalid field shows its error directly below, with an icon and text, linked by aria-describedby. Never color alone.
- After a failed submit, focus moves to the first invalid field. Once errors are showing, they re-check as the customer types, so a fixed field clears at once.
- The submit button reads "Preparing your code" and sets aria-busy while the order is created.
- Labels are always visible above fields. The map link placeholder is an example, not the label.

Rejected:
- A separate error summary box at the top. With three fields, focus on the first invalid field does the same job with less clutter.
- Validation on every blur. Errors appear only after the first submit, so a calm form does not scold a half finished entry.
- A live region on the countdown. Announcing every second would be noise. Only the status line ("Waiting for payment") is aria-live="polite".

Brief wins:
- Pickup or delivery is a two segment outlined control, the selected segment filled #171A12 with cream text, 2px radius.
- The summary panel is a flat surface tile with a 1px border, no shadow.
- The QR is #171A12 on #FAF6EE inside a bordered cream tile, in both themes, so it always scans.
- The paid popup uses the single permitted soft shadow, and it opens only after payment, never on first load.

## R2 tokens and theme

Queries: theme toggle header accessible, modal dialog backdrop transition (both `--domain ux`). GSAP core, timeline, react and performance guidance loaded before the motion code.

Accepted:
- The theme switch is a real button with a fixed accessible name ("Dark mode") and `aria-pressed` for its state, so the name never flips with the icon.
- Every control inside a dialog keeps a visible focus ring.
- Motion never decides state: the theme attribute and the dialog open state are set directly, the fade only decorates.
- GSAP animates transform and opacity only, every animation sits inside `gsap.matchMedia()` with a reduced-motion branch, and tweens created after mount go through `contextSafe`.

Rejected:
- A sun and moon slider pill in the header. Pills are off-brand, and an icon button is quieter.
- Following the device dark mode. The redesign wants light for everyone until they choose.

Brief wins:
- The backdrop is a soft #171A12 at 30 percent, faded with CSS because GSAP cannot reach `::backdrop`.
- Cards, the drawer, dialogs and admin panels use the 8px `rounded-card`; buttons and inputs keep 4px.

## R2 cards and grids

Queries: product card hover minimal (`--domain ux`), grid stagger reveal (`--domain gsap`).

Accepted:
- Click or tap opens the modal. The hover turn is decoration only, so touch visitors lose nothing.
- Hover feedback is the border warming to the secondary color over 500ms, plus the pointer cursor of a link.

Rejected:
- Per-card stagger reveal with `back.out(1.4)` and a 0.92 scale. Back eases are banned, and the section fade-up already brings the grid in. Twenty cards popping one by one would be busy.
- Card shadows and scale-up on hover. The floating bottle is the card's only motion.

Brief wins:
- Cards show the bottle and the full name only. Sizes, prices and stock live in the modal.
- The name uses `.card-title` (13px, 15px on desktop), smaller than h3, because designer names are long and must never truncate.

## R2 product modal

Queries: product quick view modal mobile sheet, focus management dialog (both `--domain ux`), shared element transition (`--domain gsap`). The first query returned only general mobile guidance, so the sheet layout follows the spec.

Accepted:
- One shared element per open: the card bottle glides into the stage. The glide only runs when the card is on the page; a shared link opens with the dialog fade alone.
- The glide sits in the suggested 500 to 800ms range (`MOTION.glide`, 0.8s).
- Focus starts on Close, every control shows the 2px focus ring, and closing returns focus to the card.

Rejected:
- The GSAP Flip plugin. One rectangle measurement of a 4:5 box to a 4:5 box is enough and adds no bundle weight.
- `expo.inOut` and a 250ms exit cap. The brief wants `power3.inOut` for glides and nothing visible under 300ms, so the exit is `MOTION.exit` (0.5s).

Brief wins:
- The modal carries the single permitted soft shadow. Desktop is a centered two column dialog, phones get a bottom sheet with the bottle on top.
- Stock is one fully rounded "Out of stock" pill in ink on taupe, and a disabled Add to cart button that points at it. No icon, no red, no extra line.

Found while watching it: GSAP 3.13 folds the CSS `translate` property (Tailwind's `-translate-x-1/2`) into its own transform. In the modal it did so while the dialog was still closed and froze a wrong pixel offset, so the bottle landed off center. `SpinBottle` now centers the bottle and its shadow with flex and auto margins, and GSAP only touches `y`, `scaleX` and opacity. Reduced motion checked: the modal appears at once, nothing floats, and the spin sprite is never requested.

## R2 numbers

Next 16 no longer prints First Load JS, so the production build was served and every script each page loads was gzipped and summed (level 9).

- `/`: 205.0KB gzipped (662KB raw), 11 scripts.
- `/products`: 213.8KB gzipped (686KB raw), 12 scripts.
- Target: 170KB. Over by about 35 to 44KB.
- Where it goes: about 106KB is React and Next itself, 31.6KB is Zod (the cart validates saved lines with it on the client, since pass 1), 27.6KB is GSAP, and the rest is app code. R2's own components are a small share.
- For plan 03: dropping Zod from the client cart would bring both pages near 175KB. The budget gate there decides how.

Also for plan 03: home and /products ship their content as an outlined stream segment behind the `loading.tsx` skeleton, because React outlines any boundary over 12,800 bytes (home 14.5KB, /products 38KB). An inline script swaps it in at once, so visitors see it normally, but crawlers without JavaScript see the skeleton and the hero image may paint later. Checkout is small and inlined.

## R2 manual pass

- Keyboard only: pass. Home tabs through header, hero button, preview cards, View products and the footer. A card opens with Enter, focus lands on Close, then sizes, quantity and Add to cart. Escape closes and returns focus to the card.
- Theme switch on a phone: pass (theme spec on the Pixel 7 project, plus a 390px screenshot).
- No sizes, prices or stock outside the modal, cart and checkout: pass (catalog spec checks home and /products text).
- No Riel anywhere: pass (`usd-only` unit test).
- Out of stock shows only the pill: pass (modal spec: one pill, three icons, no error text).
- Card corners 8px, buttons and inputs 4px: pass (computed styles on /products).
- Reduced motion: pass. The modal appears at once, nothing floats and the spin sprite is never requested.
