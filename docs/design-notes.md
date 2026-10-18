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
