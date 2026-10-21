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
