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
- GSAP animates transform and opacity only, and tweens created after mount go through `contextSafe`. Every animation sits inside `gsap.matchMedia()` with a reduced-motion branch, with one exception: the bottle spin runs on demand, so `spin()` checks `prefers-reduced-motion` itself and resolves at once without loading the sprite.

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

## R2 code review decisions

- The glide starts only from a card the visitor can see. A hidden card (home picks 4 to 6 on desktop) or one off screen has no useful box, so the modal then opens with its own fade and rise.
- The dialog and its scroller stop clipping while the bottle travels, so it is visible the whole way from the card, then scrolling returns. A cloned bottle outside the dialog was considered and rejected as more code for the same result.
- The card bottle fades out over 0.3s while the dialog fades in, instead of vanishing at once, so the hand-off has no gap.
- Bottle stills are served as written by `scripts/frames.ts` (`unoptimized`). The card and the modal asked for different sizes, so the modal waited on a download mid-glide. One file per bottle is shared by every view, and the frame script already writes a tuned WebP.
- The backdrop now fades out with the dialog: a `data-closing` attribute starts the CSS fade when the close timeline starts.
- Card bottles have empty alt text, because the perfume name is already the link text. The modal bottle keeps its alt.
- Dark mode sets `color-scheme: dark` so native controls and scrollbars follow.
- Kept as they are: the size radios keep an explicit `aria-label` ("10ml, $12.00") so the name is reliable across screen readers; the card skeleton keeps two title lines because most names wrap to two; the Close button scrolls with the sheet on phones, where the backdrop strip above the sheet and Back still close it.

## Plan 03 scent finder

Queries: filter chips toggle selection, live badge count screen reader, rapid chip animation interrupted, empty state no results.

Accepted:
- Chips wrap (`flex-wrap`) and never clip into one row. Each is a real button with `aria-pressed`, 44px tall, 4px radius, selected filled with the primary.
- One atomic status line carries the whole message ("3 scents match", or the no-match sentence), so a screen reader hears a full phrase, never a bare number. It is always in the DOM so the first change is announced.
- No match is never a dead end: the line suggests removing one choice and close matches are listed below.
- Results fade in with GSAP on each new result set. The previous fade is reverted first, so quick toggles never stack tweens. The selection itself updates at once.

Brief wins:
- The finder sits on the surface band between two cream sections. Its result cards switch to cream so they read as tiles on the band rather than relying on a 1px border alone.
- Clear all stays in the layout while hidden (`invisible`), so the status line does not shift when the first chip is pressed.
- If the catalog read fails, the page error boundary shows the shelf error, as R1 decided for cached pages. The finder has no separate disabled state. With an empty shelf the finder is not rendered.

Route skeletons: `/` and `/products` no longer have a `loading.tsx`. Both are prerendered and cached, so the skeleton never covered a real wait, while its Suspense boundary made React outline the page body (over 12,800 bytes) behind the skeleton in the static HTML. The content is now in the first HTML pass for crawlers and the hero paints without a swap. Checkout and admin keep their skeletons.

## Plan 03 keyboard and accessibility

- axe (wcag2a, wcag2aa, wcag22aa) runs on `/`, `/products`, `/checkout`, `/admin/login` and the 404, in light and dark, plus the finder with close matches, the product modal and the cart. Zero serious or critical issues on desktop and mobile.
- Native modal dialogs keep the page inert. Tab cycles the dialog's controls and the browser toolbar, never the page behind. The keyboard spec checks exactly that.
- Touch targets: every control on `/` and `/products` is at least 44px in one direction, counting the `.tap` hit area.
- The payment screen and Telegram popup axe check lives in `checkout.spec.ts` and runs with the other checkout specs once `.env.test` points at a Supabase test project. The local mock cannot create orders.
- Still to do by a person: one screen reader pass (NVDA or VoiceOver) on `/`, `/products` and the payment screen. Listen for one H1 then H2 then H3, the four landmarks, the finder count and payment status announced politely, and the Telegram popup announcing its title.

## Plan 03 bundle budget

Initial JavaScript is every script a page's own HTML loads (`budget.spec.ts`), gzipped, with `nomodule` skipped. It does not count what loads later: Next prefetching another route's chunk in idle time (that chunk is measured on its own route) and lazy chunks. The first version summed everything until network idle, which made the result depend on whether a prefetch landed in time (the same build read 168KB or 172KB).

| Page | R2 | Now | Budget |
|---|---|---|---|
| `/` | 206.8KB | 168.5KB | 170KB |
| `/products` | 215.8KB | 167.0KB | 170KB |

What changed:
- Zod left the storefront (31.6KB). The cart checks saved lines with a plain guard (`cart-line.ts`, unit tested). The server still validates every order with Zod.
- No `next/image` client component (about 4KB per page chunk, and Turbopack copied it into each one). The hero uses `getImageProps` on the server with a matching preload. Bottle stills were already `unoptimized`, so they are plain `img` tags.
- The product modal, cart drawer and mobile menu load on intent (hover, focus or touch down) with `React.lazy`, then stay mounted so they animate closed.

About 156KB is fixed: React, Next and its server components runtime (about 129KB) and GSAP (about 27KB). App code on the first load is about 12KB on `/`, so R3's intro has roughly 1.5KB of room or must move something off the first load.

## Plan 03 Lighthouse (local, `npm run lighthouse`, median of 3, mobile emulation)

| | `/` | `/products` | Target |
|---|---|---|---|
| Performance | 88 | 84 | 90 |
| Accessibility | 100 | 100 | 95 |
| Best practices | 100 | 100 | 90 |
| SEO | 100 | 100 | 95 |
| LCP | 3.36s | 3.87s | 2.5s |
| CLS | 0.000 | 0.000 | 0.1 |
| TBT | 260ms | 211ms | 200ms |

Not met locally: performance, LCP and TBT. Thresholds are unchanged. What the traces show:
- Observed LCP equals first paint (240ms on `/`, 188ms on `/products`). The simulated LCP is long because Lighthouse's slow 4G model shares bandwidth between the LCP image and every script requested before first paint. With all JavaScript blocked, the same page simulates at LCP 2.0s.
- `next start` serves HTTP/1.1, so the local run also queues on six connections per origin. Vercel serves HTTP/2.
- TBT is mostly React hydration (long tasks of 253, 138 and 65ms at 4x CPU slowdown).
- Tried and reverted for no measured gain: `experimental.inlineCss` and `will-change` on the bottle (GSAP already promotes layers while tweening). Kept: card float loops start paused, so off-screen bottles never animate.

The deployed run on the Vercel preview with the real catalog is the one that counts. R3 replaces the hero, which is the LCP element on `/`.
