# SAKA Parfum Implementation Plans: Index

Spec: `docs/superpowers/specs/2026-10-18-saka-parfum-design.md`. Project rules: `CLAUDE.md` (it wins any conflict).

The spec builds in four passes. Each pass is its own plan, produces working and tested software, and ends with a review before the next starts. Run them in order.

| Pass | Plan | Delivers |
|---|---|---|
| 1 | `2026-10-18-saka-parfum-01-foundation-catalog.md` | Repo and tooling, tokens, fonts, hand-built logo, header, footer, Sanity catalog, product cards, cart, `/products`, home with static hero, Visit us, 404, skeletons, e2e and axe baseline |
| 2 | `2026-10-18-saka-parfum-02-checkout-payment.md` | Supabase orders, checkout form, KHQR payment screen with resume, single settle path, webhook, Telegram admin message and optional customer confirmation, daily cron, mocks and e2e flows |
| 3 | `2026-10-18-saka-parfum-03-finder-seo-quality.md` | Scent finder, SEO and JSON-LD, dark mode with a cream hero, keyboard and accessibility pass, bundle budget and Lighthouse gates |
| 4 | `2026-10-18-saka-parfum-04-intro-hero-mist.md` | Turntable extraction script, 3 second intro, OGL mist with caps and keep-out, all fallbacks, performance tuning, launch checks |

## Decisions made while planning

- Exchange rate is fixed at 1 USD = 4000 KHR in code (`RIEL_PER_USD`). No rate field in Sanity.
- The cart ships in pass 1, because the header and the product card both need it. Pass 2 starts at checkout.
- khqr.dev was checked against its live OpenAPI document: Bearer auth, paid means HTTP 200 with `data.amount`, unpaid is 404, no scanned signal, repeat checks cached for 5 seconds.
- Rate limiting needs no extra service: an `ip_hash` column on `orders`.
- The intro is skipped for URLs with a hash or query so shared finder links open on results.
- The dark mist palette is not shipped. The hero stays on cream in dark mode until cutout bottle images exist.

## Things only the user can provide

- A Sanity project id and an Editor token (seeding only).
- A Supabase project (Hobby) or Docker Desktop for a local one.
- A Telegram bot from BotFather, the admin group id, and the khqr.dev store token.
- The shop address, hours, phone and social links, entered in Sanity Studio.
- The bottle turntable videos, when they exist.
- The final domain, verified in the khqr.dev portal.
