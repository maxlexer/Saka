# SAKA Parfum

Single-brand storefront for SAKA Parfum, a local perfume shop in Cambodia. Fragrance is sold in 10ml, 20ml and 50ml bottles. The site shows what is on the shelf, helps visitors find a scent by mood or occasion, and lets them buy through a cart and checkout.

Feeling: calm, refined, tactile, like a soft pouch opening to reveal a bottle. Light cream backgrounds, black text, warm neutral accents, no other hues.

## Read this first

1. Follow this file over any earlier brief. Where this file and the original project overview disagree, this file wins (see "Locked decisions").
2. Do not write code, scaffold, or install anything until the design spec in `docs/superpowers/specs/` is approved by the user.
3. The non-negotiable build rules below apply to every file, every commit, every reply.

## Non-negotiable build rules

- Use skeleton loaders for every loading state: pages, lists, cards, images, and data fetches. No spinners, no blank screens. Skeletons match the final layout so nothing shifts when content arrives.
- Code like a senior developer. If the same functionality can be done with less code, write less code. No dead code, no needless abstractions or wrappers, no duplicated logic, no unused dependencies.
- Prioritize looks. No AI slop: no default purple or blue gradients, no emoji as icons, no generic stock copy like "Welcome to our website" or "Unlock your potential", no identical card grids with the same shadow and radius on everything, no filler sections. Every visual choice must trace back to this brand.
- Never use em dashes anywhere: not in copy, headings, alt text, or code comments. Use commas, periods, or colons instead.
- No exclamation marks in any copy.

## Required tooling for design and motion

- Web design decisions go through the UI-UX-Pro-Max skill (`ui-ux-pro-max:ui-ux-pro-max`). Run it before designing or restyling any section or component. Its output must still obey the brand brief below. The brand brief wins any conflict.
- All web animation uses GSAP (`gsap` plus `@gsap/react` and its `useGSAP` hook for React cleanup). Load the `gsap-skills` guidance (core, timeline, react, performance) before writing animation code.
- Do not add Motion, Framer Motion, or another animation library.
- GSAP is used for: the intro timeline, section fade-ups, product card expand and collapse, link underlines if not pure CSS, and the cart drawer.
- Every GSAP animation must respect `prefers-reduced-motion` (use `gsap.matchMedia()`).

## Locked decisions (override the original overview)

- English only. No Khmer, no language toggle, no Noto Sans Khmer, no hreflang, no `_kh` fields, no i18n layer. The brand brief's "Khmer and English side by side" line does not apply.
- There IS a cart and a checkout page. The original "no cart, no checkout" assumption is dropped. See "Checkout flow" below.
- Routes: `/` home, `/products` full catalog, `/checkout`, an order status route keyed by order id (used for mobile resume and the Telegram popup), and a branded `/404`. There are no per-product detail pages.
- Home shows a small set of preview product cards (3 or 6) with a "view products" arrow linking to `/products`. The full grid lives only on `/products`.
- The scent finder lives on the home page only, not on `/products`.
- Adding to cart is blocked for Out of Stock perfumes (the button is disabled and the card says so). Stock is changed manually by staff in Sanity. Checkout re-checks the flag against live data.
- Stock is tracked per perfume, not per bottle size, and has no count. Each perfume is either Available or Out of Stock, a single boolean field in Sanity that staff edit. Sizes only differ by price. The old "In stock / Few left / Out of stock" three-state label and per-size stock are dropped. Out of Stock keeps the text and icon rule (never color alone).
- Exchange rate: 1 USD = 4000 KHR, a fixed constant in code. Riel is shown for information. USD is the only price staff enter.
- Size images are not needed. Only the perfume has images. The 10ml, 20ml and 50ml bottles appear as text only (name and size, for example "Name, 20ml") in the cart and at checkout. No size lineup image section.
- The logo is delivered as a hand-built SVG, created for the user. Source files: `Saka logo.jpg` and `SakaBG logo.png` in the project root, both raster on pure white and for reference only. Use the SVG everywhere. Never place the raster files on the site.
- Bottle spin: the user will supply videos later. Until then use clearly marked placeholder frames. When the videos arrive, extract and optimize the turntable frames from them.
- Intro sequence: 0 to 1s logo fades in then out. 1 to 3s the bottle fades in, spins, and lightly lands as the hero image. The mist then covers and animates over the hero. The intro is skippable and respects reduced motion.

## Checkout flow (locked)

- Customer details at checkout: name and Telegram number. Nothing else is collected beyond the delivery link below.
- Fulfilment: the customer chooses pickup or delivery. Pickup is free. Delivery needs a pasted Google Maps link and adds a constant $2.00 fee (show the Riel amount too).
- Payment: KHQR through Bakong, using the khqr.dev relay. KHQR only, no cards.
- Mobile resume: the visitor leaves for their banking app to pay, then comes back. Checkout state (cart, entered details, order id, current step, payment status) must survive that, so they land on the correct screen. Persist it client-side and key the order by an id in the URL so a reload or return restores the right step. Never drop them back at an empty cart.
- Orders live in Supabase (Hobby plan), accessed only from the server with the service role key. No chat ids are stored and there is no customer table. The admin Telegram group is the human-readable record of paid orders.
- When payment is confirmed, the bot posts one message to the admin group with everything the customer entered (name, Telegram number, fulfilment, items and sizes, total) and, for delivery, the Google Maps link. This does not depend on the customer doing anything else.
- Supabase Hobby pauses projects after a week of inactivity. A daily Vercel cron keeps it awake and cleans old rows.
- Every time an order is paid, show the customer a popup with a button that opens the SAKA checkout Telegram bot through a deep link with a payload (`t.me/<bot>?start=<payload>`). It is optional. It is only for customers who want a confirmation.
- The confirmation and the order number go to the customer only after the bot receives that start event. The bot reads the chat id from that event and uses it once. Nothing is looked up by phone number or name.
- The popup state survives a reload or return, because the order id is in the URL.

## khqr.dev facts (verified against api.khqr.dev, do not assume more)

- `POST /v1/generate_qr` takes `amount` and optional `return_url`, `success_url`, `cancel_url` (max 2048 chars). It returns `qr`, `md5`, `tran_id`, `checkout_url`. The QR lives 10 minutes.
- There is no caller-supplied metadata, note or reference field. `tran_id` is returned, never set by us. Order details cannot travel inside khqr.dev.
- `POST /v1/check_transaction_by_md5` returns `data.status` "paid" with `tran_id`, `amount`, `currency`. Unpaid or unknown returns 404.
- The official SDK (github.com/bsthen/bakong-khqr) documents polling, not webhooks. Status values: PAID, SCANNED, UNPAID, EXPIRED. Suggested poll delays: 3s when scanned, 5s when unpaid.
- The portal docs mention webhook events `payment.success`, `payment.scanned`, `payment.expired`, signed with HMAC-SHA256 in `X-RBK-Signature`, payload `md5`, `tran_id`, `amount`, `currency`, `paid_at` only. The signed string and retry policy are undocumented, so a webhook is only a trigger. The payload is never trusted.
- Browser events (`bakongPaymentSuccess` and others) are UI only. Never fulfil from them.
- Return URLs must be on a domain verified in the developer portal (DNS TXT or file).
- Always confirm a webhook with a server-side `check_transaction_by_md5` call and compare the amount against the total recomputed from Sanity prices plus the delivery fee.
- The cart and checkout show perfume name and size as text only (for example "Name, 20ml"). No size images.
- A popup here is allowed because it is user-triggered by completing payment. It is not a first-load popup. Use the single permitted soft shadow for it.

## Pending decisions (do not assume, ask or check the spec)

- Everything else is in the design spec at `docs/superpowers/specs/2026-10-18-saka-parfum-design.md`. Its "Assumptions to confirm" section lists the defaults the user may still change.
- How many preview cards the home page shows: 3 or 6, and whether they differ by breakpoint (default: 3 on desktop, 6 on mobile, which keeps full rows at 3 and 2 columns).
- Whether home preview cards and scent finder results can add to cart directly (default: yes, same card component as the products page).

## Stack (from the original overview, still valid unless listed above as changed)

- Next.js App Router with TypeScript, server-rendered, incremental static regeneration for catalog updates.
- Tailwind CSS with design tokens as CSS variables. Light and dark mode via `prefers-color-scheme`.
- `next/font`: Montserrat 400 and 500, Jost 400 and 500. No layout shift.
- GSAP for animation. OGL with one custom fragment shader for the mist, lazy loaded after the intro starts.
- Sanity for products (including the Available or Out of Stock flag) and store settings. Zod validates all fetched data before render.
- khqr.dev (Bakong relay) for KHQR payments. Telegram Bot API for customer confirmations and the admin group message.
- Vercel hosting. Playwright and axe-core for end-to-end and accessibility checks.
- Targets on mobile: Lighthouse Performance, Accessibility, Best Practices and SEO at 90 or higher (Accessibility and SEO 95 or higher). LCP under 2.5s, CLS under 0.1, INP under 200ms. Initial JavaScript under 170KB gzipped, excluding the mist chunk. WCAG 2.2 AA. axe-core reports zero serious or critical issues.

## Mist rules (the brand brief lists smoke as off-brand, the client asked for mist)

- Soft, slow, low-contrast fog using only #F2EBDF, #DCD0BF and #AD9883. Dark mode: #23261C, #3A3A2C, #8C7964.
- No sparkles, no glow, no new hues, no gradients outside the mist itself.
- Alpha caps: 0.55 near hero edges, 0.3 over the bottle, 0.15 behind headline text. Buttons are never covered.
- Reacts to pointer or finger only. Nothing moves on scroll (no parallax). Never blocks vertical scroll.
- Canvas at 50 percent resolution, device pixel ratio capped at 1.5, 30fps cap on mobile, paused off screen and in hidden tabs. If WebGL2 fails, show a static mist image with no error message.

---

# BRAND BRIEF

## Brand summary

SAKA Parfum is a local Cambodian perfume store selling fragrance in 10ml, 20ml and 50ml bottles. The identity is a quiet, wide-spaced wordmark in black on warm taupe fabric. The site should feel calm, refined and tactile, like a soft pouch opening to reveal a bottle.

## Color palette

Measured from the logo pouch. The green in the source photo is background only and must not be used.

| Role | Hex | Use | Share |
|---|---|---|---|
| Primary | #171A12 | Headings, primary buttons, logo, key text | 10% |
| Secondary | #8C7964 | Secondary buttons, icons, active states, section accents | 8% |
| Accent | #AD9883 | Decorative fills, hover tints, badges, dividers, size selector highlights. Never text on cream | 7% |
| Background | #FAF6EE | Page background | 60% |
| Surface | #F2EBDF | Cards, product tiles, header and footer bands, input fields | 12% |
| Text | #171A12 | Body and headings on cream and surface | |
| Muted text | #685846 | Captions, helper text, metadata | |
| Border | #DCD0BF | Hairlines, card outlines, input outlines, 1px | |
| Success | #4F6B3A | In stock, order confirmed. Small status text or icons only | |
| Error | #A3392B | Form errors, out of stock. Small status text or icons only | |

Also in the palette: #685846 umber and #393625 dark olive-brown.

Dark mode: background #171A12, surface #23261C, border #3A3A2C, text #F5EFE4, muted text #BDAE9B, primary button #F5EFE4 with #171A12 text, secondary #AD9883, accent #8C7964, success #8FB174, error #E07A6A.

### Contrast rules (WCAG AA: 4.5:1 normal text, 3:1 large text and UI)

- Pass: #171A12 on #FAF6EE (about 16:1), #171A12 on #F2EBDF (about 14.5:1), #685846 on #FAF6EE (about 6.4:1), #685846 on #F2EBDF (about 5.7:1), #171A12 on #AD9883 (about 6.3:1, use for accent badges), #FAF6EE on #171A12, #4F6B3A on #FAF6EE (about 5.6:1), #A3392B on #FAF6EE (about 6:1). Dark mode: #F5EFE4 and #BDAE9B on #171A12.
- Fail for normal text: #FAF6EE on #8C7964 (about 3.7:1, only for text 24px and up, or use #171A12 on #8C7964 for bold 18px and up). #8C7964 on #FAF6EE as text (about 3.8:1, large text or icons only, use #685846 for small text). #AD9883 on #FAF6EE (about 2.6:1, never text, decoration only).
- Border #DCD0BF on cream is about 1.3:1, decorative only. Inputs also get a 1px #8C7964 border on focus.
- Never use #AD9883 or #8C7964 for small text on cream.

## Typography

The logo is a geometric sans in uppercase with very wide tracking, pointed apexes on A, a round S, similar to Montserrat.

- Headings and logo-style labels: Montserrat 400 and 500, mostly uppercase for h1 and h2.
- Body and UI: Jost 400 and 500. Fall back to system sans-serif.

| Style | Desktop / mobile | Spec |
|---|---|---|
| h1 | 48px / 32px | Montserrat 400, uppercase, line height 1.15, letter spacing 0.18em |
| h2 | 32px / 24px | Montserrat 400, uppercase, line height 1.2, letter spacing 0.14em |
| h3 | 22px / 18px | Montserrat 500, uppercase, line height 1.3, letter spacing 0.1em |
| Body | 17px / 16px | Jost 400, line height 1.65, letter spacing 0.01em |
| Small | 14px / 13px | Jost 400, line height 1.5, letter spacing 0.02em |
| Eyebrow | 12px | Montserrat 500, uppercase, letter spacing 0.3em |
| Button | 13px | Montserrat 500, uppercase, letter spacing 0.16em |

## Visual style

- Radius: 2px on buttons, inputs and cards. Product images 0px. No pills, no radius above 4px.
- Flat surfaces with 1px #DCD0BF borders. No drop shadows, except one soft `0 8px 24px rgba(23,26,18,0.08)` on the open cart drawer or modals.
- Spacing: airy. Base unit 8px. Section padding 96px desktop, 56px mobile. Card padding 24px. Content max width 1200px. Text blocks max 62ch.
- Layout: centered, symmetrical, lots of empty cream space. Product grid 3 columns desktop, 2 mobile, bottle photo large with name and price below, centered. Hero is a single large bottle image with the wordmark-style headline.
- Size selector: three outlined segments (10ml, 20ml, 50ml), 2px radius, selected one filled #171A12 with cream text.
- Imagery: bottles on cream or warm taupe (#AD9883) seamless backgrounds, soft side daylight, centered, shallow shadow. Optional lifestyle shots with linen, skin tones and fabric textures. Warm and slightly desaturated. No green or colorful backdrops.
- Icons: 1.5px stroke line icons, square caps, 24px, #171A12 or #8C7964. No filled or multicolor icons.
- Motion: slow and subtle. Product card hover: image scales to 1.03 over 400ms ease-out, border shifts to #8C7964. Primary buttons invert fill over 250ms. Links get a 1px underline that grows from the left over 300ms. Sections fade up 12px over 500ms. Respect `prefers-reduced-motion`.

## Tone and voice

- Personality: calm, refined, warm, welcoming, local, understated.
- Short sentences, 12 words or fewer where possible.
- Describe scent with notes and moments (jasmine, amber, rain on warm stone), not hype.
- Warm second person ("you"), never pushy.
- State sizes and prices plainly (10ml, 20ml, 50ml) with the price in USD and Riel where relevant.
- No exclamation marks. No all caps outside headings and buttons.
- Example headline: Find the scent that feels like you.
- Example subheadline: Fragrance in 10ml, 20ml and 50ml bottles, from our shop in Cambodia.
- Example button: SHOP FRAGRANCES

## Off-brand

- No green, blue, pink, gold foil or any color outside the palette.
- No #FFFFFF or #000000 backgrounds. Use #FAF6EE and #171A12.
- No script, serif display or decorative fonts. No heading weight above 500.
- No pill buttons, radii above 4px, glassmorphism, gradients or heavy shadows.
- No luxury clichés: gold sparkles, smoke (except the approved mist above), rose petals, couples in embrace.
- No cluttered banners, countdown timers, flashing sale badges, or popups on first load.
- No carousel that auto-advances faster than 6 seconds. No parallax.
- No emoji. No filled icons.
- Never set the logo with tight or condensed tracking. Keep its wide spacing and clear space equal to the height of the letter S on all sides.
