# SAKA Parfum

Storefront for SAKA Parfum, a perfume shop in Cambodia. Next.js App Router, Supabase for the catalog and orders, KHQR payments through khqr.dev, and a Telegram bot for order messages and sales totals.

Project rules live in `CLAUDE.md`. The design spec is in `docs/superpowers/specs/`.

## 1. Run locally

Needs Node 22.18 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` as described in the sections below. The site runs at http://localhost:3000.

To preview without any accounts, run `npm run dev:mock` instead. It runs the site against a local mock with the full catalog. Admin password: `saka-local`. Payments can be started but never settle.

Checks:

```bash
npm run typecheck   # TypeScript
npm test            # unit tests (Vitest, all external services mocked)
npm run check       # copy rules: no em dashes, no exclamation marks
npm run test:e2e    # Playwright against a production build and a local mock server
```

`npm run test:e2e` starts its own mock for the catalog, khqr.dev and Telegram on port 4010. It never touches the real services, and uses the `.env.test` Supabase project for the catalog when one is set. The checkout specs also need a real Postgres: create `.env.test` with a test database (a second Supabase project, never the live one):

```
SUPABASE_URL=https://<test-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<test service role key>
```

Without `.env.test` the checkout specs are skipped and the catalog and accessibility specs still run. The specs delete every row in `orders` before each test, which is why the database must be a separate test project.

## 2. Admin (perfumes, prices and transactions)

Staff sign in at `/admin` with one shared password.

1. Set `ADMIN_PASSWORD` to the staff password.
2. Set `ADMIN_SESSION_SECRET` to 32 or more random characters, for example the output of `openssl rand -base64 48`. Changing it signs everyone out.

In admin, staff can:

- Rename a perfume.
- Mark a perfume Available or Out of stock. Checkout re-checks this against live data, so a stale page cannot sell it.
- Change the three prices (10ml, 20ml, 50ml). One price per size is shared by every perfume.
- See paid orders, with totals for today and this month in Phnom Penh time.

Perfumes cannot be added or removed in admin. Every save shows on the site on the next visit. Five wrong passwords from one network lock the login for 15 minutes. A session lasts 12 hours.

The shop address, hours, phone, map link and social links live in `src/lib/store.ts`.

## 3. Supabase (catalog and orders)

1. Create a project on the Hobby plan at https://supabase.com/dashboard. Pick the Singapore region (closest to Cambodia).
2. Apply the three migrations in `supabase/migrations/` in order (orders, catalog, catalog seed). Either paste the SQL into the dashboard SQL editor, or run `npx supabase link --project-ref <ref>` then `npx supabase db push`. Rerunning the seed never overwrites staff edits.
3. Open Advisors in the dashboard and confirm there are no security warnings. Row level security is on with no policies, so only the server (service role key) can read or write any table.
4. From Project Settings, API, copy the project URL into `SUPABASE_URL` and the service role key into `SUPABASE_SERVICE_ROLE_KEY`. The service role key is a secret: never commit it and never expose it to the browser.

For local development without a hosted project, `npx supabase start` runs a local stack (needs Docker Desktop) and applies the migrations automatically. `npx supabase status -o env` prints the URL and service role key.

The perfume list comes from `supabase/seed/catalog.json`. To change it, edit that file, run `npm run seed:sql` to regenerate the seed migration, and write a new migration for any rows that already exist (the seed only inserts missing perfumes).

## 4. Telegram (admin messages and /revenue)

1. In Telegram, message @BotFather, send `/newbot`, and follow the steps. Put the token in `TELEGRAM_BOT_TOKEN`.
2. Create the admin group, add the bot, and send any message in the group.
3. Open `https://api.telegram.org/bot<token>/getUpdates` in a browser. Find `"chat":{"id":-100...` for the group and put that negative number in `TELEGRAM_ADMIN_CHAT_ID`.
4. Choose `TELEGRAM_WEBHOOK_SECRET`: letters, digits, underscore and hyphen only.
5. After the site is deployed, register the webhook:

```bash
curl "https://api.telegram.org/bot<token>/setWebhook" -d "url=https://<site>/api/telegram" -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

6. Optional: add `/revenue` to the command menu in the group.

```bash
curl "https://api.telegram.org/bot<token>/setMyCommands" -H "content-type: application/json" -d '{"commands":[{"command":"revenue","description":"Orders, bottles and revenue"}],"scope":{"type":"all_chat_administrators"}}'
```

The bot does two things, both in the admin group:

- Every paid order posts one message with the name, Telegram number, fulfilment, items, total and, for delivery, the Google Maps link.
- `/revenue` replies with orders, bottles and revenue for today, this month and all time (Phnom Penh days). Revenue is the paid total including delivery fees. It is counted from the `orders` table, so it keeps working after personal details are cleared. The bot ignores `/revenue` from any other chat.

The paid page links customers to a Telegram group. The link is a placeholder: set `telegramGroupUrl` in `src/lib/store.ts` once the group exists.

## 5. khqr.dev (KHQR payments)

1. Create a store in the khqr.dev developer portal and copy its `rbk_token` into `KHQR_TOKEN`.
2. Check the store currency is USD. The app compares paid amounts in USD and refuses anything else.
3. Set the store webhook URL to `https://<site>/api/khqr/webhook`. The webhook is only a trigger: every payment is confirmed server side with khqr.dev and the amount is compared with the order total.
4. If the portal shows a webhook signing secret, put it in `KHQR_WEBHOOK_SECRET`. A mismatched signature is logged, not rejected, until the signing scheme is documented. Once it is, make the check strict in `src/app/api/khqr/webhook/route.ts`.
5. Verify the real site domain in the portal (DNS TXT record or file).

## 6. Vercel (hosting)

1. Import the GitHub repository at https://vercel.com/new.
2. Add every variable from `.env.example` except the test only ones, including `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`. Set `NEXT_PUBLIC_SITE_URL` to the real domain.
3. Set `CRON_SECRET` to a long random string. Vercel sends it to the daily job automatically.
4. Deploy, then finish the Telegram webhook (section 4) and the khqr.dev webhook and domain (section 5).

The cron in `vercel.json` runs `/api/cron/daily` once a day at 03:00 UTC (10:00 in Phnom Penh).

## 7. Before taking real orders

1. Place one real order for the cheapest item and pay it with a Bakong banking app.
2. Confirm the admin group gets exactly one message with the right items and total.
3. Send `/revenue` in the admin group and confirm the counts match.
4. Try one delivery order and confirm the Google Maps link appears in the admin message.

## 8. Operations

- Supabase Hobby pauses a project after a week with no activity. The daily cron touches the database so this does not happen.
- The daily cron also resends any admin message that failed, re-checks every unpaid order from the last 48 hours (so a payment is never lost if the khqr.dev webhook fails), deletes unpaid orders older than 48 hours and failed admin logins older than a day, and clears the name, number and map link from paid orders after 90 days.
- The admin Telegram group is the readable record of paid orders. Orders in Supabase keep the items and totals after the personal fields are cleared.
- Order numbers start at SK-1001 and only count paid orders.
