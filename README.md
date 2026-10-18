# SAKA Parfum

Storefront for SAKA Parfum, a perfume shop in Cambodia. Next.js App Router, Sanity for the catalog, Supabase for orders, KHQR payments through khqr.dev, and a Telegram bot for order messages.

Project rules live in `CLAUDE.md`. The design spec is in `docs/superpowers/specs/`.

## 1. Run locally

Needs Node 22.18 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` as described in the sections below. The site runs at http://localhost:3000.

Checks:

```bash
npm run typecheck   # TypeScript
npm test            # unit tests (Vitest, all external services mocked)
npm run check       # copy rules: no em dashes, no exclamation marks
npm run test:e2e    # Playwright against a production build and a local mock server
```

`npm run test:e2e` starts its own mock for Sanity, khqr.dev and Telegram on port 4010. It never touches the real services. The checkout specs also need a real Postgres: create `.env.test` with a test database (a second Supabase project, never the live one):

```
SUPABASE_URL=https://<test-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<test service role key>
```

Without `.env.test` the checkout specs are skipped and the catalog and accessibility specs still run. The specs delete every row in `orders` before each test, which is why the database must be a separate test project.

## 2. Sanity (catalog and store settings)

1. Create a project at https://www.sanity.io/manage and put its id in `SANITY_PROJECT_ID` and `SANITY_STUDIO_PROJECT_ID`. Keep `SANITY_DATASET=production`.
2. Deploy the Studio: `cd sanity && npm install && npx sanity deploy`. The current Studio is at https://saka-parfum.sanity.studio/.
3. Seed sample content once: create an Editor token in the Sanity dashboard, put it in `SANITY_WRITE_TOKEN`, then run `node --env-file=.env.local scripts/seed-sanity.mjs`. The seed only creates missing documents, so it never overwrites staff edits. The site itself never needs the write token.
4. After the site is deployed, add a webhook in the Sanity dashboard (API, Webhooks) that posts to `https://<site>/api/revalidate?secret=<SANITY_REVALIDATE_SECRET>` on create, update and delete. Choose a long random value for `SANITY_REVALIDATE_SECRET`. Published changes then show on the site within seconds.

Staff work in the Studio:

- To mark a perfume out of stock, switch off Available on that perfume and publish. Checkout re-checks this against live data, so a stale page cannot sell it.
- After a stock check, update "Stock last checked" in Store settings.
- Prices are entered in USD only. Riel is shown at a fixed 1 USD = 4000 KHR.

## 3. Supabase (orders)

1. Create a project on the Hobby plan at https://supabase.com/dashboard. Pick the Singapore region (closest to Cambodia).
2. Apply the migration in `supabase/migrations/`. Either paste the SQL into the dashboard SQL editor, or run `npx supabase link --project-ref <ref>` then `npx supabase db push`.
3. Open Advisors in the dashboard and confirm there are no security warnings. Row level security is on with no policies, so only the server (service role key) can read or write orders.
4. From Project Settings, API, copy the project URL into `SUPABASE_URL` and the service role key into `SUPABASE_SERVICE_ROLE_KEY`. The service role key is a secret: never commit it and never expose it to the browser.

For local development without a hosted project, `npx supabase start` runs a local stack (needs Docker Desktop) and applies the migration automatically. `npx supabase status -o env` prints the URL and service role key.

## 4. Telegram (admin messages and customer confirmations)

1. In Telegram, message @BotFather, send `/newbot`, and follow the steps. Put the token in `TELEGRAM_BOT_TOKEN` and the bot username (without @) in `TELEGRAM_BOT_USERNAME`.
2. Create the admin group, add the bot, and send any message in the group.
3. Open `https://api.telegram.org/bot<token>/getUpdates` in a browser. Find `"chat":{"id":-100...` for the group and put that negative number in `TELEGRAM_ADMIN_CHAT_ID`.
4. Choose `TELEGRAM_WEBHOOK_SECRET`: letters, digits, underscore and hyphen only.
5. After the site is deployed, register the webhook:

```bash
curl "https://api.telegram.org/bot<token>/setWebhook" -d "url=https://<site>/api/telegram" -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Every paid order posts one message to the admin group with the name, Telegram number, fulfilment, items, total and, for delivery, the Google Maps link. A customer gets a confirmation only if they tap the Telegram button after paying. The bot replies once to that chat and stores nothing.

## 5. khqr.dev (KHQR payments)

1. Create a store in the khqr.dev developer portal and copy its `rbk_token` into `KHQR_TOKEN`.
2. Check the store currency is USD. The app compares paid amounts in USD and refuses anything else.
3. Set the store webhook URL to `https://<site>/api/khqr/webhook`. The webhook is only a trigger: every payment is confirmed server side with khqr.dev and the amount is compared with the order total.
4. If the portal shows a webhook signing secret, put it in `KHQR_WEBHOOK_SECRET`. A mismatched signature is logged, not rejected, until the signing scheme is documented. Once it is, make the check strict in `src/app/api/khqr/webhook/route.ts`.
5. Verify the real site domain in the portal (DNS TXT record or file).

## 6. Vercel (hosting)

1. Import the GitHub repository at https://vercel.com/new.
2. Add every variable from `.env.example` except the test only ones. Set `NEXT_PUBLIC_SITE_URL` to the real domain.
3. Set `CRON_SECRET` to a long random string. Vercel sends it to the daily job automatically.
4. Deploy, then finish the Sanity webhook (section 2), the Telegram webhook (section 4) and the khqr.dev webhook and domain (section 5).

The cron in `vercel.json` runs `/api/cron/daily` once a day at 03:00 UTC (10:00 in Phnom Penh).

## 7. Before taking real orders

1. Place one real order for the cheapest item and pay it with a Bakong banking app.
2. Confirm the admin group gets exactly one message with the right items and total.
3. On a phone, tap "Open Telegram" on the paid screen, press Start, and confirm the bot replies with the order number.
4. Try one delivery order and confirm the Google Maps link appears in the admin message.

## 8. Operations

- Supabase Hobby pauses a project after a week with no activity. The daily cron touches the database so this does not happen.
- The daily cron also resends any admin message that failed, re-checks every unpaid order from the last 48 hours (so a payment is never lost if the khqr.dev webhook fails), deletes unpaid orders older than 48 hours, and clears the name, number and map link from paid orders after 90 days.
- The admin Telegram group is the readable record of paid orders. Orders in Supabase keep the items and totals after the personal fields are cleared.
- Order numbers start at SK-1001 and only count paid orders.
