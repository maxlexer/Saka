# SAKA Parfum Storefront: Design Spec

Date: 2026-10-18. Status: draft for user review. Sources: the project overview, the brand brief and the decisions in `CLAUDE.md`. Where this spec and `CLAUDE.md` differ, fix the spec.

## 1. Summary

A small online storefront for SAKA Parfum, a perfume shop in Cambodia. Visitors browse what is on the shelf, find a scent by mood or occasion, add bottles (10ml, 20ml, 50ml) to a cart, and pay by KHQR. The shop gets every paid order in a Telegram admin group. Customers can optionally get a confirmation from the bot.

It opens with a 3 second branded intro and a hero that is covered by a soft mist reacting to the cursor or finger.

English only. Light and dark mode. Mobile first.

## 2. Assumptions to confirm

These are defaults I chose. Say which to change.

1. **KHQR currency.** The store token fixes the currency. This spec assumes USD, with Riel shown for information only. If the token is KHR, totals are rounded to 100 Riel.
2. **Intro runs on the home page only**, on every full load of `/`. It never runs on `/products`, `/checkout` or a return from a banking app.
3. **Dark mode is shipped now** for all UI. The hero stage and the intro stay on the cream tones, because the bottle photography is shot on cream and cannot sit on #171A12 without cutouts. The dark mist palette is defined for when cutouts exist.
4. **Home shows 3 preview cards on desktop and 6 on mobile.** Cards on home and in the finder can add to cart.
5. **Retention.** Paid orders keep customer fields for 90 days, then the name, number and map link are cleared. Order number, items, total and times stay. Unpaid orders are deleted after 24 hours.
6. **Customer confirmation text.** Order number, total, paid time, pickup or delivery. No item list.
7. **Order numbers** are sequential (`SK-1001`, `SK-1002`), assigned only when an order is paid, so abandoned checkouts leave no gaps.
8. **QR styling.** The QR is drawn in #171A12 on #FAF6EE to stay in palette. Check this against the Bakong and khqr.dev display rules before launch. If a standard KHQR card is required, it is shown as a third-party payment asset.
9. **No hosted khqr.dev checkout.** We draw our own payment screen from the `qr` string, so no verified return-URL domain is needed for payment. The domain is still needed for the real site.
10. **Delivery fee** is the constant $2.00, held in code, not in Sanity.
11. **Exchange rate** is the constant 1 USD = 4000 KHR (confirmed by the user), held in code. There is no rate field in Sanity.
12. **Cart ships in pass 1.** The header cart button and the product card both need it, so the cart store and drawer are built with the catalog. Pass 2 starts at checkout.
13. **khqr.dev paid check.** The OpenAPI spec (api.khqr.dev/openapi.json, v2.1.6) shows the md5 check returns HTTP 200 with `data.amount` and `data.currency` only once paid, and 404 otherwise. There is no `status` field to rely on. Auth is `Authorization: Bearer <rbk_token>`. The service answers repeat checks within 5 seconds from cache.

## 3. Architecture

```
Browser (Next.js client)
  cart in localStorage, GSAP, OGL mist
        |
Next.js on Vercel (App Router, TypeScript)
  server components, ISR, route handlers
   |           |             |             |
 Sanity     Supabase      khqr.dev      Telegram Bot API
 catalog,   orders only   create QR,    admin group message,
 stock      (service role) check paid   customer confirmation
 flag,
 settings
```

- **Sanity** holds products, the Available or Out of Stock flag, and store settings. Staff edit only here. The Studio is hosted by Sanity, not embedded in the site.
- **Supabase Postgres** holds orders only. No client ever talks to it. Row level security is on with no policies, and the server uses the service role key.
- **khqr.dev** creates the QR and reports payment. It cannot carry order details, so Supabase does.
- **Telegram** gets the admin message when an order is paid. It also sends the customer confirmation after they press Start through a deep link.
- No chat ids are stored. The bot reads the chat id from the start event, replies once, and discards it.

## 4. Routes

| Route | Purpose |
|---|---|
| `/` | Intro, hero, preview cards with "view products" arrow, scent finder, visit us, footer |
| `/products` | Full catalog grid. No scent finder |
| `/checkout` | Cart review and customer details form |
| `/checkout/[orderId]` | Payment screen, paid state, Telegram popup. Resumable |
| `/404` | Branded not found page with a link home |
| `/api/orders` (POST) | Validate, price, store and create the QR |
| `/api/orders/[id]` (GET) | Status for polling. No personal data in the response |
| `/api/khqr/webhook` | Payment trigger, re-verified server side |
| `/api/telegram` | Bot webhook for `/start <token>` |
| `/api/revalidate` | Sanity webhook for on-demand revalidation |
| `/api/cron/daily` | Keep Supabase awake, retry unsent admin messages, delete or scrub old rows |
| `sitemap.xml`, `robots.txt` | `/checkout` and `/api` are disallowed and `noindex` |

There are no product detail pages. Header links: Products, Scent finder (`/#finder`), Visit us (`/#visit`), and a cart button with a count. The hero button SHOP FRAGRANCES goes to `/products`. FIND YOUR SCENT scrolls to `#finder`.

## 5. Data

### 5.1 Sanity `product`

| Field | Type | Rules |
|---|---|---|
| name | string | required, max 60 |
| slug | slug | required, unique |
| description | text | required, max 160 |
| notesTop, notesHeart, notesBase | string array | 1 to 5 each |
| scentFamily | enum array | floral, woody, citrus, amber, fresh_aquatic, musk. At least 1 |
| vibes | enum array | calm, fresh, warm, bold, romantic, earthy |
| occasions | enum array | everyday, work, evening, date_night, ceremony, gift |
| image | image | required, alt text required |
| imageHover | image | optional, alt text required if present |
| sizes | array of `{ sizeMl, priceUsd }` | at least 1, `sizeMl` is 10, 20 or 50 and unique per product, `priceUsd` 2 decimals |
| available | boolean | default true. Staff flip it by hand. This is the stock |
| displayOrder | number | default 100 |
| isActive | boolean | default true. False hides the product entirely |

### 5.2 Sanity `siteSettings` (single document)

`storeName`, `address`, `hours` (array of `{ days, open, close }`), `phone`, `mapUrl`, `socialLinks` (array of `{ label, url }`), `stockUpdatedAt` (datetime, set by staff).

Taxonomy enums live in one file, `src/lib/taxonomy.ts`. The Sanity schema and the finder both import it.

### 5.3 Validation

Zod parses every Sanity response. A product missing a name, an image or a size is skipped and logged, never rendered. A bad `siteSettings` document falls back to placeholder text.

### 5.4 Supabase `orders`

```sql
create sequence order_number_seq start 1001;

create table orders (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending','paid')),
  order_number integer unique,
  claim_token text not null unique,
  customer_name text,
  telegram text,
  fulfilment text not null check (fulfilment in ('pickup','delivery')),
  map_url text,
  items jsonb not null,
  subtotal_usd numeric(8,2) not null,
  delivery_fee_usd numeric(8,2) not null,
  total_usd numeric(8,2) not null,
  khqr_md5 text not null unique,
  khqr_tran_id text,
  khqr_qr text not null,
  khqr_deeplink text,
  ip_hash text,
  expires_at timestamptz not null,
  last_checked_at timestamptz,
  paid_at timestamptz,
  admin_notified_at timestamptz,
  created_at timestamptz not null default now()
);

alter table orders enable row level security;
```

- `items` is a snapshot: `[{ productId, name, sizeMl, priceUsd, qty }]`. Later price changes never alter a placed order.
- "Expired" is not stored. It is `status = 'pending'` and `expires_at < now()`.
- `claim_token` is 24 random URL-safe characters, used only for the Telegram deep link.
- The settle step is a Postgres function so the pending to paid move is atomic:

```sql
create function settle_order(p_md5 text) returns setof orders language sql as $$
  update orders
     set status = 'paid', paid_at = now(), order_number = nextval('order_number_seq'), ip_hash = null
   where khqr_md5 = p_md5 and status = 'pending'
  returning *;
$$;
```

It returns a row only for the single caller that wins the transition. It returns `setof orders` so that losing the race is an empty result over PostgREST, not a row of nulls. Execute rights are revoked from `anon` and `authenticated`.

### 5.5 Pricing

- Subtotal is the sum of `priceUsd * qty` from live Sanity data. Prices from the browser are never trusted.
- Delivery adds `DELIVERY_FEE_USD = 2`. Pickup adds 0.
- Riel uses one fixed rate, `RIEL_PER_USD = 4000` (1 USD = 4000 KHR), held in code like the delivery fee. Riel is `round(usd * 4000 / 100) * 100`, shown beneath USD.
- Limits: at most 20 cart lines, quantity 1 to 10 per line.

## 6. Checkout and payment flow

### 6.1 Cart

A small `useCart` hook built on `useSyncExternalStore` and `localStorage`. Lines are `{ productId, sizeMl, qty }`. Display names and prices are looked up from catalog data each render. The cart drawer lists each line as "Name, 20ml", quantity, line price, and the subtotal. No size images. The cart survives reloads and returns from the banking app. It is cleared only when an order is seen as paid.

Add to cart is disabled on out-of-stock products, and the card says "Out of stock" with an icon.

### 6.2 Details form (`/checkout`)

Fields: name, Telegram number, pickup or delivery (segmented control). Delivery reveals a Google Maps link field and shows the $2.00 fee. Pickup shows the shop address from `siteSettings` and a $0 fee.

- Name: 1 to 80 characters.
- Telegram number: digits with an optional `+`, 8 to 15 digits after stripping spaces.
- Map link: must be an `https` link on `maps.app.goo.gl`, `goo.gl/maps`, or `google.com/maps`. Anything else is rejected.
- A short note under the form: "We use your name and number only to prepare your order."
- The draft form is saved to `localStorage` on every change.

### 6.3 Create the order (`POST /api/orders`)

1. Parse the body with Zod.
2. Fetch the products from Sanity with the CDN off, so availability is live. Reject if any product is missing, inactive or not available, naming the item so the customer can remove it.
3. Compute the totals from section 5.5.
4. Call khqr.dev `POST /v1/generate_qr` with `{ amount }`. Then call `generate_deeplink_by_qr` with the `qr` to get a `shortLink`. If the deep link fails, continue without it.
5. Insert the order as `pending` with `expires_at = now() + 10 minutes`.
6. Return `{ orderId }`. The client saves `saka.activeOrder = orderId` and goes to `/checkout/[orderId]`.

### 6.4 Payment screen (`/checkout/[orderId]`)

States, driven by `GET /api/orders/[id]`:

| State | Shown |
|---|---|
| loading | skeleton: QR square, amount lines, countdown bar |
| pending | QR, total in USD and Riel, a mobile button "OPEN BANKING APP" using the deep link, a countdown, a status line (aria-live polite) |
| expired | "This code has expired. Your cart is saved." with a button that creates a fresh order from the saved cart and form |
| paid | order number, a short thank you, the Telegram popup, a link to continue browsing |
| not found | "We could not find this order." with a link home |

khqr.dev exposes no scanned signal over REST, so there is no separate scanned state: the status line reads "Waiting for payment" until paid. The status route is the only place that talks to khqr.dev on behalf of a viewer. See 6.5.

Resume rules (the mobile return from a banking app):

- The order id is in the URL, so a reload or a reopened tab restores the screen.
- The page polls every 3 seconds while visible, pauses while hidden, and polls once immediately on `visibilitychange` to visible.
- If the browser discarded the tab, `saka.activeOrder` in `localStorage` lets the cart drawer and `/checkout` show a "Continue your payment" row linking back.
- The intro never runs on these routes.

### 6.5 Settling an order

One function, `settleOrder(md5)`, used by the status route, the webhook and the cron job:

1. Call `check_transaction_by_md5`. A 404 means not paid, so stop. A 200 with `data.amount` and `data.currency` means paid.
2. Confirm the currency and that `amount` equals the stored `total_usd` (within half a cent). If not, log and stop. This also protects against a short payment.
3. Call `settle_order(md5)`. If no row returns, another caller already won. Stop.
4. The winner posts the admin message (section 7.1). On success, set `admin_notified_at`.
5. If the post fails, `admin_notified_at` stays null. Any later status poll or the daily cron retries it. A rare duplicate message is accepted over a lost one.

The status route runs `settleOrder` only when the order is pending, not expired, and `last_checked_at` is older than 5 seconds (khqr.dev caches repeat checks for 5 seconds anyway). This keeps khqr.dev traffic low however many viewers poll. The status route and the cron also check pending orders after the QR has expired, within 24 hours of creation, so a payment made at minute 9 and viewed at minute 11 is still settled. The amount check still protects the shop.

### 6.6 Webhook trigger (`/api/khqr/webhook`)

The webhook only speeds things up. The signed string and retry behavior of khqr.dev are undocumented, so:

- Read the `md5` from the body. Ignore everything else in the payload.
- Look it up in `orders`. If there is no pending match, return 200 and stop. This stops the endpoint being used to make us call khqr.dev.
- Run `settleOrder(md5)`.
- If `KHQR_WEBHOOK_SECRET` is set, also verify `X-RBK-Signature` as an HMAC-SHA256 of the raw body once the exact scheme is confirmed in the khqr.dev portal. Until then log mismatches and do not reject.

Polling alone is enough for correctness. A customer who closes the tab after paying is still settled by the webhook, and by the cron as a last resort for orders that are pending, unexpired and unchecked.

### 6.7 Security and abuse

- All Supabase access is server side with the service role key. RLS blocks everything else.
- The status response contains no name, number, map link or items. It does carry the QR string and deep link (pending) and the order number and claim token (paid), which are reachable only with the unguessable order id.
- The order id is an unguessable UUID. The claim token is separate and only used in the Telegram deep link.
- All user text sent to Telegram is HTML escaped.
- `POST /api/orders` is rate limited per IP with no extra service: the route stores `ip_hash` (SHA-256 of the IP plus `CRON_SECRET`) on each new order and rejects with 429 when the same hash made 5 or more orders in the last 10 minutes. `settle_order` nulls `ip_hash` when the order is paid, and unpaid rows are deleted after 24 hours.
- Secrets live in Vercel environment variables, never in the repo.

## 7. Telegram

Plain `fetch` calls to the Bot API. No bot library.

### 7.1 Admin message (on payment)

Sent to `TELEGRAM_ADMIN_CHAT_ID` in HTML mode:

```
New order SK-1042
Paid 2026-10-18 14:32 (Phnom Penh)

Name: Sokha Chan
Telegram: +855 12 345 678
Fulfilment: Delivery
Map: https://maps.app.goo.gl/...

Items
Rosewater, 20ml x2  $60.00
Amber Pouch, 10ml x1  $18.00
Delivery  $2.00
Total  $80.00 (320,000 KHR)
```

Pickup orders show "Fulfilment: Pickup" and no map line. No exclamation marks.

### 7.2 Customer confirmation (optional)

- After payment the popup shows a button to `https://t.me/<TELEGRAM_BOT_USERNAME>?start=<claim_token>`. It appears for every paid order, new or returning customer.
- Telegram posts the `/start <claim_token>` update to `/api/telegram`. The route checks the `X-Telegram-Bot-Api-Secret-Token` header against `TELEGRAM_WEBHOOK_SECRET`.
- If the token matches a paid order, the bot replies in that chat: "Thank you, Sokha. Order SK-1042 is confirmed. Total $80.00, delivery. We will message you when it is ready." The chat id is used for the reply and not stored.
- If the order is not paid yet: "We have not received this payment yet." If the token is unknown: a plain greeting. Tapping again simply resends.

## 8. Frontend

### 8.1 Design system

- Tokens are CSS variables for color, type scale and the 8px spacing unit. Tailwind maps to them. Dark mode swaps the variables under `prefers-color-scheme`. Values come from the brand brief in `CLAUDE.md`.
- Fonts through `next/font`: Montserrat 400 and 500, Jost 400 and 500, `display: swap`, size-adjusted fallbacks.
- Corners are 2px, images 0px. No shadows except the single soft shadow on the cart drawer and the Telegram popup. No gradients except the mist.
- Icons are inline 1.5px line SVGs, 24px: menu, close, cart, plus, minus, check, arrow, and social. They are written once in one icons module.
- Run the UI-UX-Pro-Max skill before designing each section. Its suggestions are filtered through the brand brief, which always wins.

### 8.2 Motion (GSAP only)

| Use | Behavior |
|---|---|
| Intro | One timeline (section 8.4) |
| Section fade-up | 12px and opacity over 500ms, one-shot when the section enters view via IntersectionObserver. Nothing is tied to scroll position |
| Card expand | Height tween 400ms, ease-out, with `aria-expanded` |
| Cart drawer and popup | Slide or fade 300ms |
| Link underline and button invert | CSS transitions, 300ms and 250ms |

No ScrollTrigger and no other GSAP plugin, to protect the 170KB budget. All animation runs inside `useGSAP` with `gsap.matchMedia()`. With `prefers-reduced-motion`, every animation is replaced by an instant state change.

### 8.3 Header and mobile navigation

Sticky, 72px desktop and 64px mobile, #F2EBDF with a 1px #DCD0BF bottom border. Wordmark SVG left with clear space equal to the height of the S. Links on desktop with the 300ms grow-from-left underline. A 44px cart button with a count badge (text on #AD9883 as the accent badge, #171A12 text).

On mobile a 24px menu button opens a full-height #FAF6EE panel with the three links at 22px Montserrat 500 uppercase and a close button. The panel traps focus, closes on Escape or a link tap, and returns focus to the menu button.

### 8.4 Intro (home page only)

Timeline, total 3000ms, fixed overlay, #FAF6EE, above everything:

| Time | Event |
|---|---|
| 0 to 1000ms | Wordmark with PARFUM, 320px desktop and 220px mobile, #171A12. Fade in 350ms ease-out, hold 300ms, fade out 350ms ease-in |
| 1000 to 3000ms | Bottle fades in over the first 500ms and spins 360 degrees using the turntable frames, decelerating with ease-out. It settles down the last few pixels as it lands. It ends front-facing at exactly the hero image rect |
| 3000ms | Overlay removed with no visible jump. Header, headline, subheadline and buttons fade up 12px over 500ms. The mist fades in over 800ms |

Rules:

- The final frame equals the hero still (frame 0 is the front view, and a full turn returns to it). The overlay bottle is positioned from `getBoundingClientRect()` of the real hero image at runtime, so the match holds at every viewport.
- Scroll is locked and `<main>` is `inert` and `aria-hidden` while it runs.
- A "Skip" text button (Montserrat 500, 13px, #685846) appears bottom center after 300ms. Click, Escape or Enter jumps to the end state.
- An inline head script adds a class that hides the header, headline, subheadline and buttons. A visitor without JavaScript never gets the class because the script adds it, so no `noscript` style is needed. A 6 second failsafe always removes the overlay. The intro is skipped when the URL has a hash or a query string, so a shared finder link opens on its results. The hero still itself is never hidden, so it paints early and is the Largest Contentful Paint element. Verify in Lighthouse.
- Frames: 24 WebP at 720px wide, each under 25KB, preloaded during the logo phase and drawn to a 2D canvas from decoded bitmaps. They are dropped after hand-off. If the frames are not ready at 1000ms, skip the spin and crossfade to the hero still over 600ms. Any asset failure skips the intro.
- `prefers-reduced-motion`: no intro, static hero, static mist image.
- Placeholders: until the videos arrive, a script generates 24 clearly marked placeholder frames. When videos arrive, `scripts/extract-frames` (ffmpeg) cuts 24 evenly spaced frames, crops and resizes them, and writes WebP into `public/turntable/`. Replacing files needs no code change. The hero still is frame 0.

### 8.5 Hero and mist

- Full bleed, `100svh`, minimum 640px, #FAF6EE. Eyebrow PARFUM, H1 "Find the scent that feels like you.", the subheadline, the bottle (about 55svh tall, 0px radius), and two buttons: SHOP FRAGRANCES and FIND YOUR SCENT.
- The mist is an OGL canvas, absolute, covering the hero, `pointer-events: none`, `aria-hidden`, behind the text and buttons and above or below the bottle at the alpha caps below. It is lazy loaded after the intro starts.
- Fragment shader: fractal noise fog in #F2EBDF, #DCD0BF and #AD9883, drifting about 0.02 noise units per second. Alpha caps: 0.55 near the edges, 0.3 over the bottle, 0.15 behind headline and subheadline.
- Keep-out rectangles: each hero button plus 16px padding, feathered over 24px, passed as uniforms with alpha 0 inside. Recomputed by a ResizeObserver.
- Pointer: `pointermove` on the hero displaces and swirls the mist within 160px (120px on touch), easing with a 0.08 lerp per frame. After leaving or lifting it relaxes over about 2 seconds. The hero has `touch-action: pan-y`. `preventDefault` is never called.
- Budget: half resolution, device pixel ratio capped at 1.5, 60fps desktop and 30fps mobile, paused off screen (IntersectionObserver) and in hidden tabs. If frame time exceeds 33ms for 2 seconds on mobile, fall back to the static image.
- No WebGL2, shader error, or reduced motion: show `mist-static.webp` at 40 percent opacity with no interaction and no message. The static image is a captured frame of the shader, produced by a script.

### 8.6 Product card

One component used on home, `/products` and in the finder.

- Surface #F2EBDF, 1px #DCD0BF border, 2px radius, 24px padding. Square product image at 0px radius. Name in H3 style. Sizes and prices on one line: "10ml $18 · 20ml $30 · 50ml $65", with Riel beneath. Availability line: "Available" with a check icon, or "Out of stock" in #A3392B with an icon. Text always accompanies color.
- Hover (fine pointer only): image scales to 1.03 over 400ms ease-out, the border becomes #8C7964, and a second image crossfades over 400ms if present.
- The whole header of the card is a real button with `aria-expanded` and `aria-controls`, and a 1.5px plus or minus icon in #8C7964. Click, tap, Enter or Space toggles. One card open at a time per grid. Escape closes it and returns focus to the button.
- The expanded panel shows scent notes in three labeled rows (Top, Heart, Base), the description, the scent family labels, a size segmented control (10ml, 20ml, 50ml, selected filled #171A12), a quantity stepper and ADD TO CART. The button is disabled with an explanation when the product is out of stock.
- The grid uses `align-items: start` so an open card does not stretch its neighbors.
- Image failure shows a #F2EBDF block with the product name. Cards stay usable.

### 8.7 Home sections

1. **Hero** (8.5).
2. **In store now** (`#collection`): eyebrow IN STORE NOW, H2 "On our shelves today", helper line "Stock as of [date]. Visit us to try any scent." in #685846. 3 preview cards on desktop and 6 on mobile, then a "VIEW PRODUCTS" text link with a line arrow.
3. **Scent finder** (`#finder`, #F2EBDF): eyebrow SCENT FINDER, H2 "Tell us how you want to feel".
4. **Visit us** (`#visit`): H2 "Visit the shop", address, hours, phone and a GET DIRECTIONS link to Google Maps in a new tab, from `siteSettings`. No embedded map.
5. **Footer** (#F2EBDF, 1px top border): wordmark, "Fragrance from Cambodia.", contact line, social links as line icons, copyright.

Section padding is 56px mobile and 96px desktop. Content width is 1200px and text blocks 62ch.

### 8.8 `/products`

Eyebrow and H2, then the full grid of active products ordered by `displayOrder` then name, 3 columns from 1024px and 2 below, 24px gap. First row is eager and the rest lazy. Empty state: "Our shelves are being restocked. Visit us or message us for what is new." with a link to Visit us. Error state: "We could not load our shelf just now. Please try again in a moment." with a TRY AGAIN button. The last cached page is served first if the fetch fails.

### 8.9 Scent finder

- Three chip groups, each a row of buttons with `aria-pressed`: Vibe (Calm, Fresh, Warm, Bold, Romantic, Earthy), Occasion (Everyday, Work, Evening, Date night, Ceremony, Gift), Scent family (Floral, Woody, Citrus, Amber, Fresh and aquatic, Musk).
- Chips: outlined, 2px radius, 1px #DCD0BF border, selected filled #171A12 with #FAF6EE text, focus ring 2px #8C7964.
- OR within a group, AND across groups. An empty group applies no filter. Results update on every toggle. Sort: available first, then number of matched tags, then `displayOrder`.
- Count line "4 scents match" or "1 scent matches" in an `aria-live="polite"` region. CLEAR ALL resets everything. The selection is mirrored to the URL query string so a result can be shared.
- Initial state: "Choose what feels right. We will show what is in store." and no grid.
- No match: "Nothing matches all of that. Try removing one choice." followed by "Close matches", the products matching the most groups.
- The finder reads the full catalog passed from the server. It makes no extra fetch. If the catalog failed to load, the shelf error message from section 8.8 shows and the chips are disabled.

### 8.10 Cart drawer, checkout and popup

- The cart drawer slides from the right, #FAF6EE, with the soft shadow. It is a dialog with a focus trap, closes on Escape, and returns focus to the cart button. It shows the lines, the subtotal, CHECKOUT, and the "Continue your payment" row when an active order exists. An empty cart says "Your cart is empty. See what is in store." with a link to `/products`.
- `/checkout`: the details form and an order summary side by side on desktop, stacked on mobile.
- The Telegram popup is a modal dialog that appears on the paid state: "Your order is paid. Get your confirmation on Telegram." with a primary button OPEN TELEGRAM and a text link "No thanks". It is user triggered by payment, so it does not break the no-popup-on-first-load rule. Focus is trapped and Escape closes it.

### 8.11 Skeleton inventory

Every loading state uses a skeleton matching its final layout, with no shimmer under reduced motion:

- Product card skeleton: 3 or 6 on home, 6 on desktop and 4 on mobile for `/products` via `loading.tsx`.
- Image placeholder: a #F2EBDF block with fixed aspect ratio and the Sanity low quality placeholder.
- Cart drawer and cart count: skeleton until `localStorage` hydrates, so no count flicker.
- `/checkout` summary: skeleton lines until the cart hydrates.
- Payment screen: QR square, amount lines and a countdown bar.
- No spinners anywhere.

### 8.12 Copy rules

No exclamation marks, no em dashes, no all caps outside headings and buttons. Sentences of 12 words or fewer where possible. Scent is described with notes and moments, not hype.

## 9. Accessibility

WCAG 2.2 AA. A skip to content link is first. Landmarks: header, nav, main, footer. One H1, then H2, then H3. A visible 2px #8C7964 focus outline with a 2px offset on every control. Minimum touch target 44px. Chips use `aria-pressed`. Card buttons use `aria-expanded` and `aria-controls`. The result count and payment status use `aria-live="polite"`. The mist canvas, intro overlay and decorative icons are `aria-hidden`. Every image has alt text. Stock status is always text plus icon. Dialogs trap focus and restore it on close. axe-core must report zero serious or critical issues.

## 10. Performance and SEO

- Mobile Lighthouse: Performance, Best Practices at 90 or higher, Accessibility and SEO at 95 or higher. LCP under 2.5s, CLS under 0.1, INP under 200ms.
- Initial JavaScript under 170KB gzipped, excluding the lazy mist chunk and the checkout routes. GSAP core only. No state library. A tiny QR encoder loads only on the payment screen.
- Images through `next/image` with AVIF and WebP, explicit sizes, the hero still on priority. Product images are 1200px square sources served at 400 to 800px.
- Title "SAKA Parfum | Fragrance shop in Cambodia". Description under 160 characters. Open Graph and Twitter tags with a 1200 by 630 image on cream. JSON-LD `LocalBusiness` and a `Product` list without offers. Canonical URL, `sitemap.xml`, `robots.txt`. `/checkout` and `/api` are disallowed.
- Catalog pages use ISR. A Sanity webhook calls `/api/revalidate` for on-demand updates, with a 60 second fallback revalidate. Checkout always checks live Sanity data, so a stale page cannot oversell past the flag.

## 11. Code structure

```
src/
  app/                  routes, route handlers, loading.tsx files
  components/           ProductCard, Finder, CartDrawer, Hero, Intro, Mist, PaymentScreen, Icons
  lib/
    taxonomy.ts         enums and labels shared with Sanity
    sanity.ts           client, queries, Zod schemas
    pricing.ts          totals, Riel rounding, delivery fee
    orders.ts           create, settleOrder, retry unsent
    khqr.ts             generate_qr, deeplink, check by md5
    telegram.ts         send message, escape, format admin and confirmation text
    supabase.ts         server client
    cart.ts             useCart
sanity/                 schema and config, deployed to hosted Studio
scripts/                extract-frames, placeholder frames, mist-static capture
supabase/migrations/    orders table, sequence, settle_order
tests/                  unit and Playwright specs
```

Dependencies: next, react, typescript, tailwindcss, gsap, @gsap/react, ogl, zod, a Sanity client and image URL helper, @supabase/supabase-js, a tiny QR encoder. Dev: vitest, @playwright/test, @axe-core/playwright. No state library, no form library, no UI kit, no animation library besides GSAP.

## 12. Testing and verification

- **Unit (Vitest):** pricing and Riel rounding, finder filtering and sorting, Zod schemas, admin and confirmation message formatting with escaping, `settleOrder` with a mocked khqr.dev and Supabase (paid, unpaid, wrong amount, double call).
- **End to end (Playwright):** `KHQR_API_BASE`, `TELEGRAM_API_BASE` and a Sanity API host point to one local mock server, so tests never touch khqr.dev, Telegram or Sanity. Orders use a real Postgres: local Supabase (Docker) or a dedicated test project, never the production database. Flows: browse, add to cart, checkout as pickup and delivery, pay, resume after a reload mid payment, expired code, out of stock blocked, the Telegram start confirmation.
- **Acceptance:** intro timing and skip, reduced motion, no content flash with JavaScript disabled, mist keep-out at several widths, 3 and 2 column grids, keyboard-only pass, no off-palette colors, no exclamation marks or em dashes in the repo (a grep check).
- **Quality gates:** axe-core on every route, Lighthouse mobile on `/` and `/products`. Real numbers are reported before any claim of completion.
- **Manual before launch:** one real KHQR payment of the smallest amount, with the admin message and Telegram confirmation checked on a phone.

## 13. Environment and operations

Variables: `NEXT_PUBLIC_SITE_URL`, `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SANITY_REVALIDATE_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `KHQR_TOKEN`, `KHQR_WEBHOOK_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_ADMIN_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`, `CRON_SECRET`. Test only: `KHQR_API_BASE`, `TELEGRAM_API_BASE`.

- Deploy on Vercel. Register the Telegram webhook with `setWebhook` and the secret token. Register the khqr.dev webhook URL in the portal.
- Supabase Hobby pauses after a week of no activity. `/api/cron/daily` (Vercel Cron, once a day, protected by `CRON_SECRET`) runs a trivial query, retries paid orders with no `admin_notified_at`, settles pending unexpired orders that were never checked, deletes unpaid rows older than 24 hours, and clears customer fields on paid rows older than 90 days.
- Setup steps for Sanity, Supabase, BotFather, the admin group and the khqr.dev store go in `README.md` during the build.

## 14. Build order

1. **Foundation, catalog and cart.** Project, tokens, fonts, logo SVG, header, footer, Sanity schema with sample products, product card, cart store and drawer, `/products`, home preview with static hero, Visit us, 404, skeletons.
2. **Checkout and payment.** Checkout form, Supabase migration, orders API, payment screen, settle, webhook, Telegram admin message, popup and bot confirmation, cron.
3. **Finder, SEO and quality.** Scent finder, JSON-LD, sitemap, accessibility and Lighthouse passes, dark mode.
4. **Intro, hero and mist.** Turntable placeholders, the intro timeline, the OGL mist, fallbacks, performance tuning. This pass is last because it carries the most performance risk.

Each pass ends with tests passing and a review before the next starts.

## 15. Risks

- **Mist versus performance and smoke clichés.** Mitigated by the palette-only rule, alpha caps, the 30fps fallback and the static image.
- **Intro versus LCP.** The hero still stays painted under the overlay. Must be verified in Lighthouse in pass 4.
- **khqr.dev unknowns.** The webhook signing scheme, retry policy and rate limits are undocumented. Polling plus server re-verification makes the system correct without them.
- **Supabase Hobby pausing and limits.** Covered by the daily cron. A paid plan is the fallback if traffic grows.
- **Placeholders.** The turntable and hero look is only final once the real videos arrive and frames are cut. Dark mode for the hero waits for cutouts.
- **Customer data.** Names, numbers and map links are personal data. They are collected only for the order, shown to admins, and cleared after 90 days.
