# SAKA Parfum Implementation Plans: Index

Specs: `docs/superpowers/specs/2026-10-18-saka-parfum-design.md` (original) and `docs/superpowers/specs/2026-10-18-saka-redesign-design.md` (redesign, wins any conflict). Project rules: `CLAUDE.md` (it wins any conflict with both).

Each pass is its own plan, produces working and tested software, and ends with a review before the next starts. Run them in this order:

| Order | Plan | Status | Delivers |
|---|---|---|---|
| 1 | `2026-10-18-saka-parfum-01-foundation-catalog.md` | Done | Repo and tooling, tokens, fonts, logo, header, footer, catalog, cards, cart, `/products`, home, Visit us, 404, skeletons, e2e and axe baseline |
| 2 | `2026-10-18-saka-parfum-02-checkout-payment.md` | Code done, live services pending | Supabase orders, checkout, KHQR payment with resume, settle path, webhook, Telegram messages, daily cron |
| 3 | `2026-10-18-saka-parfum-05-r1-data-admin.md` | Done | Sanity removed, Supabase catalog (20 fixed perfumes, one price per size), USD only, one-password admin for names, availability, prices and transactions, mock PostgREST and `npm run dev:mock` |
| 4 | `2026-10-18-saka-parfum-06-r2-storefront.md` | Done | Light by default with a header theme switch, 8px cards with a floating spinning bottle and the name only, product modal with shareable `?scent=` URL, sizes, prices and the out-of-stock pill, family-grouped `/products`, sprite pipeline |
| 5 | `2026-10-18-saka-parfum-03-finder-seo-quality.md` | Next | Scent finder, SEO and JSON-LD, keyboard and accessibility pass, bundle budget and Lighthouse gates (read its "Redesign revision" section first) |
| 6 | `2026-10-18-saka-parfum-07-r3-intro-hero-mist.md` | | AI-generated floor backdrops (user approves), floor scene hero, low theme-aware mist, intro that spins the bottle and glides it onto the floor, final performance and launch checks |
| | `2026-10-18-saka-parfum-04-intro-hero-mist.md` | Superseded | Kept only because R3 reuses its Task 2 (mist shader, math, harness, cap test) and the `Mist.tsx` code in its Task 3 Step 2 |

## Decisions made while planning

- Delivery fee $2.00 is a constant in code. No exchange rate anywhere (USD only since the redesign).
- Rate limiting needs no extra service: an `ip_hash` column on `orders`, and an `admin_login_attempts` table for the admin login.
- khqr.dev was checked against its live OpenAPI document: Bearer auth, paid means HTTP 200 with `data.amount`, unpaid is 404, no scanned signal, repeat checks cached for 5 seconds.
- The intro is skipped for URLs with a hash or query, so shared finder and product links open straight on their content.
- The catalog's single source is `supabase/seed/catalog.json`. The seed migration is generated from it, and the e2e and local mocks load it, so they cannot drift.
- All bottles (hero and perfumes) use one format: a transparent `still.webp` plus a 36-frame `spin.webp` sprite.

## Things only the user can provide

- A Supabase project (Hobby, Singapore). Apply the orders, catalog and catalog seed migrations.
- `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` (32 or more random characters) in Vercel.
- A Telegram bot from BotFather, the admin group id, and the khqr.dev store token.
- Real prices for 10ml, 20ml and 50ml (entered in admin) and the shop address, hours, phone, map link and social links (edited in `src/lib/store.ts`).
- Turntable videos for the hero bottle and each perfume, filmed on a plain backdrop.
- Approval of the two generated floor backdrops (R3 Task 1).
- The final domain, verified in the khqr.dev portal.
