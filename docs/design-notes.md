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
