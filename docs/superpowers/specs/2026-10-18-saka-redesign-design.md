# SAKA Parfum Redesign: Design Spec

Date: 2026-10-18. Status: approved in brainstorming, awaiting review of this written version.

This spec changes the original design spec (`2026-10-18-saka-parfum-design.md`). Where the two disagree, this one wins. `CLAUDE.md` is updated to match it.

## 1. What changes and why

The owner wants a calmer, more product-led storefront and a simpler back office:

- Sanity is removed. The catalog lives in Supabase next to the orders, and a one-password admin page replaces Sanity Studio.
- Each product opens in a modal where the bottle floats and spins. Cards are reduced to the bottle and the name.
- Sizes, stock and prices appear only inside the modal. Riel is removed everywhere.
- After the intro, the bottle lands on a floor scene, like the reference image the owner supplied but with much less text.
- The site always starts in light mode, with a theme switch in the header.
- Every animation eases into the next. Nothing snaps.

## 2. Decisions (old to new)

| Topic | Before | Now |
|---|---|---|
| Catalog source | Sanity, edited in Studio | Supabase `products` and `size_prices` tables, edited in `/admin` |
| Adding perfumes | Staff add documents in Studio | Not possible. The 20 perfumes are fixed and seeded by migration |
| Pricing | Price per perfume per size | One price per size, shared by every perfume (10ml, 20ml, 50ml) |
| Currency | USD with Riel shown for information | USD only, everywhere, including Telegram messages |
| Store details | Sanity `siteSettings` | Constants in `src/lib/store.ts` |
| Product detail | Expandable card | Modal with a shareable URL (`?scent=<slug>`) |
| Card content | Image, name, all sizes and prices, Riel, stock label, toggle | Bottle and full name only |
| Stock display | Icon and colored text on the card and in the panel | One "Out of stock" pill in the modal only. No icon, no warning line |
| Radius | 2px everywhere, nothing above 4px | 8px on cards, modal, drawer and admin panels. 4px on buttons, inputs and the size selector. The out-of-stock pill is fully rounded |
| Theme | Follows `prefers-color-scheme` | Always light on first visit. Header switch toggles dark and is remembered per device |
| Hero | Centered headline, subheadline, bottle and button on cream | Floor scene. Headline and one VIEW PRODUCTS button on the left, bottle standing on the floor |
| Dark hero | Stays cream | Its own dark floor scene with the dark mist palette |
| Spin frames | 24 separate frames for the hero only | 36 frames packed in one sprite per bottle, for the hero and every perfume |
| /products layout | One grid | Grouped under the four families |

Unchanged: the checkout flow, KHQR through khqr.dev, Telegram admin message and optional customer confirmation, Supabase orders, the daily cron, the scent finder on home only, skeleton loaders, GSAP only, the brand palette and fonts, WCAG 2.2 AA, and the performance targets.

## 3. Data model

All tables have RLS on with no policies. Only the server reads them, using the service role key.

**`products`**

| Column | Type | Notes |
|---|---|---|
| `slug` | text, primary key | `^[a-z0-9-]+$`, used in URLs, cart lines and image folders |
| `name` | text, 1 to 80 chars | Full display name, for example "Tom Ford Oud Wood". Editable in admin |
| `family` | text | `fresh`, `woody`, `oriental` or `aromatic` |
| `description` | text | One or two short sentences |
| `notes_top`, `notes_heart`, `notes_base` | text[] | |
| `mood`, `occasion` | text | Shown in the modal as written |
| `vibes`, `occasions` | text[] | Fixed tags for the scent finder |
| `available` | boolean | Editable in admin |
| `sort` | integer | Shelf order |
| `updated_at` | timestamptz | Set on every admin save |

**`size_prices`**: `size_ml` (10, 20 or 50, primary key) and `price_usd` (numeric 8,2, above 0 and below 1000). Editable in admin.

**`admin_login_attempts`**: `id`, `ip_hash`, `created_at`. Failed logins only. Rows older than one day are deleted by the daily cron.

The canonical seed is `supabase/seed/catalog.json`. A script turns it into the seed migration, and the e2e mock and local mock read the same file, so the data cannot drift.

Cart lines stay `{ productId, sizeMl, qty }`, with `productId` now the slug. The line price is always `size_prices[sizeMl]`, read live at checkout.

Placeholder prices until the owner sends real ones: 10ml $12, 20ml $22, 50ml $48. Staff change them in admin, so no code change is needed.

## 4. Catalog content

Taxonomy for the finder:

- Families: Fresh, Woody, Oriental, Aromatic.
- Vibes: calm, fresh, warm, bold, romantic, earthy.
- Occasions: everyday, work, evening, date night, ceremony. ("Gift" is dropped because no perfume uses it, and an empty chip is a dead end.)

Descriptions are lightly edited to the brand voice: the same meaning in calmer words, notes and moments, no hype. Notes, moods and occasions are kept as written. Two fixes: "Crisp, modern, and crisp" becomes "Crisp, modern, and clean", and Oud Wood's combined "Top/Heart" notes are split into top (cardamom, Sichuan pepper) and heart (rare oud wood).

| # | Slug | Name | Family | Description (edited) | Vibes | Occasions |
|---|---|---|---|---|---|---|
| 1 | acqua-di-gio-profondo | Giorgio Armani Acqua di Giò Profondo | fresh | A deep marine scent, cool and clear like open water. | fresh, calm | everyday, work |
| 2 | allure-homme-sport | Chanel Allure Homme Sport | fresh | Bright mandarin and sea air over a soft, warm musk. | fresh, bold | everyday |
| 3 | cool-water | Davidoff Cool Water | fresh | The classic aquatic. Mint and seawater, crisp as a cold wave. | fresh, calm | everyday |
| 4 | bleu-de-chanel-edp | Bleu de Chanel Eau de Parfum | woody | Woody and aromatic, settling into amber and incense. | bold, warm | work, evening, date_night |
| 5 | terre-d-hermes | Hermès Terre d'Hermès | woody | Earthy and mineral, like warm stone between sky and soil. | earthy, calm | work |
| 6 | aventus | Creed Aventus | woody | Juicy pineapple over smoky birch and soft musk. | bold | ceremony, work, evening |
| 7 | oud-wood | Tom Ford Oud Wood | woody | Smoky oud and warm spice, rare and quiet. | warm, bold | evening |
| 8 | green-irish-tweed | Creed Green Irish Tweed | woody | Lush and green, like cut grass and cool country air. | fresh, calm | everyday, ceremony |
| 9 | l-eau-d-issey-pour-homme | Issey Miyake L'Eau d'Issey Pour Homme | woody | Sharp yuzu and lemon over warm spice and woods. | fresh | everyday |
| 10 | boss-bottled-edt | Hugo Boss Bottled Eau de Toilette | woody | Crisp apple and cinnamon over smooth, warm woods. | warm, calm | work, everyday, date_night |
| 11 | montblanc-explorer | Montblanc Explorer | woody | Bergamot and vetiver with refined patchouli, made for travel. | earthy, fresh | everyday, work |
| 12 | layton | Parfums de Marly Layton | oriental | Sweet apple and vanilla, rich with spice and fine woods. | romantic, warm | evening, date_night |
| 13 | spicebomb-extreme | Viktor&Rolf Spicebomb Extreme | oriental | Warm tobacco and vanilla, deep with black pepper and spice. | bold, warm | evening |
| 14 | ombre-leather | Tom Ford Ombré Leather | oriental | Soft black leather and amber, like suede in the desert. | bold, earthy | evening |
| 15 | stronger-with-you-intensely | Giorgio Armani Emporio Armani Stronger With You Intensely | oriental | Sweet toffee and warm vanilla, close and comforting. | romantic, warm | date_night, evening |
| 16 | le-male | Jean Paul Gaultier Le Male | oriental | Fresh mint over sweet, powdery vanilla. A comforting classic. | warm, bold | evening |
| 17 | jazz-club | Maison Margiela REPLICA Jazz Club | oriental | Aged rum, pipe tobacco and vanilla, like a quiet bar at night. | calm, romantic | evening, date_night |
| 18 | sauvage-edt | Dior Sauvage Eau de Toilette | aromatic | Fresh and raw, with Calabrian bergamot and ambroxan. | fresh, bold | everyday, evening |
| 19 | y-edp | Yves Saint Laurent Y Eau de Parfum | aromatic | Crisp green apple over sage and warm amberwood. | fresh, bold | evening, everyday |
| 20 | azzaro-wanted | Azzaro Wanted | aromatic | Lemon and ginger, bright and lively over warm amberwood. | bold, fresh | everyday, evening |

The full notes, moods and occasion texts are in `supabase/seed/catalog.json` (plan R1, Task 1), copied from the owner's list.

## 5. Admin

- Route `/admin`, `noindex`, disallowed in `robots.txt`.
- **Login** at `/admin/login`: one password field checked against `ADMIN_PASSWORD` with a constant-time compare. Success sets `saka_admin`, a signed token (`<expiry>.<HMAC-SHA256>` keyed by `ADMIN_SESSION_SECRET`): httpOnly, Secure in production, SameSite=Strict, path `/admin`, 12 hours. Five failed attempts from one hashed IP within 15 minutes block further attempts for that window. Every admin page and server action verifies the session on the server.
- **Products and prices** at `/admin`:
  - Three price fields (10ml, 20ml, 50ml) with one Save button.
  - The 20 perfumes, each with an editable name, an Available or Out of stock switch (labelled with text), and a Save button that shows "Saved".
  - Every save calls `revalidatePath("/", "layout")`, so the storefront updates on the next visit.
- **Transactions** at `/admin/transactions`:
  - Paid orders totals for today and this month, in Phnom Penh time.
  - Paid orders, newest first, 50 per page: order number, paid time, name, Telegram, pickup or delivery with the map link, items as "Name, 20ml x2", and total.
  - Orders past the 90-day scrub show "Details removed".
- **Log out** clears the cookie.
- Admin uses the same tokens and fonts. Loading states are skeletons.

## 6. Storefront

### 6.1 Tokens and theme

- Colors are unchanged. The dark palette now applies under `html[data-theme="dark"]` instead of the media query.
- A small inline head script sets `data-theme="dark"` before first paint only when `localStorage["saka.theme"]` is `"dark"`. Everyone else gets light.
- **ThemeToggle**: a 44px icon button in the header, always visible on every breakpoint, between the nav and the cart.
  - The label stays "Dark mode" and `aria-pressed` reflects the state.
  - It shows a moon icon in light mode and a sun in dark.
  - Switching fades colors over 500ms. Under reduced motion the switch is instant.
- **Radius tokens**: `--radius-card: 8px` (Tailwind `rounded-card`) and `--radius-sm: 4px` (`rounded-sm`, buttons and inputs).
- **Contact shadow** under bottles: a blurred ellipse in `--contact` (light `rgba(23,26,18,0.18)`, dark `rgba(23,26,18,0.6)`). It is part of the product imagery, not a UI shadow.

### 6.2 Motion language

Shared constants in `src/lib/gsap.ts`:

- `MOTION.enter`: 0.7s `power3.out`.
- `MOTION.exit`: 0.5s `power2.inOut`.
- `MOTION.glide`: 0.8s `power3.inOut`, for movement between two places.

Rules:

- No `back`, `elastic` or `bounce` eases.
- Nothing visible runs under 300ms except press feedback.
- Timelines overlap so the next element starts while the previous one settles.
- Steady rotation (the spin) uses `power2.inOut` per full turn, so each turn starts and ends gently.
- The dialog backdrop fades with a CSS transition, because the native `::backdrop` cannot be reached by GSAP. This is the only non-GSAP motion besides the existing CSS hover transitions.

### 6.3 SpinBottle (shared by cards, modal, hero and intro)

- **Layers:**
  - The still (`<dir>/still.webp`, a transparent cutout, frame 0, 960 by 1200) rendered with `next/image`.
  - A sprite layer (`<dir>/spin.webp`, 36 frames of 480 by 600 in a 6 by 6 grid) stacked on top and hidden until a spin runs.
  - The contact shadow.
- **Spin:** loads the sprite on first request (cached per URL), then tweens the frame index 0 to 36 over the given duration and ends on frame 0. The sprite layer then fades out to reveal the crisper still.
- **Float:** optional. The bottle moves 4px up and down on a sine yoyo, with a period of 3.2 to 4s and a random phase per bottle. The shadow narrows and lightens as the bottle rises. The float pauses while off screen (IntersectionObserver).
- **Reduced motion:** no float and no spin. The still only.

### 6.4 Product card

- A link to `/products?scent=<slug>`. A plain click opens the modal in place with `history.pushState` on the current path, keeping other query params. A modifier-key or middle click opens the link normally.
- `rounded-card`, surface background, 1px border that warms to the secondary color over 500ms on hover, padding 16px on mobile and 24px on desktop.
- A 4:5 bottle stage with SpinBottle (float on), then the full name in `.card-title` (Montserrat 500, uppercase, 13px mobile, 15px desktop, 0.08em tracking, line height 1.4, balanced, never truncated). The card title is smaller than h3 on purpose: full designer names are long.
- **Hover on desktop** (`(hover: hover)`, mouse only): one full turn over 2s. Ignored while a turn is running.

### 6.5 Product modal

- Open when `?scent=` matches a product slug. Unknown slugs are ignored.
- **Desktop:** centered, `min(960px, 100vw - 4rem)` wide, `rounded-card`, two columns.
  - Left: bottle stage on the surface color, 4:5.
  - Right, top to bottom:
    - family eyebrow
    - name (h2 style, balanced)
    - the out-of-stock pill when unavailable
    - description
    - notes as Top, Heart and Base rows
    - mood and occasion rows
    - size selector: three 4px outlined segments, each "10ml" with "$12" under it, selected filled `--btn`
    - quantity
    - "Add to cart, $24.00", the selected size price times quantity
    - a status line ("Added to cart." for 1.6s, or the cart-full message)
- **Mobile:** a bottom sheet, full width, `rounded-t-card`, up to 92dvh. Bottle stage on top (38svh), details scroll below.
- Close button top right (44px, label "Close"). Escape, backdrop click and Back all close it.
  - When this tab opened the modal with `pushState`, close calls `history.back()`.
  - Otherwise close replaces the URL without `scent`.
- **Open sequence:**
  - The dialog fades and rises 24px (`MOTION.enter`).
  - The stage bottle glides from the card bottle's rect to its place (`MOTION.glide`). The card bottle hides during the glide.
  - Details fade up 12px with a 0.06s stagger.
  - After the glide, the bottle turns once (2.2s), then turns again every 6s while open, floating throughout.
- **Close sequence:** the dialog fades (`MOTION.exit`) while the stage bottle drifts back toward the card. The card bottle fades back in as it ends.
  - If no card is on the page (a shared link), the bottle simply fades with the dialog.
- **Out of stock:**
  - The pill reads "Out of stock", in `--ink` on `--badge`, 11px Montserrat 500 uppercase, fully rounded.
  - Add to cart is disabled and `aria-describedby` points at the pill.
  - Sizes and prices stay visible.
  - Nothing else signals the state: no icon, no red, no extra line.
- **Focus:** moves to the close button on open and returns to the card that opened the modal.

### 6.6 Pages

- **Home:**
  - The hero (section 7).
  - Preview cards: eyebrow "In store now", h2 "On our shelves today", 6 cards picked round-robin across families in shelf order (3 visible on desktop), then **View products →**.
  - The scent finder (plan 03), with results opening the modal.
  - Visit us.
- **/products:** eyebrow, h1 "Everything on our shelves", then one section per family in the order Fresh, Woody, Oriental, Aromatic. Each section has an h2 and a 2-column (mobile) or 3-column (desktop) grid.
- **Header:** logo, Products, Visit us, ThemeToggle, cart, and the mobile menu button.
- **Cart drawer and checkout:** USD only. Lines read "Name, 20ml". Delivery reads "Delivery, $2.00".
- **Loading skeletons:** cards (rounded-card, 4:5 block and one title line), grouped products page, and admin lists.

## 7. Hero and intro

### 7.1 Scene

- **Backdrops:** `public/hero/floor-light.webp` and `floor-dark.webp`, generated with AI, graded into the palette, 2400 by 1600 WebP, each under 200KB. The owner reviews both before they ship.
  - Light: a soft cream plaster wall meeting a warm taupe stone floor, gentle side daylight, a few smooth pebbles in palette tones, shallow depth of field, a plain left half for text.
  - Dark: the same composition in dark olive and umber.
- **Rendering:** both are `next/image` with `fill`. The light one has `priority`. The dark one fades in over 500ms when the theme is dark. The bottle is not part of the backdrop.
- **Desktop layout:**
  - Left column, vertically centered: h1 "Find the scent that feels like you." and the **VIEW PRODUCTS →** primary button.
  - Right of center: the hero bottle (SpinBottle `dir="/hero"`) standing on the floor, about 58% of the hero height, with its contact shadow.
  - No subheadline, no feature card, no dots.
- **Mobile layout:** headline at the top left, bottle centered on the floor, button at the bottom left.
- **Mist:** low over the floor only. The original mist rules apply, with a CSS mask that fades it out above roughly 65% of the hero height. Colors follow the theme: light #F2EBDF, #DCD0BF, #AD9883, dark #23261C, #3A3A2C, #8C7964. The single button is the keep-out box.

### 7.2 Intro timeline

Runs on a plain hard load of `/` (no hash, no query, no reduced motion). The overlay uses the page background token.

| Time | What happens |
|---|---|
| 0 to 1.0s | The wordmark fades in (0.35s), holds, and fades out |
| 1.0 to 3.0s | The overlay bottle, the same size as the hero bottle and centered in the viewport, fades in over 0.5s and makes one full turn, slowing to front-facing |
| 3.0 to 4.2s | The bottle glides to the hero bottle's rect (`MOTION.glide`, 1.2s). The overlay background fades out over 1.0s, revealing the floor scene beneath. The contact shadow grows in over the last 0.6s |
| from 3.8s | Headline then button fade up 12px (0.15s stagger), then the header |
| 4.2s | The overlay is removed. The real hero bottle sits exactly under it, so nothing jumps. `saka:intro-end` fires and the mist breathes in over 0.8s |

- **Skip:** the Skip button, Escape or Enter jumps to the end state.
- **Fallbacks:**
  - If the sprite is not ready at 1.0s, the bottle fades in and glides without a turn.
  - If the still or sprite fails, the intro ends at once.
  - A 7 second failsafe in the head script always removes the overlay.
- **Locks:** scroll is locked and the page is inert while it runs.

## 8. Media pipeline

`scripts/frames.ts` (`npm run frames -- <mode>`):

- `placeholders`: writes a hatched, clearly marked placeholder still and sprite with a transparent background for the hero and every perfume in `supabase/seed/catalog.json`.
- `video <file> <outDir> [--key 0x00FF00] [--similarity 0.18]`: ffprobe reads the duration, then ffmpeg cuts 36 evenly spaced frames with a `colorkey` filter. sharp writes `still.webp` (frame 0 at 960 by 1200) and `spin.webp` (6 by 6 grid of 480 by 600).

Filming guidance for the owner: one slow, steady, full turn on a turntable. A plain, evenly lit backdrop in a color far from the bottle (green or blue works because it is keyed out and never shown). Fixed camera, bottle centered, frame 0 front-facing.

Placeholders ship for the hero and all 20 perfumes until videos arrive.

## 9. Testing and acceptance

- **Unit tests:**
  - catalog row parsing
  - size-price totals
  - session sign and verify (valid, expired, tampered, wrong secret)
  - password check
  - Phnom Penh day and month start
  - round-robin preview picks
  - seed SQL generation
  - order creation with shared prices
  - Telegram messages without Riel
- **End-to-end tests** run against the mock server, which now also answers the PostgREST calls for `products`, `size_prices`, `admin_login_attempts` and an empty `orders`. They cover:
  - card opens modal, URL updates, Back closes
  - a shared link opens the modal
  - the out-of-stock pill with the button disabled
  - adding to cart from the modal
  - /products grouping
  - theme default, toggle, persistence with no flash
  - admin login, lockout after five failures, name, availability and price edits reaching the storefront and checkout total
  - the transactions empty state
  - the intro and mist suites
  - axe on the modal, admin pages, both themes and checkout
- Checkout payment specs still need a real Supabase test project in `.env.test`.
- No Riel string anywhere: a unit test greps `src` for "KHR" and "Riel".

## 10. Build order

1. **R1, data and admin** (`2026-10-18-saka-parfum-05-r1-data-admin.md`)
2. **R2, storefront** (`2026-10-18-saka-parfum-06-r2-storefront.md`)
3. **Plan 03, finder, SEO and quality,** revised for the new data (its dark-mode task is replaced by R2)
4. **R3, intro, hero scene and mist** (`2026-10-18-saka-parfum-07-r3-intro-hero-mist.md`). Plan 04 is superseded except for its mist shader task, which R3 reuses.

## 11. Still needed from the owner

- Real prices for 10ml, 20ml and 50ml (entered in admin after launch, no code change).
- Store address, hours, phone, Google Maps link and social links (edited in `src/lib/store.ts`).
- Spin videos for the hero bottle and each perfume.
- A Supabase project (Hobby, Singapore), then `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` set in Vercel.
- Approval of the two generated floor backdrops.
