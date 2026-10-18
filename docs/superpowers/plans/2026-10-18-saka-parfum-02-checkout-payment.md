# SAKA Parfum Pass 2: Checkout and KHQR Payment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A customer can check out with pickup or delivery, pay by KHQR, return from a banking app to the right screen, and the shop gets every paid order in a Telegram admin group. Customers can optionally get a confirmation from the bot.

**Architecture:** Orders live in Supabase, accessed only by server code with the service role key. Plain `fetch` clients for khqr.dev and the Telegram Bot API. One function, `settleOrder(md5)`, is the only path that marks an order paid, and it is called by the status route, the webhook and the daily cron. The browser polls a status route that never exposes personal data. The payment screen is addressed by order id in the URL, so reloads and returns from a banking app restore the screen.

**Tech Stack:** Next.js route handlers, `@supabase/supabase-js`, `uqr` (tiny QR encoder, payment screen only), Zod, Vitest (mocked khqr.dev, Supabase and Telegram), Playwright against a local mock server.

**Spec:** `docs/superpowers/specs/2026-10-18-saka-parfum-design.md`, sections 5.4 to 7 and 13. Pass 1 plan: `2026-10-18-saka-parfum-01-foundation-catalog.md` (must be complete).

## Global Constraints

Copied from `CLAUDE.md` and the spec. They apply to every task.

- Skeleton loaders for every loading state. No spinners, no blank screens. Skeletons match the final layout.
- Code like a senior developer: less code where possible, no dead code, no needless abstractions or wrappers, no duplicated logic, no unused dependencies.
- No AI slop. No emoji as icons. No generic stock copy.
- Never use em dashes anywhere (copy, headings, alt text, code comments). No exclamation marks in any copy. Avoid the non-null assertion operator followed by a space so `npm run check` stays reliable.
- English only. Palette only (light: #FAF6EE, #F2EBDF, #DCD0BF, #171A12, #8C7964, #AD9883, #685846, success #4F6B3A, error #A3392B; dark: #171A12, #23261C, #3A3A2C, #F5EFE4, #BDAE9B, success #8FB174, error #E07A6A). No #FFFFFF or #000000.
- Radius 2px, no pills, no shadows except `0 8px 24px rgba(23,26,18,0.08)` on the cart drawer and modals. Icons are 1.5px line icons.
- GSAP only for animation, every animation inside `useGSAP` with `gsap.matchMedia()` and `prefers-reduced-motion` respected.
- Exchange rate: 1 USD = 4000 KHR, constant `RIEL_PER_USD`. Delivery fee constant $2.00 (`DELIVERY_FEE_USD`). Pickup is free. Show the Riel amount beside USD.
- Payment: KHQR through Bakong using the khqr.dev relay. KHQR only, no cards.
- Customer details collected: name and Telegram number. Delivery adds one Google Maps link. Nothing else.
- Orders live in Supabase (Hobby plan), server only, service role key. No chat ids stored, no customer table.
- khqr.dev facts (verified against `https://api.khqr.dev/openapi.json`, v2.1.6):
  - Auth is `Authorization: Bearer <rbk_token>`.
  - `POST /v1/generate_qr` body `{ amount }` returns `data: { qr, md5, tran_id, checkout_url }`. We do not use `checkout_url` and send no return URLs.
  - `POST /v1/generate_deeplink_by_qr` body `{ qr }` returns `data.shortLink`.
  - `POST /v1/check_transaction_by_md5` body `{ md5 }` returns 200 with `data.amount` and `data.currency` only once paid, and 404 while unpaid, pending, scanned or unknown. There is no reliable `status` field and no scanned signal.
  - Repeat checks within 5 seconds are answered from a cache by khqr.dev.
  - The webhook signing scheme and retry policy are undocumented. A webhook is only a trigger, its payload is never trusted.
  - Browser events are UI only. Never fulfil from them.
  - Always confirm with a server-side `check_transaction_by_md5` and compare the amount with the total recomputed from live Sanity prices plus the delivery fee.
- Telegram: the admin message is posted when payment is confirmed and does not depend on the customer. The customer confirmation and the order number go to the customer only after the bot receives the start event. The chat id is used once for the reply and never stored. All user text sent to Telegram is HTML escaped.
- Mobile resume: cart, entered details, order id and payment state survive a trip to a banking app. Never drop the customer at an empty cart.
- WCAG 2.2 AA, `aria-live="polite"` for the payment status line, 44px touch targets.
- Web design decisions go through `ui-ux-pro-max:ui-ux-pro-max`. Load `gsap-skills:gsap-core` and `gsap-skills:gsap-react` before animation code. The brand brief wins.
- Commits are small and conventional. Add the attribution trailer the session requires.

## Deviations from the spec (decided in this plan)

1. `settle_order` returns `setof orders` instead of a single `orders` value, so "no row won" is an empty result rather than a row of nulls over PostgREST.
2. The "scanned" payment state is dropped. khqr.dev exposes no scanned signal over REST, so the status line reads "Waiting for payment" until paid.
3. The status route and the cron also check pending orders after the QR has expired (within 24 hours of creation). A customer who paid at minute 9 and returned at minute 11 is still settled, and the amount check still protects the shop. The status route throttle is 5 seconds, matching the khqr.dev cache.
4. The status response includes `qr`, `deeplink` and, once paid, `orderNumber` and `claimToken`. They are only reachable with the unguessable order id. It still never returns name, number, map link or items.
5. End-to-end tests need a real Postgres. Use local Supabase (`npx supabase start`, needs Docker Desktop) or a dedicated second Supabase project. Tests never touch real khqr.dev or Telegram.

## File Structure

```
supabase/config.toml, supabase/migrations/<timestamp>_orders.sql
src/lib/supabase.ts          server client, OrderRow type, all queries
src/lib/schemas.ts           (modify) details, map URL, order input schemas
src/lib/khqr.ts              generateQr, generateDeeplink, checkPaid
src/lib/telegram.ts          escapeHtml, formatAdminMessage, formatConfirmation, sendMessage
src/lib/orders.ts            createOrder, settleOrder, getOrderView, notifyAdmin, retryUnsent, handleStart, runDaily
src/lib/sanity.ts            (modify) getLiveProducts
src/lib/cart.ts              (modify) clearCart, active order helpers
src/lib/checkout-client.ts   draft storage and submitOrder
src/app/api/orders/route.ts, api/orders/[id]/route.ts
src/app/api/khqr/webhook/route.ts, api/telegram/route.ts, api/cron/daily/route.ts
src/app/checkout/page.tsx, loading.tsx, [orderId]/page.tsx, [orderId]/loading.tsx
src/components/CheckoutForm.tsx, PaymentScreen.tsx, Skeletons.tsx (modify), CartMenu.tsx (modify)
vercel.json, README.md
tests/unit/schemas.test.ts, khqr.test.ts, telegram.test.ts, orders.test.ts
tests/mock-server.mjs (modify), tests/e2e-server.mjs (modify), tests/e2e/helpers.ts, tests/e2e/checkout.spec.ts
```

---

### Task 1: Supabase migration and server data access

**Files:**
- Create: `supabase/migrations/20261018000000_orders.sql`, `src/lib/supabase.ts`
- Modify: `package.json` (dependency)

**Interfaces:**
- Produces from `src/lib/supabase.ts`:
  - `type OrderItem = { productId: string; name: string; sizeMl: number; priceUsd: number; qty: number }`
  - `type OrderRow` (every column in the migration; numeric columns are `number`)
  - `type NewOrder = Omit<OrderRow, "id" | "status" | "order_number" | "paid_at" | "admin_notified_at" | "last_checked_at" | "created_at">`
  - `insertOrder(order: NewOrder): Promise<OrderRow>`
  - `getOrder(id: string)`, `getOrderByMd5(md5: string)`, `getOrderByClaimToken(token: string)`: each `Promise<OrderRow | null>`
  - `settleByMd5(md5: string): Promise<OrderRow | null>` (non-null only for the single winning caller)
  - `markNotified(id: string)`, `touchChecked(id: string)`: `Promise<void>`
  - `countRecentByIp(ipHash: string, sinceIso: string): Promise<number>`
  - `unnotifiedPaid(): Promise<OrderRow[]>`, `stalePending(): Promise<OrderRow[]>`
  - `cleanup(): Promise<{ deleted: number; scrubbed: number }>`, `ping(): Promise<void>`

- [ ] **Step 1: Install the client**

```bash
npm install @supabase/supabase-js
```

- [ ] **Step 2: Write the migration**

`supabase/migrations/20261018000000_orders.sql` (SQL comments avoid dashes):

```sql
create sequence order_number_seq start 1001;

create table orders (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  order_number integer unique,
  claim_token text not null unique,
  customer_name text,
  telegram text,
  fulfilment text not null check (fulfilment in ('pickup', 'delivery')),
  map_url text,
  items jsonb not null,
  subtotal_usd numeric(8, 2) not null,
  delivery_fee_usd numeric(8, 2) not null,
  total_usd numeric(8, 2) not null,
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

create index orders_ip_created_idx on orders (ip_hash, created_at);
create index orders_status_created_idx on orders (status, created_at);

alter table orders enable row level security;

-- Moves pending to paid in one atomic step. Returns a row only for the caller that wins.
create function settle_order(p_md5 text) returns setof orders language sql as $$
  update orders
     set status = 'paid',
         paid_at = now(),
         order_number = nextval('order_number_seq'),
         ip_hash = null
   where khqr_md5 = p_md5 and status = 'pending'
  returning *;
$$;

revoke all on function settle_order(text) from public, anon, authenticated;
```

RLS is on with no policies, so only the service role (which bypasses RLS) can read or write.

- [ ] **Step 3: Create the database (user action) and apply the migration**

Option A, local (recommended for development and all e2e runs; needs Docker Desktop):

```bash
npx supabase init
npx supabase start
npx supabase status -o env
```

`supabase start` applies everything in `supabase/migrations`. Note `API_URL` and `SERVICE_ROLE_KEY` from the status output.

Option B, hosted: ask the user to create a Supabase project on the Hobby plan and give you `SUPABASE_URL` and the service role key (never print or commit it). Apply with the Supabase MCP `apply_migration` tool using the SQL above, or `npx supabase link` then `npx supabase db push`.

Then verify with the Supabase MCP `list_tables` (hosted) or `npx supabase db reset` (local): `orders` exists with RLS enabled, `settle_order` exists. Run `get_advisors` (hosted) and fix any security finding.

Put the values in `.env.local` (dev) and `.env.test` (e2e, same local values): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

- [ ] **Step 4: Write `src/lib/supabase.ts`**

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type OrderItem = { productId: string; name: string; sizeMl: number; priceUsd: number; qty: number };

export type OrderRow = {
  id: string;
  status: "pending" | "paid";
  order_number: number | null;
  claim_token: string;
  customer_name: string | null;
  telegram: string | null;
  fulfilment: "pickup" | "delivery";
  map_url: string | null;
  items: OrderItem[];
  subtotal_usd: number;
  delivery_fee_usd: number;
  total_usd: number;
  khqr_md5: string;
  khqr_tran_id: string | null;
  khqr_qr: string;
  khqr_deeplink: string | null;
  ip_hash: string | null;
  expires_at: string;
  last_checked_at: string | null;
  paid_at: string | null;
  admin_notified_at: string | null;
  created_at: string;
};

export type NewOrder = Omit<OrderRow, "id" | "status" | "order_number" | "paid_at" | "admin_notified_at" | "last_checked_at" | "created_at">;

const HOUR_MS = 60 * 60 * 1000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

let client: SupabaseClient | undefined;
const db = () => (client ??= createClient(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", { auth: { persistSession: false } }));

function ok<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data;
}

async function getBy(column: "id" | "khqr_md5" | "claim_token", value: string) {
  return ok(await db().from("orders").select().eq(column, value).maybeSingle()) as OrderRow | null;
}

export const getOrder = (id: string) => getBy("id", id);
export const getOrderByMd5 = (md5: string) => getBy("khqr_md5", md5);
export const getOrderByClaimToken = (token: string) => getBy("claim_token", token);

export async function insertOrder(order: NewOrder) {
  return ok(await db().from("orders").insert(order).select().single()) as OrderRow;
}

export async function settleByMd5(md5: string) {
  const rows = ok(await db().rpc("settle_order", { p_md5: md5 })) as OrderRow[] | null;
  return rows?.[0] ?? null;
}

export async function markNotified(id: string) {
  ok(await db().from("orders").update({ admin_notified_at: new Date().toISOString() }).eq("id", id));
}

export async function touchChecked(id: string) {
  ok(await db().from("orders").update({ last_checked_at: new Date().toISOString() }).eq("id", id));
}

export async function countRecentByIp(ipHash: string, sinceIso: string) {
  const { count, error } = await db().from("orders").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", sinceIso);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function unnotifiedPaid() {
  return ok(await db().from("orders").select().eq("status", "paid").is("admin_notified_at", null).limit(50)) as OrderRow[];
}

export async function stalePending() {
  return ok(await db().from("orders").select().eq("status", "pending").is("last_checked_at", null).gte("created_at", ago(24 * HOUR_MS)).limit(50)) as OrderRow[];
}

export async function cleanup() {
  const deleted = await db().from("orders").delete({ count: "exact" }).eq("status", "pending").lt("created_at", ago(24 * HOUR_MS));
  const scrubbed = await db()
    .from("orders")
    .update({ customer_name: null, telegram: null, map_url: null }, { count: "exact" })
    .eq("status", "paid")
    .lt("paid_at", ago(90 * 24 * HOUR_MS))
    .not("customer_name", "is", null);
  ok(deleted);
  ok(scrubbed);
  return { deleted: deleted.count ?? 0, scrubbed: scrubbed.count ?? 0 };
}

export async function ping() {
  ok(await db().from("orders").select("id").limit(1));
}
```

- [ ] **Step 5: Smoke test against the real database**

Write a throwaway script in the scratchpad (not the repo) that inserts a pending order through the service role, calls `settle_order` twice, and confirms the first call returns one row with `order_number` 1001 and the second returns an empty array, then deletes the row and confirms an anon-key client cannot read `orders`. Expected: exactly that. Fix the migration if not.

- [ ] **Step 6: Typecheck and commit**

Run: `npm run typecheck`

```bash
git add supabase src/lib/supabase.ts package.json package-lock.json
git commit -m "feat: orders table, atomic settle function and server data access"
```

---

### Task 2: Checkout schemas

**Files:**
- Modify: `src/lib/schemas.ts`
- Test: `tests/unit/schemas.test.ts`

**Interfaces:**
- Consumes: `cartLineSchema`, `MAX_CART_LINES` (existing).
- Produces: `isGoogleMapsUrl(value: string): boolean`, `detailsSchema` (discriminated union on `fulfilment`: `pickup` has `name`, `telegram`; `delivery` also has `mapUrl`), `type Details`, `orderInputSchema` (`{ lines: CartLine[]; details: Details }`), `type OrderInput`.

- [ ] **Step 1: Write the failing tests**

`tests/unit/schemas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { detailsSchema, isGoogleMapsUrl, orderInputSchema } from "@/lib/schemas";

describe("isGoogleMapsUrl", () => {
  it("accepts the three allowed forms over https", () => {
    expect(isGoogleMapsUrl("https://maps.app.goo.gl/abc123")).toBe(true);
    expect(isGoogleMapsUrl("https://goo.gl/maps/abc123")).toBe(true);
    expect(isGoogleMapsUrl("https://www.google.com/maps/place/Saka")).toBe(true);
    expect(isGoogleMapsUrl("https://google.com/maps?q=1,2")).toBe(true);
  });
  it("rejects everything else", () => {
    expect(isGoogleMapsUrl("http://maps.app.goo.gl/abc")).toBe(false);
    expect(isGoogleMapsUrl("https://evil.example/maps")).toBe(false);
    expect(isGoogleMapsUrl("https://google.com.evil.example/maps")).toBe(false);
    expect(isGoogleMapsUrl("https://google.com/search?q=maps")).toBe(false);
    expect(isGoogleMapsUrl("not a url")).toBe(false);
  });
});

describe("detailsSchema", () => {
  const pickup = { fulfilment: "pickup", name: "Sokha Chan", telegram: "+855 12 345 678" };
  it("accepts pickup without a map link", () => {
    expect(detailsSchema.safeParse(pickup).success).toBe(true);
  });
  it("trims the name and rejects an empty or long one", () => {
    expect(detailsSchema.parse({ ...pickup, name: "  Sokha  " }).name).toBe("Sokha");
    expect(detailsSchema.safeParse({ ...pickup, name: "   " }).success).toBe(false);
    expect(detailsSchema.safeParse({ ...pickup, name: "x".repeat(81) }).success).toBe(false);
  });
  it("needs 8 to 15 digits in the Telegram number", () => {
    expect(detailsSchema.safeParse({ ...pickup, telegram: "1234567" }).success).toBe(false);
    expect(detailsSchema.safeParse({ ...pickup, telegram: "1234567890123456" }).success).toBe(false);
    expect(detailsSchema.safeParse({ ...pickup, telegram: "12345678" }).success).toBe(true);
    expect(detailsSchema.safeParse({ ...pickup, telegram: "abc12345678" }).success).toBe(false);
  });
  it("requires a Google Maps link for delivery", () => {
    expect(detailsSchema.safeParse({ ...pickup, fulfilment: "delivery" }).success).toBe(false);
    expect(detailsSchema.safeParse({ ...pickup, fulfilment: "delivery", mapUrl: "https://example.com" }).success).toBe(false);
    expect(detailsSchema.safeParse({ ...pickup, fulfilment: "delivery", mapUrl: "https://maps.app.goo.gl/x" }).success).toBe(true);
  });
});

describe("orderInputSchema", () => {
  const details = { fulfilment: "pickup", name: "A", telegram: "12345678" };
  it("needs at least one line and at most 20", () => {
    expect(orderInputSchema.safeParse({ lines: [], details }).success).toBe(false);
    const many = Array.from({ length: 21 }, (_, i) => ({ productId: `p${i}`, sizeMl: 10, qty: 1 }));
    expect(orderInputSchema.safeParse({ lines: many, details }).success).toBe(false);
  });
  it("rejects a quantity above 10", () => {
    expect(orderInputSchema.safeParse({ lines: [{ productId: "p", sizeMl: 10, qty: 11 }], details }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/schemas.test.ts`
Expected: FAIL (exports missing).

- [ ] **Step 3: Append to `src/lib/schemas.ts`**

```ts
export function isGoogleMapsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const { hostname, pathname } = url;
    return (
      hostname === "maps.app.goo.gl" ||
      (hostname === "goo.gl" && pathname.startsWith("/maps")) ||
      ((hostname === "google.com" || hostname === "www.google.com") && pathname.startsWith("/maps"))
    );
  } catch {
    return false;
  }
}

const digitCount = (value: string) => value.replace(/\D/g, "").length;

const contact = {
  name: z.string().trim().min(1, "Enter your name.").max(80, "Use 80 characters or fewer."),
  telegram: z
    .string()
    .trim()
    .refine((v) => /^\+?[\d\s]+$/.test(v) && digitCount(v) >= 8 && digitCount(v) <= 15, "Enter a Telegram number with 8 to 15 digits."),
};

export const detailsSchema = z.discriminatedUnion("fulfilment", [
  z.object({ fulfilment: z.literal("pickup"), ...contact }),
  z.object({
    fulfilment: z.literal("delivery"),
    ...contact,
    mapUrl: z.string().trim().refine(isGoogleMapsUrl, "Paste a Google Maps link."),
  }),
]);

export const orderInputSchema = z.object({
  lines: z.array(cartLineSchema).min(1).max(MAX_CART_LINES),
  details: detailsSchema,
});

export type Details = z.infer<typeof detailsSchema>;
export type OrderInput = z.infer<typeof orderInputSchema>;
```

- [ ] **Step 4: Run tests and commit**

Run: `npx vitest run tests/unit/schemas.test.ts && npm run typecheck`
Expected: PASS.

```bash
git add src/lib/schemas.ts tests/unit/schemas.test.ts
git commit -m "feat: checkout details and order input schemas"
```

---

### Task 3: khqr.dev client

**Files:**
- Create: `src/lib/khqr.ts`
- Test: `tests/unit/khqr.test.ts`

**Interfaces:**
- Produces: `generateQr(amountUsd: number): Promise<{ qr: string; md5: string; tranId: string | null }>` (throws on failure), `generateDeeplink(qr: string): Promise<string | null>` (never throws), `type Payment = { paid: false } | { paid: true; amount: number; currency: string }`, `checkPaid(md5: string): Promise<Payment>` (throws on auth, validation or server errors, returns `{ paid: false }` on 404).

- [ ] **Step 1: Write the failing tests**

`tests/unit/khqr.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkPaid, generateDeeplink, generateQr } from "@/lib/khqr";

const fetchMock = vi.fn();
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  process.env.KHQR_TOKEN = "tok";
  process.env.KHQR_API_BASE = "https://khqr.test";
});
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("generateQr", () => {
  it("posts the amount with a bearer token and maps the response", async () => {
    fetchMock.mockResolvedValue(reply(200, { responseCode: 0, data: { qr: "000201", md5: "A".repeat(32), tran_id: "T1", checkout_url: "x" } }));
    expect(await generateQr(80)).toEqual({ qr: "000201", md5: "a".repeat(32), tranId: "T1" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://khqr.test/v1/generate_qr");
    expect(init.headers.authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body)).toEqual({ amount: 80 });
  });
  it("throws when the service fails", async () => {
    fetchMock.mockResolvedValue(reply(500, { responseCode: 1 }));
    await expect(generateQr(80)).rejects.toThrow("generate_qr failed: 500");
  });
});

describe("generateDeeplink", () => {
  it("returns the short link", async () => {
    fetchMock.mockResolvedValue(reply(200, { data: { shortLink: "https://link.khqr.dev/abc" } }));
    expect(await generateDeeplink("000201")).toBe("https://link.khqr.dev/abc");
  });
  it("returns null instead of throwing", async () => {
    fetchMock.mockRejectedValue(new Error("network"));
    expect(await generateDeeplink("000201")).toBeNull();
    fetchMock.mockResolvedValue(reply(422, {}));
    expect(await generateDeeplink("000201")).toBeNull();
  });
});

describe("checkPaid", () => {
  it("treats 404 as unpaid", async () => {
    fetchMock.mockResolvedValue(reply(404, { errorCode: 1 }));
    expect(await checkPaid("m")).toEqual({ paid: false });
  });
  it("treats a 200 with amount and currency as paid", async () => {
    fetchMock.mockResolvedValue(reply(200, { data: { amount: 80, currency: "USD", tran_id: "T1" } }));
    expect(await checkPaid("m")).toEqual({ paid: true, amount: 80, currency: "USD" });
  });
  it("treats a 200 without a payment body as unpaid", async () => {
    fetchMock.mockResolvedValue(reply(200, { data: null }));
    expect(await checkPaid("m")).toEqual({ paid: false });
  });
  it("respects an explicit non-paid status", async () => {
    fetchMock.mockResolvedValue(reply(200, { data: { amount: 80, currency: "USD", status: "UNPAID" } }));
    expect(await checkPaid("m")).toEqual({ paid: false });
  });
  it("throws on auth and server errors so they are not mistaken for unpaid", async () => {
    fetchMock.mockResolvedValue(reply(401, {}));
    await expect(checkPaid("m")).rejects.toThrow("check failed: 401");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/khqr.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/lib/khqr.ts`**

```ts
import { z } from "zod";

const post = (path: string, body: unknown) =>
  fetch(`${process.env.KHQR_API_BASE ?? "https://api.khqr.dev"}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.KHQR_TOKEN ?? ""}` },
    body: JSON.stringify(body),
    cache: "no-store",
  });

const generated = z.object({ data: z.object({ qr: z.string().min(1), md5: z.string().length(32), tran_id: z.unknown() }) });
const deeplink = z.object({ data: z.object({ shortLink: z.url() }) });
const transaction = z.object({
  data: z.object({ amount: z.number(), currency: z.string(), status: z.string().nullish() }),
});

export type Payment = { paid: false } | { paid: true; amount: number; currency: string };

export async function generateQr(amountUsd: number) {
  const res = await post("/v1/generate_qr", { amount: amountUsd });
  if (!res.ok) throw new Error(`khqr generate_qr failed: ${res.status}`);
  const { data } = generated.parse(await res.json());
  return { qr: data.qr, md5: data.md5.toLowerCase(), tranId: typeof data.tran_id === "string" ? data.tran_id : null };
}

export async function generateDeeplink(qr: string): Promise<string | null> {
  try {
    const res = await post("/v1/generate_deeplink_by_qr", { qr });
    return res.ok ? deeplink.parse(await res.json()).data.shortLink : null;
  } catch {
    return null;
  }
}

export async function checkPaid(md5: string): Promise<Payment> {
  const res = await post("/v1/check_transaction_by_md5", { md5 });
  if (res.status === 404) return { paid: false };
  if (!res.ok) throw new Error(`khqr check failed: ${res.status}`);
  const parsed = transaction.safeParse(await res.json());
  if (!parsed.success) return { paid: false };
  const { amount, currency, status } = parsed.data.data;
  return status && status.toLowerCase() !== "paid" ? { paid: false } : { paid: true, amount, currency };
}
```

- [ ] **Step 4: Run tests and commit**

Run: `npx vitest run tests/unit/khqr.test.ts && npm run typecheck`
Expected: PASS.

```bash
git add src/lib/khqr.ts tests/unit/khqr.test.ts
git commit -m "feat: khqr.dev client with bearer auth and paid detection"
```

---

### Task 4: Telegram client and message formatting

**Files:**
- Create: `src/lib/telegram.ts`
- Test: `tests/unit/telegram.test.ts`

**Interfaces:**
- Consumes: `OrderRow` type from `supabase.ts`, `formatRiel` from `pricing.ts`.
- Produces: `escapeHtml(text: string): string`, `orderNumber(n: number | null): string` (`"SK-1042"`), `formatAdminMessage(order): string`, `formatConfirmation(order): string`, `sendMessage(chatId: number | string, text: string): Promise<void>` (throws on failure). `order` parameters take the `Pick` of `OrderRow` fields listed in the code.

- [ ] **Step 1: Write the failing tests**

`tests/unit/telegram.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { escapeHtml, formatAdminMessage, formatConfirmation, sendMessage } from "@/lib/telegram";

const order = {
  order_number: 1042,
  paid_at: "2026-10-18T07:32:00Z",
  customer_name: "Sokha Chan",
  telegram: "+855 12 345 678",
  fulfilment: "delivery" as const,
  map_url: "https://maps.app.goo.gl/abc",
  items: [
    { productId: "a", name: "Rosewater", sizeMl: 20, priceUsd: 30, qty: 2 },
    { productId: "b", name: "Amber Pouch", sizeMl: 10, priceUsd: 18, qty: 1 },
  ],
  delivery_fee_usd: 2,
  total_usd: 80,
};

describe("escapeHtml", () => {
  it("escapes the three Telegram HTML characters", () => {
    expect(escapeHtml("<b>Tom & Co</b>")).toBe("&lt;b&gt;Tom &amp; Co&lt;/b&gt;");
  });
});

describe("formatAdminMessage", () => {
  it("matches the spec for a delivery order, with Phnom Penh time and 4000 KHR per USD", () => {
    expect(formatAdminMessage(order)).toBe(
      [
        "New order SK-1042",
        "Paid 2026-10-18 14:32 (Phnom Penh)",
        "",
        "Name: Sokha Chan",
        "Telegram: +855 12 345 678",
        "Fulfilment: Delivery",
        "Map: https://maps.app.goo.gl/abc",
        "",
        "Items",
        "Rosewater, 20ml x2  $60.00",
        "Amber Pouch, 10ml x1  $18.00",
        "Delivery  $2.00",
        "Total  $80.00 (320,000 KHR)",
      ].join("\n"),
    );
  });
  it("omits the map and delivery lines for pickup", () => {
    const text = formatAdminMessage({ ...order, fulfilment: "pickup", map_url: null, delivery_fee_usd: 0, total_usd: 78 });
    expect(text).toContain("Fulfilment: Pickup");
    expect(text).not.toContain("Map:");
    expect(text).not.toContain("Delivery  ");
  });
  it("escapes customer text", () => {
    expect(formatAdminMessage({ ...order, customer_name: "<script>" })).toContain("Name: &lt;script&gt;");
  });
  it("never contains an exclamation mark or an em dash", () => {
    expect(formatAdminMessage(order)).not.toMatch(new RegExp(`[!${String.fromCharCode(0x2014)}]`));
  });
});

describe("formatConfirmation", () => {
  it("greets by first name with order number, total and fulfilment", () => {
    expect(formatConfirmation(order)).toBe(
      "Thank you, Sokha. Order SK-1042 is confirmed. Total $80.00, delivery. Paid 2026-10-18 14:32 (Phnom Penh). We will message you when it is ready.",
    );
  });
});

describe("sendMessage", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    process.env.TELEGRAM_BOT_TOKEN = "123:abc";
    process.env.TELEGRAM_API_BASE = "https://tg.test";
  });
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });
  it("posts HTML text to the chat", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await sendMessage(42, "hi");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://tg.test/bot123:abc/sendMessage");
    expect(JSON.parse(init.body)).toMatchObject({ chat_id: 42, text: "hi", parse_mode: "HTML" });
  });
  it("throws when Telegram refuses", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: false, description: "blocked" }), { status: 403 }));
    await expect(sendMessage(42, "hi")).rejects.toThrow("telegram sendMessage failed: 403");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/telegram.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/lib/telegram.ts`**

```ts
import { formatRiel } from "./pricing";
import type { OrderRow } from "./supabase";

type Receipt = Pick<OrderRow, "order_number" | "paid_at" | "customer_name" | "telegram" | "fulfilment" | "map_url" | "items" | "delivery_fee_usd" | "total_usd">;

export const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const orderNumber = (n: number | null) => `SK-${n ?? "pending"}`;

const usd = (amount: number) => `$${Number(amount).toFixed(2)}`;

function phnomPenhTime(iso: string | null) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Phnom_Penh", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    })
      .formatToParts(iso ? new Date(iso) : new Date())
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} (Phnom Penh)`;
}

export function formatAdminMessage(o: Receipt) {
  const delivery = o.fulfilment === "delivery";
  return [
    `New order ${orderNumber(o.order_number)}`,
    `Paid ${phnomPenhTime(o.paid_at)}`,
    "",
    `Name: ${escapeHtml(o.customer_name ?? "")}`,
    `Telegram: ${escapeHtml(o.telegram ?? "")}`,
    `Fulfilment: ${delivery ? "Delivery" : "Pickup"}`,
    ...(delivery && o.map_url ? [`Map: ${escapeHtml(o.map_url)}`] : []),
    "",
    "Items",
    ...o.items.map((i) => `${escapeHtml(i.name)}, ${i.sizeMl}ml x${i.qty}  ${usd(i.priceUsd * i.qty)}`),
    ...(Number(o.delivery_fee_usd) > 0 ? [`Delivery  ${usd(o.delivery_fee_usd)}`] : []),
    `Total  ${usd(o.total_usd)} (${formatRiel(Number(o.total_usd))})`,
  ].join("\n");
}

export function formatConfirmation(o: Receipt) {
  const first = escapeHtml((o.customer_name ?? "").split(" ")[0]);
  return `Thank you, ${first}. Order ${orderNumber(o.order_number)} is confirmed. Total ${usd(o.total_usd)}, ${o.fulfilment}. Paid ${phnomPenhTime(o.paid_at)}. We will message you when it is ready.`;
}

export async function sendMessage(chatId: number | string, text: string) {
  const res = await fetch(`${process.env.TELEGRAM_API_BASE ?? "https://api.telegram.org"}/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", link_preview_options: { is_disabled: true } }),
  });
  if (!res.ok) throw new Error(`telegram sendMessage failed: ${res.status}`);
}
```

- [ ] **Step 4: Run tests and commit**

Run: `npx vitest run tests/unit/telegram.test.ts && npm run typecheck && npm run check`
Expected: PASS.

```bash
git add src/lib/telegram.ts tests/unit/telegram.test.ts
git commit -m "feat: telegram client and admin and confirmation message formatting"
```

---

### Task 5: Order logic: create, settle, status, notify, bot start, daily job

**Files:**
- Create: `src/lib/orders.ts`
- Modify: `src/lib/sanity.ts` (add `getLiveProducts`)
- Test: `tests/unit/orders.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1 to 4, `computeTotals`, `priceOf`, `OrderInput`.
- Produces from `src/lib/orders.ts`:
  - `class OrderError extends Error { code: "unavailable" | "rate_limited"; status: number }`
  - `createOrder(input: OrderInput, ip: string): Promise<{ orderId: string }>`
  - `settleOrder(md5: string): Promise<boolean>` (true only for the caller that newly settled the order)
  - `notifyAdmin(order: OrderRow): Promise<void>` (never throws)
  - `type OrderView = { state: "pending"; qr: string; deeplink: string | null; totalUsd: number; expiresAt: string } | { state: "expired"; totalUsd: number } | { state: "paid"; orderNumber: string; totalUsd: number; fulfilment: "pickup" | "delivery"; claimToken: string }`
  - `getOrderView(id: string): Promise<OrderView | null>`
  - `handleStart(chatId: number, token: string | undefined): Promise<void>`
  - `runDaily(): Promise<{ retried: number; settled: number; deleted: number; scrubbed: number }>`
- `getLiveProducts(ids: string[]): Promise<Product[]>` in `sanity.ts`.

- [ ] **Step 1: Add `getLiveProducts` to `src/lib/sanity.ts`**

Replace the single `client` definition with a shared config and a second uncached client:

```ts
const config = {
  projectId: process.env.SANITY_PROJECT_ID ?? "missing",
  dataset: process.env.SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  useCdn: true,
  ...(process.env.SANITY_API_HOST
    ? { apiHost: process.env.SANITY_API_HOST, useProjectHostname: false, useCdn: false }
    : {}),
};
const client = createClient(config);
const liveClient = createClient({ ...config, useCdn: false });
```

and append:

```ts
/** Always live, never cached. Checkout uses this so a stale page cannot oversell. */
export async function getLiveProducts(ids: string[]): Promise<Product[]> {
  const query = `*[_type == "product" && _id in $ids && isActive != false]{${PRODUCT_FIELDS}}`;
  return parseProducts(await liveClient.fetch<unknown[]>(query, { ids }, { cache: "no-store" }));
}
```

- [ ] **Step 2: Write the failing tests**

`tests/unit/orders.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderRow } from "@/lib/supabase";

vi.mock("@/lib/supabase");
vi.mock("@/lib/khqr");
vi.mock("@/lib/sanity", () => ({ getLiveProducts: vi.fn() }));
vi.mock("@/lib/telegram", async (original) => ({ ...(await original<typeof import("@/lib/telegram")>()), sendMessage: vi.fn() }));

import { checkPaid, generateDeeplink, generateQr } from "@/lib/khqr";
import { createOrder, getOrderView, handleStart, notifyAdmin, OrderError, runDaily, settleOrder } from "@/lib/orders";
import { getLiveProducts } from "@/lib/sanity";
import * as db from "@/lib/supabase";
import { sendMessage } from "@/lib/telegram";

const size = (sizeMl: 10 | 20 | 50, priceUsd: number) => ({ sizeMl, priceUsd });
const product = (id: string, name: string, available = true) => ({ id, name, sizes: [size(10, 12), size(20, 22)], available }) as never;

const pendingRow = (over: Partial<OrderRow> = {}): OrderRow => ({
  id: "11111111-1111-4111-8111-111111111111", status: "pending", order_number: null, claim_token: "tok", customer_name: "Sokha Chan",
  telegram: "12345678", fulfilment: "pickup", map_url: null, items: [{ productId: "a", name: "Jasmine Rain", sizeMl: 10, priceUsd: 12, qty: 2 }],
  subtotal_usd: 24, delivery_fee_usd: 0, total_usd: 24, khqr_md5: "m".repeat(32), khqr_tran_id: null, khqr_qr: "QR", khqr_deeplink: null,
  ip_hash: "h", expires_at: new Date(Date.now() + 5 * 60_000).toISOString(), last_checked_at: null, paid_at: null, admin_notified_at: null,
  created_at: new Date().toISOString(), ...over,
});
const paidRow = (over: Partial<OrderRow> = {}) => pendingRow({ status: "paid", order_number: 1042, paid_at: "2026-10-18T07:32:00Z", ...over });

beforeEach(() => {
  vi.resetAllMocks();
  process.env.TELEGRAM_ADMIN_CHAT_ID = "-100";
  vi.mocked(db.countRecentByIp).mockResolvedValue(0);
});

describe("createOrder", () => {
  const input = {
    lines: [{ productId: "a", sizeMl: 20 as const, qty: 2 }],
    details: { fulfilment: "delivery" as const, name: "Sokha", telegram: "12345678", mapUrl: "https://maps.app.goo.gl/x" },
  };
  beforeEach(() => {
    vi.mocked(getLiveProducts).mockResolvedValue([product("a", "Jasmine Rain")]);
    vi.mocked(generateQr).mockResolvedValue({ qr: "QRSTRING", md5: "a".repeat(32), tranId: "T1" });
    vi.mocked(generateDeeplink).mockResolvedValue("https://link.khqr.dev/x");
    vi.mocked(db.insertOrder).mockImplementation(async (o) => ({ ...pendingRow(), ...o }) as OrderRow);
  });

  it("prices from live data, adds the delivery fee and requests a QR for the total", async () => {
    await createOrder(input, "1.2.3.4");
    expect(generateQr).toHaveBeenCalledWith(46);
    const saved = vi.mocked(db.insertOrder).mock.calls[0][0];
    expect(saved).toMatchObject({ subtotal_usd: 44, delivery_fee_usd: 2, total_usd: 46, khqr_md5: "a".repeat(32), map_url: "https://maps.app.goo.gl/x", fulfilment: "delivery" });
    expect(saved.items).toEqual([{ productId: "a", name: "Jasmine Rain", sizeMl: 20, priceUsd: 22, qty: 2 }]);
    expect(saved.claim_token).toHaveLength(24);
    expect(Date.parse(saved.expires_at) - Date.now()).toBeGreaterThan(9 * 60_000);
  });
  it("still creates the order when the deep link fails", async () => {
    vi.mocked(generateDeeplink).mockResolvedValue(null);
    await createOrder(input, "1.2.3.4");
    expect(vi.mocked(db.insertOrder).mock.calls[0][0].khqr_deeplink).toBeNull();
  });
  it("names an out of stock item", async () => {
    vi.mocked(getLiveProducts).mockResolvedValue([product("a", "Orange Peel", false)]);
    await expect(createOrder(input, "ip")).rejects.toMatchObject({ code: "unavailable", message: expect.stringContaining("Orange Peel") });
    expect(generateQr).not.toHaveBeenCalled();
  });
  it("rejects a missing product or size", async () => {
    vi.mocked(getLiveProducts).mockResolvedValue([]);
    await expect(createOrder(input, "ip")).rejects.toBeInstanceOf(OrderError);
    vi.mocked(getLiveProducts).mockResolvedValue([product("a", "Jasmine Rain")]);
    await expect(createOrder({ ...input, lines: [{ productId: "a", sizeMl: 50, qty: 1 }] }, "ip")).rejects.toBeInstanceOf(OrderError);
  });
  it("rate limits five orders per ten minutes per IP", async () => {
    vi.mocked(db.countRecentByIp).mockResolvedValue(5);
    await expect(createOrder(input, "ip")).rejects.toMatchObject({ code: "rate_limited", status: 429 });
  });
});

describe("settleOrder", () => {
  const md5 = "m".repeat(32);
  beforeEach(() => {
    vi.mocked(db.getOrderByMd5).mockResolvedValue(pendingRow());
    vi.mocked(checkPaid).mockResolvedValue({ paid: true, amount: 24, currency: "USD" });
    vi.mocked(db.settleByMd5).mockResolvedValue(paidRow());
  });

  it("settles a paid order once and posts the admin message", async () => {
    expect(await settleOrder(md5)).toBe(true);
    expect(db.settleByMd5).toHaveBeenCalledWith(md5);
    expect(sendMessage).toHaveBeenCalledWith("-100", expect.stringContaining("New order SK-1042"));
    expect(db.markNotified).toHaveBeenCalledWith(paidRow().id);
  });
  it("does nothing when khqr.dev says unpaid", async () => {
    vi.mocked(checkPaid).mockResolvedValue({ paid: false });
    expect(await settleOrder(md5)).toBe(false);
    expect(db.settleByMd5).not.toHaveBeenCalled();
  });
  it("refuses a wrong amount or currency", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(checkPaid).mockResolvedValue({ paid: true, amount: 23, currency: "USD" });
    expect(await settleOrder(md5)).toBe(false);
    vi.mocked(checkPaid).mockResolvedValue({ paid: true, amount: 24, currency: "KHR" });
    expect(await settleOrder(md5)).toBe(false);
    expect(db.settleByMd5).not.toHaveBeenCalled();
    error.mockRestore();
  });
  it("accepts an amount within half a cent", async () => {
    vi.mocked(checkPaid).mockResolvedValue({ paid: true, amount: 24.004, currency: "USD" });
    expect(await settleOrder(md5)).toBe(true);
  });
  it("ignores unknown or already paid orders without calling khqr.dev", async () => {
    vi.mocked(db.getOrderByMd5).mockResolvedValue(null);
    expect(await settleOrder(md5)).toBe(false);
    vi.mocked(db.getOrderByMd5).mockResolvedValue(paidRow());
    expect(await settleOrder(md5)).toBe(false);
    expect(checkPaid).not.toHaveBeenCalled();
  });
  it("posts nothing when another caller won the race", async () => {
    vi.mocked(db.settleByMd5).mockResolvedValue(null);
    expect(await settleOrder(md5)).toBe(false);
    expect(sendMessage).not.toHaveBeenCalled();
  });
  it("leaves admin_notified_at empty when Telegram fails, so a retry can happen", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(sendMessage).mockRejectedValue(new Error("down"));
    expect(await settleOrder(md5)).toBe(true);
    expect(db.markNotified).not.toHaveBeenCalled();
    error.mockRestore();
  });
});

describe("notifyAdmin", () => {
  it("never throws", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(sendMessage).mockRejectedValue(new Error("down"));
    await expect(notifyAdmin(paidRow())).resolves.toBeUndefined();
    error.mockRestore();
  });
});

describe("getOrderView", () => {
  it("returns null for an unknown order", async () => {
    vi.mocked(db.getOrder).mockResolvedValue(null);
    expect(await getOrderView("x")).toBeNull();
  });
  it("shows the QR for a pending order and checks payment when not checked in the last 5 seconds", async () => {
    vi.mocked(db.getOrder).mockResolvedValue(pendingRow());
    vi.mocked(db.getOrderByMd5).mockResolvedValue(pendingRow());
    vi.mocked(checkPaid).mockResolvedValue({ paid: false });
    const view = await getOrderView("id");
    expect(view).toMatchObject({ state: "pending", qr: "QR", totalUsd: 24 });
    expect(db.touchChecked).toHaveBeenCalled();
    expect(checkPaid).toHaveBeenCalledTimes(1);
  });
  it("does not call khqr.dev when checked less than 5 seconds ago", async () => {
    vi.mocked(db.getOrder).mockResolvedValue(pendingRow({ last_checked_at: new Date(Date.now() - 1000).toISOString() }));
    await getOrderView("id");
    expect(checkPaid).not.toHaveBeenCalled();
  });
  it("reports expired when past expires_at and still unpaid", async () => {
    vi.mocked(db.getOrder).mockResolvedValue(pendingRow({ expires_at: new Date(Date.now() - 1000).toISOString() }));
    vi.mocked(db.getOrderByMd5).mockResolvedValue(pendingRow());
    vi.mocked(checkPaid).mockResolvedValue({ paid: false });
    expect(await getOrderView("id")).toEqual({ state: "expired", totalUsd: 24 });
  });
  it("settles during the poll and returns the paid view with no personal data", async () => {
    vi.mocked(db.getOrder).mockResolvedValueOnce(pendingRow()).mockResolvedValueOnce(paidRow({ admin_notified_at: "2026-10-18T07:33:00Z" }));
    vi.mocked(db.getOrderByMd5).mockResolvedValue(pendingRow());
    vi.mocked(checkPaid).mockResolvedValue({ paid: true, amount: 24, currency: "USD" });
    vi.mocked(db.settleByMd5).mockResolvedValue(paidRow());
    const view = await getOrderView("id");
    expect(view).toEqual({ state: "paid", orderNumber: "SK-1042", totalUsd: 24, fulfilment: "pickup", claimToken: "tok" });
    expect(JSON.stringify(view)).not.toMatch(/Sokha|12345678|Jasmine/);
  });
  it("retries an unsent admin message for a paid order", async () => {
    vi.mocked(db.getOrder).mockResolvedValue(paidRow());
    await getOrderView("id");
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });
});

describe("handleStart", () => {
  it("confirms a paid order to the chat that pressed start", async () => {
    vi.mocked(db.getOrderByClaimToken).mockResolvedValue(paidRow());
    await handleStart(4242, "tok");
    expect(sendMessage).toHaveBeenCalledWith(4242, expect.stringContaining("Order SK-1042 is confirmed"));
  });
  it("says the payment is not received yet for a pending order", async () => {
    vi.mocked(db.getOrderByClaimToken).mockResolvedValue(pendingRow());
    await handleStart(4242, "tok");
    expect(sendMessage).toHaveBeenCalledWith(4242, expect.stringContaining("not received this payment yet"));
  });
  it("sends a plain greeting for an unknown or missing token", async () => {
    vi.mocked(db.getOrderByClaimToken).mockResolvedValue(null);
    await handleStart(4242, "nope");
    await handleStart(4242, undefined);
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(vi.mocked(sendMessage).mock.calls[0][1]).toContain("Hello from SAKA Parfum");
  });
});

describe("runDaily", () => {
  it("pings, retries unsent messages, settles stale orders and cleans up", async () => {
    vi.mocked(db.unnotifiedPaid).mockResolvedValue([paidRow()]);
    vi.mocked(db.stalePending).mockResolvedValue([pendingRow()]);
    vi.mocked(db.getOrderByMd5).mockResolvedValue(pendingRow());
    vi.mocked(checkPaid).mockResolvedValue({ paid: true, amount: 24, currency: "USD" });
    vi.mocked(db.settleByMd5).mockResolvedValue(paidRow());
    vi.mocked(db.cleanup).mockResolvedValue({ deleted: 3, scrubbed: 1 });
    expect(await runDaily()).toEqual({ retried: 1, settled: 1, deleted: 3, scrubbed: 1 });
    expect(db.ping).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run tests/unit/orders.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 4: Write `src/lib/orders.ts`**

```ts
import { createHash, randomBytes } from "node:crypto";
import { checkPaid, generateDeeplink, generateQr } from "./khqr";
import { computeTotals, priceOf } from "./pricing";
import { getLiveProducts } from "./sanity";
import type { OrderInput } from "./schemas";
import * as db from "./supabase";
import type { OrderItem, OrderRow } from "./supabase";
import { formatAdminMessage, formatConfirmation, orderNumber, sendMessage } from "./telegram";

const QR_LIFETIME_MS = 10 * 60_000;
const CHECK_INTERVAL_MS = 5000;
const RATE_WINDOW_MS = 10 * 60_000;
const RATE_MAX = 5;

export class OrderError extends Error {
  constructor(readonly code: "unavailable" | "rate_limited", message: string, readonly status: number) {
    super(message);
  }
}

export type OrderView =
  | { state: "pending"; qr: string; deeplink: string | null; totalUsd: number; expiresAt: string }
  | { state: "expired"; totalUsd: number }
  | { state: "paid"; orderNumber: string; totalUsd: number; fulfilment: "pickup" | "delivery"; claimToken: string };

export async function createOrder({ lines, details }: OrderInput, ip: string) {
  const ipHash = createHash("sha256").update(ip + (process.env.CRON_SECRET ?? "")).digest("hex");
  if ((await db.countRecentByIp(ipHash, new Date(Date.now() - RATE_WINDOW_MS).toISOString())) >= RATE_MAX) {
    throw new OrderError("rate_limited", "Too many attempts. Please wait a few minutes and try again.", 429);
  }

  const products = await getLiveProducts([...new Set(lines.map((l) => l.productId))]);
  const items: OrderItem[] = lines.map((line) => {
    const product = products.find((p) => p.id === line.productId);
    const price = product && priceOf(product.sizes, line.sizeMl);
    if (!product || price === undefined) {
      throw new OrderError("unavailable", "An item in your cart is no longer sold. Please remove it to continue.", 409);
    }
    if (!product.available) {
      throw new OrderError("unavailable", `${product.name} is out of stock. Please remove it to continue.`, 409);
    }
    return { productId: product.id, name: product.name, sizeMl: line.sizeMl, priceUsd: price, qty: line.qty };
  });

  const { subtotalUsd, deliveryFeeUsd, totalUsd } = computeTotals(items, details.fulfilment);
  const qr = await generateQr(totalUsd);
  const order = await db.insertOrder({
    claim_token: randomBytes(18).toString("base64url"),
    customer_name: details.name,
    telegram: details.telegram,
    fulfilment: details.fulfilment,
    map_url: details.fulfilment === "delivery" ? details.mapUrl : null,
    items,
    subtotal_usd: subtotalUsd,
    delivery_fee_usd: deliveryFeeUsd,
    total_usd: totalUsd,
    khqr_md5: qr.md5,
    khqr_tran_id: qr.tranId,
    khqr_qr: qr.qr,
    khqr_deeplink: await generateDeeplink(qr.qr),
    ip_hash: ipHash,
    expires_at: new Date(Date.now() + QR_LIFETIME_MS).toISOString(),
  });
  return { orderId: order.id };
}

export async function notifyAdmin(order: OrderRow) {
  try {
    await sendMessage(process.env.TELEGRAM_ADMIN_CHAT_ID ?? "", formatAdminMessage(order));
    await db.markNotified(order.id);
  } catch (error) {
    console.error("Admin notification failed, will retry", error);
  }
}

/** The only path that marks an order paid. Safe to call from any number of callers at once. */
export async function settleOrder(md5: string) {
  const order = await db.getOrderByMd5(md5);
  if (!order || order.status !== "pending") return false;

  const payment = await checkPaid(md5);
  if (!payment.paid) return false;
  if (payment.currency !== "USD" || Math.abs(payment.amount - Number(order.total_usd)) > 0.005) {
    console.error(`Payment mismatch for order ${order.id}: got ${payment.amount} ${payment.currency}, expected ${order.total_usd} USD`);
    return false;
  }

  const settled = await db.settleByMd5(md5);
  if (!settled) return false;
  await notifyAdmin(settled);
  return true;
}

export async function getOrderView(id: string): Promise<OrderView | null> {
  let order = await db.getOrder(id);
  if (!order) return null;

  const dueForCheck = !order.last_checked_at || Date.now() - Date.parse(order.last_checked_at) > CHECK_INTERVAL_MS;
  if (order.status === "pending" && dueForCheck) {
    await db.touchChecked(order.id);
    if (await settleOrder(order.khqr_md5)) order = (await db.getOrder(id)) ?? order;
  }
  if (order.status === "paid" && !order.admin_notified_at) await notifyAdmin(order);

  const totalUsd = Number(order.total_usd);
  if (order.status === "paid") {
    return { state: "paid", orderNumber: orderNumber(order.order_number), totalUsd, fulfilment: order.fulfilment, claimToken: order.claim_token };
  }
  if (Date.parse(order.expires_at) <= Date.now()) return { state: "expired", totalUsd };
  return { state: "pending", qr: order.khqr_qr, deeplink: order.khqr_deeplink, totalUsd, expiresAt: order.expires_at };
}

/** Replies once to the chat that pressed Start. The chat id is never stored. */
export async function handleStart(chatId: number, token: string | undefined) {
  const order = token ? await db.getOrderByClaimToken(token) : null;
  const text = !order
    ? "Hello from SAKA Parfum. Pay on our site, then tap the Telegram button to get your confirmation here."
    : order.status === "paid"
      ? formatConfirmation(order)
      : "We have not received this payment yet. Please try again in a moment.";
  await sendMessage(chatId, text);
}

export async function runDaily() {
  await db.ping();
  const unsent = await db.unnotifiedPaid();
  await Promise.all(unsent.map(notifyAdmin));
  let settled = 0;
  for (const order of await db.stalePending()) {
    if (await settleOrder(order.khqr_md5)) settled += 1;
  }
  return { retried: unsent.length, settled, ...(await db.cleanup()) };
}
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npx vitest run tests/unit/orders.test.ts && npm run typecheck`
Expected: PASS (all). Fix the code, not the tests, if a test fails. If `vi.mock("@/lib/supabase")` automock has trouble with the `@supabase/supabase-js` import at module load, it does not: `createClient` is only called lazily inside `db()`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/orders.ts src/lib/sanity.ts tests/unit/orders.test.ts
git commit -m "feat: order creation, single settle path, status view, bot start and daily job"
```

---

### Task 6: Orders API routes

**Files:**
- Create: `src/app/api/orders/route.ts`, `src/app/api/orders/[id]/route.ts`

**Interfaces:**
- Consumes: `orderInputSchema`, `createOrder`, `OrderError`, `getOrderView`.
- Produces: `POST /api/orders` returns `{ orderId }` (200), `{ error, message }` with status 400, 409, 429 or 500. `GET /api/orders/[id]` returns an `OrderView` (200, `Cache-Control: no-store`) or 404.

- [ ] **Step 1: Write the create route**

`src/app/api/orders/route.ts`:

```ts
import { createOrder, OrderError } from "@/lib/orders";
import { orderInputSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const input = orderInputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return Response.json({ error: "invalid", message: "Please check your details and try again." }, { status: 400 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  try {
    return Response.json(await createOrder(input.data, ip));
  } catch (error) {
    if (error instanceof OrderError) {
      return Response.json({ error: error.code, message: error.message }, { status: error.status });
    }
    console.error("Could not create order", error);
    return Response.json({ error: "server", message: "We could not start your payment. Please try again." }, { status: 500 });
  }
}
```

- [ ] **Step 2: Write the status route**

`src/app/api/orders/[id]/route.ts`:

```ts
import { getOrderView } from "@/lib/orders";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = UUID.test(id) ? await getOrderView(id) : null;
  if (!view) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json(view, { headers: { "Cache-Control": "no-store" } });
}
```

- [ ] **Step 3: Typecheck and commit**

Run: `npm run typecheck && npm run check`
Expected: PASS.

```bash
git add src/app/api/orders
git commit -m "feat: create order and order status routes"
```

---

### Task 7: Webhook, Telegram bot route, daily cron

**Files:**
- Create: `src/app/api/khqr/webhook/route.ts`, `src/app/api/telegram/route.ts`, `src/app/api/cron/daily/route.ts`, `vercel.json`

**Interfaces:**
- Consumes: `settleOrder`, `handleStart`, `runDaily`.
- Produces: `POST /api/khqr/webhook`, `POST /api/telegram`, `GET /api/cron/daily`.

- [ ] **Step 1: Write the webhook route**

`src/app/api/khqr/webhook/route.ts`:

```ts
import { createHmac } from "node:crypto";
import { settleOrder } from "@/lib/orders";

const MD5 = /^[a-f0-9]{32}$/i;

/** Only a trigger. The payload is never trusted: settleOrder re-verifies with khqr.dev. */
export async function POST(request: Request) {
  const raw = await request.text();
  let md5 = "";
  try {
    md5 = String(JSON.parse(raw).md5 ?? "");
  } catch {
    // Not JSON. Nothing to do.
  }

  const secret = process.env.KHQR_WEBHOOK_SECRET;
  if (secret) {
    const expected = createHmac("sha256", secret).update(raw).digest("hex");
    if (request.headers.get("x-rbk-signature") !== expected) {
      console.warn("khqr webhook signature did not match. Not rejected until the scheme is confirmed in the khqr.dev portal.");
    }
  }

  if (MD5.test(md5)) await settleOrder(md5.toLowerCase());
  return new Response("ok");
}
```

- [ ] **Step 2: Write the Telegram bot route**

`src/app/api/telegram/route.ts`:

```ts
import { handleStart } from "@/lib/orders";

const START = /^\/start(?:@\w+)?(?:\s+(\S+))?/;

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const update = await request.json();
    const text: unknown = update?.message?.text;
    const chatId: unknown = update?.message?.chat?.id;
    const match = typeof text === "string" ? START.exec(text) : null;
    if (match && typeof chatId === "number") await handleStart(chatId, match[1]);
  } catch (error) {
    console.error("Telegram update failed", error);
  }
  return Response.json({ ok: true });
}
```

Always answer 200 after the secret check so Telegram does not retry a bad update forever.

- [ ] **Step 3: Write the cron route and `vercel.json`**

`src/app/api/cron/daily/route.ts`:

```ts
import { runDaily } from "@/lib/orders";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json(await runDaily());
}
```

`vercel.json`:

```json
{
  "crons": [{ "path": "/api/cron/daily", "schedule": "0 3 * * *" }]
}
```

Vercel sends `Authorization: Bearer $CRON_SECRET` automatically when the `CRON_SECRET` environment variable is set. Hobby allows one run per day.

- [ ] **Step 4: Typecheck and commit**

Run: `npm run typecheck && npm run check`
Expected: PASS.

```bash
git add src/app/api vercel.json
git commit -m "feat: khqr webhook trigger, telegram start handler and daily cron"
```

---

### Task 8: Checkout page, cart updates and resume link

**Files:**
- Create: `src/lib/checkout-client.ts`, `src/components/CheckoutForm.tsx`, `src/app/checkout/page.tsx`, `src/app/checkout/loading.tsx`
- Modify: `src/lib/cart.ts`, `src/components/CartMenu.tsx`

**Interfaces:**
- Consumes: `useCart`, `detailsSchema`, `Details`, `computeTotals`, `formatUsd`, `formatRiel`, `priceOf`, `CartCatalogItem`, `toCartCatalog`, `getCatalog`, `getSettings`, `DELIVERY_FEE_USD`.
- Produces:
  - `cart.ts`: `clearCart(): void`, `setActiveOrder(id: string | null): void`, `useActiveOrder(): string | null`. `useCart().clear` now equals `clearCart`.
  - `checkout-client.ts`: `type Draft = { fulfilment: "pickup" | "delivery"; name: string; telegram: string; mapUrl: string }`, `EMPTY_DRAFT`, `loadDraft(): Draft`, `saveDraft(d: Draft): void`, `submitOrder(lines: CartLine[], details: Details): Promise<{ orderId: string } | { message: string }>`.

- [ ] **Step 1: Run the design skill**

Invoke `ui-ux-pro-max:ui-ux-pro-max` for the checkout form (fields, segmented fulfilment control, inline errors, summary panel) and the cart drawer CHECKOUT button. The brand brief wins. Append notes to `docs/design-notes.md`.

- [ ] **Step 2: Extend `src/lib/cart.ts`**

Replace `clear: () => write([])` with `clear: clearCart`, add these exports, and widen the storage listener so other tabs update the active order too:

```ts
const ACTIVE_KEY = "saka.activeOrder";

export const clearCart = () => write([]);

export function setActiveOrder(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    // Storage can be blocked. The resume link is then unavailable, the URL still works.
  }
  listeners.forEach((notify) => notify());
}

export function useActiveOrder() {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(ACTIVE_KEY);
      } catch {
        return null;
      }
    },
    () => null,
  );
}
```

In `subscribe`, change the storage handler to:

```ts
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) lines = null;
    if (event.key === KEY || event.key === ACTIVE_KEY || event.key === null) notify();
  };
```

Run `npx vitest run tests/unit/cart.test.ts` (must still pass).

- [ ] **Step 3: Write `src/lib/checkout-client.ts`**

```ts
import { z } from "zod";
import type { CartLine, Details } from "./schemas";

const DRAFT_KEY = "saka.draft";

const draftSchema = z.object({
  fulfilment: z.enum(["pickup", "delivery"]).catch("pickup"),
  name: z.string().catch(""),
  telegram: z.string().catch(""),
  mapUrl: z.string().catch(""),
});

export type Draft = z.infer<typeof draftSchema>;
export const EMPTY_DRAFT: Draft = { fulfilment: "pickup", name: "", telegram: "", mapUrl: "" };

export function loadDraft(): Draft {
  try {
    const parsed = draftSchema.safeParse(JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null"));
    return parsed.success ? parsed.data : EMPTY_DRAFT;
  } catch {
    return EMPTY_DRAFT;
  }
}

export function saveDraft(draft: Draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // The form still works, it just will not be restored.
  }
}

export async function submitOrder(lines: CartLine[], details: Details): Promise<{ orderId: string } | { message: string }> {
  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lines, details }),
    });
    const body = await res.json();
    return res.ok ? { orderId: body.orderId } : { message: body.message ?? "We could not start your payment. Please try again." };
  } catch {
    return { message: "We could not reach the shop. Check your connection and try again." };
  }
}
```

- [ ] **Step 4: Write `src/components/CheckoutForm.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { setActiveOrder, useActiveOrder, useCart } from "@/lib/cart";
import { EMPTY_DRAFT, loadDraft, saveDraft, submitOrder, type Draft } from "@/lib/checkout-client";
import { computeTotals, DELIVERY_FEE_USD, formatRiel, formatUsd, priceOf } from "@/lib/pricing";
import type { CartCatalogItem } from "@/lib/sanity";
import { detailsSchema } from "@/lib/schemas";
import { AlertIcon } from "./Icons";

type Props = { catalog: CartCatalogItem[]; address: string };

const input = "min-h-11 w-full rounded-sm border border-border bg-surface px-3 focus:border-secondary";

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="eyebrow mb-2 block">{label}</label>
      {children}
      {error && (
        <p id={`${id}-error`} className="small mt-2 flex items-center gap-1 text-error">
          <AlertIcon width={18} height={18} />
          {error}
        </p>
      )}
    </div>
  );
}

export function CheckoutForm({ catalog, address }: Props) {
  const router = useRouter();
  const { lines } = useCart();
  const activeOrder = useActiveOrder();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [restored, setRestored] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(loadDraft());
    setRestored(true);
  }, []);
  useEffect(() => {
    if (restored) saveDraft(draft);
  }, [draft, restored]);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const delivery = draft.fulfilment === "delivery";

  const rows = (lines ?? []).map((line) => {
    const product = catalog.find((p) => p.id === line.productId);
    return { line, name: product?.name ?? "Unavailable item", price: product ? priceOf(product.sizes, line.sizeMl) : undefined };
  });
  const totals = computeTotals(rows.flatMap((r) => (r.price === undefined ? [] : [{ priceUsd: r.price, qty: r.line.qty }])), draft.fulfilment);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = detailsSchema.safeParse(draft);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setFormError("");
    setBusy(true);
    const result = await submitOrder(lines ?? [], parsed.data);
    if ("orderId" in result) {
      setActiveOrder(result.orderId);
      router.push(`/checkout/${result.orderId}`);
      return;
    }
    setBusy(false);
    setFormError(result.message);
  }

  const resume = activeOrder && (
    <Link href={`/checkout/${activeOrder}`} className="mb-8 flex items-center justify-between border border-border bg-surface px-4 py-3">
      <span>Continue your payment</span>
      <span className="eyebrow">Open</span>
    </Link>
  );

  if (lines !== null && lines.length === 0) {
    return (
      <div className="mx-auto mt-10 max-w-[62ch] text-center">
        {resume}
        <p className="text-muted">Your cart is empty. <Link href="/products" className="link text-text">See what is in store.</Link></p>
      </div>
    );
  }

  return (
    <div className="mt-10">
      {resume}
      <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          <Field id="name" label="Name" error={errors.name}>
            <input id="name" autoComplete="name" value={draft.name} onChange={(e) => set({ name: e.target.value })} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} className={input} />
          </Field>
          <Field id="telegram" label="Telegram number" error={errors.telegram}>
            <input id="telegram" type="tel" inputMode="tel" autoComplete="tel" value={draft.telegram} onChange={(e) => set({ telegram: e.target.value })} aria-invalid={!!errors.telegram} aria-describedby={errors.telegram ? "telegram-error" : undefined} className={input} />
          </Field>

          <fieldset>
            <legend className="eyebrow mb-2">Pickup or delivery</legend>
            <div className="grid grid-cols-2">
              {(["pickup", "delivery"] as const).map((value) => (
                <label key={value} className="block">
                  <input type="radio" name="fulfilment" value={value} checked={draft.fulfilment === value} onChange={() => set({ fulfilment: value })} className="peer sr-only" />
                  <span className="flex min-h-11 cursor-pointer items-center justify-center border border-border font-display text-xs font-medium uppercase tracking-[0.16em] peer-checked:border-btn peer-checked:bg-btn peer-checked:text-btn-text peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-secondary">
                    {value}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {delivery ? (
            <Field id="mapUrl" label="Google Maps link" error={errors.mapUrl}>
              <input id="mapUrl" type="url" inputMode="url" value={draft.mapUrl} onChange={(e) => set({ mapUrl: e.target.value })} placeholder="https://maps.app.goo.gl/..." aria-invalid={!!errors.mapUrl} aria-describedby={errors.mapUrl ? "mapUrl-error" : undefined} className={input} />
              <p className="small mt-2 text-muted">Share your location in Google Maps and paste the link. Delivery adds {formatUsd(DELIVERY_FEE_USD)} ({formatRiel(DELIVERY_FEE_USD)}).</p>
            </Field>
          ) : (
            <p className="small text-muted">Pick up in the shop, free of charge. {address}</p>
          )}

          <p className="small text-muted">We use your name and number only to prepare your order.</p>
          {formError && (
            <p role="alert" className="small flex items-center gap-1 text-error">
              <AlertIcon width={18} height={18} />
              {formError}
            </p>
          )}
          <button type="submit" disabled={busy || lines === null} className="btn btn-primary w-full lg:w-auto">
            {busy ? "Preparing your code" : "Pay with KHQR"}
          </button>
        </form>

        <aside aria-label="Order summary" className="h-fit border border-border bg-surface p-6">
          <h2 className="h3">Your order</h2>
          {lines === null ? (
            <div className="mt-6 space-y-3" aria-hidden="true">
              <div className="skeleton h-5 w-full" />
              <div className="skeleton h-5 w-4/5" />
              <div className="skeleton mt-6 h-6 w-1/2" />
            </div>
          ) : (
            <>
              <ul className="mt-6 space-y-3">
                {rows.map(({ line, name, price }) => (
                  <li key={`${line.productId}-${line.sizeMl}`} className="flex justify-between gap-4">
                    <span>{name}, {line.sizeMl}ml x{line.qty}</span>
                    <span>{price === undefined ? "Unavailable" : formatUsd(price * line.qty)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-6 space-y-2 border-t border-border pt-4">
                <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatUsd(totals.subtotalUsd)}</dd></div>
                <div className="flex justify-between"><dt>{delivery ? "Delivery" : "Pickup"}</dt><dd>{delivery ? formatUsd(totals.deliveryFeeUsd) : "Free"}</dd></div>
                <div className="flex justify-between font-medium"><dt>Total</dt><dd>{formatUsd(totals.totalUsd)}</dd></div>
                <div className="small flex justify-between text-muted"><dt>In Riel</dt><dd>{formatRiel(totals.totalUsd)}</dd></div>
              </dl>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Write the checkout route and its skeleton**

`src/app/checkout/page.tsx`:

```tsx
import { CheckoutForm } from "@/components/CheckoutForm";
import { getCatalog, getSettings, toCartCatalog } from "@/lib/sanity";

export const revalidate = 60;
export const metadata = { title: "Checkout | SAKA Parfum", robots: { index: false, follow: false } };

export default async function CheckoutPage() {
  const [products, settings] = await Promise.all([getCatalog().catch(() => []), getSettings()]);
  return (
    <section aria-labelledby="checkout-title" className="section">
      <div className="container">
        <p className="eyebrow text-center">Checkout</p>
        <h1 id="checkout-title" className="h2 mt-3 text-center">Your details</h1>
        <CheckoutForm catalog={toCartCatalog(products)} address={settings.address} />
      </div>
    </section>
  );
}
```

`src/app/checkout/loading.tsx`:

```tsx
export default function Loading() {
  return (
    <section className="section">
      <div className="container" aria-hidden="true">
        <div className="skeleton mx-auto h-4 w-24" />
        <div className="skeleton mx-auto mt-3 h-10 w-64" />
        <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <div className="skeleton h-11" />
            <div className="skeleton h-11" />
            <div className="skeleton h-11" />
            <div className="skeleton h-11 w-48" />
          </div>
          <div className="skeleton h-64" />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Add CHECKOUT and the resume row to the cart drawer**

In `src/components/CartMenu.tsx`: import `useActiveOrder` from `@/lib/cart`, call `const activeOrder = useActiveOrder();`, and immediately after the "Your cart" heading row render the resume link when present:

```tsx
{activeOrder && (
  <Link href={`/checkout/${activeOrder}`} onClick={() => setOpen(false)} className="mt-6 flex items-center justify-between border border-border bg-surface px-4 py-3">
    <span>Continue your payment</span>
    <span className="eyebrow">Open</span>
  </Link>
)}
```

Then, after the subtotal `div` inside the non-empty branch, add:

```tsx
<Link href="/checkout" onClick={() => setOpen(false)} className="btn btn-primary mt-8 w-full">Checkout</Link>
```

- [ ] **Step 7: Check it in the browser and commit**

Run: `npm run typecheck && npm test && npm run check && npm run dev`. With `.env.local` set, add a product to the cart, open the drawer, press CHECKOUT, submit an empty form (inline errors appear with icons and text), switch to delivery (map field and $2.00 note appear), reload (draft restored). Screenshot desktop and mobile and fix layout problems.

```bash
git add src docs
git commit -m "feat: checkout form with saved draft, order summary and cart resume link"
```

---

### Task 9: Payment screen with resume, QR, popup and expiry

**Files:**
- Create: `src/components/PaymentScreen.tsx`, `src/app/checkout/[orderId]/page.tsx`, `src/app/checkout/[orderId]/loading.tsx`
- Modify: `src/components/Skeletons.tsx`, `package.json` (dependency)

**Interfaces:**
- Consumes: `OrderView` type, `clearCart`, `setActiveOrder`, `useCart`, `loadDraft`, `submitOrder`, `detailsSchema`, `formatUsd`, `formatRiel`, `Modal`, icons, `gsap`.
- Produces: `PaymentSkeleton()` in `Skeletons.tsx`, `PaymentScreen({ orderId: string; botUsername: string })`.

- [ ] **Step 1: Install the QR encoder and confirm its API**

```bash
npm install uqr
node -e "import('uqr').then(m => console.log(Object.keys(m).join(', ')))"
```

Expected: the list includes `encode`. Check its signature in `node_modules/uqr/dist/index.d.ts`: `encode(data, { ecc, border })` should return an object with `size` and `data` (a `boolean[][]` of dark modules). If the shape differs, adapt the `Qr` component in Step 3. We render the matrix as a React SVG path and never inject HTML. It must run only inside the payment screen so the main bundle stays under budget.

- [ ] **Step 2: Add the skeleton and route files**

Append to `src/components/Skeletons.tsx`:

```tsx
export function PaymentSkeleton() {
  return (
    <section className="section">
      <div className="container max-w-[520px] text-center" role="status" aria-label="Loading your payment">
        <div className="skeleton mx-auto h-4 w-24" />
        <div className="skeleton mx-auto mt-3 h-8 w-48" />
        <div className="skeleton mx-auto mt-8 aspect-square w-full max-w-[320px]" />
        <div className="skeleton mx-auto mt-6 h-6 w-40" />
        <div className="skeleton mx-auto mt-2 h-4 w-32" />
        <div className="skeleton mx-auto mt-6 h-1 w-full max-w-[320px]" />
      </div>
    </section>
  );
}
```

`src/app/checkout/[orderId]/loading.tsx`:

```tsx
import { PaymentSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return <PaymentSkeleton />;
}
```

`src/app/checkout/[orderId]/page.tsx`:

```tsx
import { PaymentScreen } from "@/components/PaymentScreen";

export const metadata = { title: "Payment | SAKA Parfum", robots: { index: false, follow: false } };

export default async function PaymentPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <PaymentScreen orderId={orderId} botUsername={process.env.TELEGRAM_BOT_USERNAME ?? ""} />;
}
```

- [ ] **Step 3: Run the design skill, then write `PaymentScreen.tsx`**

Invoke `ui-ux-pro-max:ui-ux-pro-max` for the payment screen (QR presentation on a cream tile, amount, countdown bar, mobile deep link button, paid state, popup). Check the QR styling rule (spec assumption 8): QR in #171A12 on #FAF6EE. Append notes to `docs/design-notes.md`.

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { encode } from "uqr";
import { clearCart, setActiveOrder, useCart } from "@/lib/cart";
import { loadDraft, submitOrder } from "@/lib/checkout-client";
import type { OrderView } from "@/lib/orders";
import { formatRiel, formatUsd } from "@/lib/pricing";
import { detailsSchema } from "@/lib/schemas";
import { CheckIcon } from "./Icons";
import { Modal } from "./Modal";
import { PaymentSkeleton } from "./Skeletons";

type Loaded = OrderView | { state: "missing" };
const QR_LIFETIME_MS = 10 * 60_000;

function useOrderView(orderId: string) {
  const [view, setView] = useState<Loaded | null>(null);
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    setView(null);
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
        if (!live) return;
        if (res.status === 404) return setView({ state: "missing" });
        if (!res.ok) throw new Error("status failed");
        const next = (await res.json()) as OrderView;
        setView(next);
        if (next.state !== "pending") return;
      } catch {
        // Network trouble: keep the last screen and try again.
      }
      timer = setTimeout(tick, 3000);
    };
    const onVisible = () => {
      if (document.hidden) return;
      clearTimeout(timer);
      void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    void tick();
    return () => {
      live = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [orderId, nonce]);

  return { view, refresh };
}

function Qr({ value, label }: { value: string; label: string }) {
  const { data, size } = encode(value, { ecc: "M", border: 2 });
  const path = data.flatMap((row, y) => row.flatMap((dark, x) => (dark ? [`M${x} ${y}h1v1h-1z`] : []))).join("");
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" className="block h-auto w-full">
      <rect width={size} height={size} fill="#FAF6EE" />
      <path d={path} fill="#171A12" />
    </svg>
  );
}

function Countdown({ expiresAt, onDone }: { expiresAt: string; onDone: () => void }) {
  const remaining = () => Math.max(0, Date.parse(expiresAt) - Date.now());
  const [left, setLeft] = useState(remaining);
  useEffect(() => {
    const id = setInterval(() => {
      const ms = remaining();
      setLeft(ms);
      if (ms === 0) {
        clearInterval(id);
        onDone();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onDone]);
  const seconds = Math.ceil(left / 1000);
  return (
    <div className="mx-auto mt-6 max-w-[320px]">
      <div className="h-1 bg-border" aria-hidden="true">
        <div className="h-full bg-secondary transition-[width] duration-1000 ease-linear" style={{ width: `${(left / QR_LIFETIME_MS) * 100}%` }} />
      </div>
      <p className="small mt-2 text-muted">Code valid for {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</p>
    </div>
  );
}

export function PaymentScreen({ orderId, botUsername }: { orderId: string; botUsername: string }) {
  const router = useRouter();
  const { lines } = useCart();
  const { view, refresh } = useOrderView(orderId);
  const [dismissed, setDismissed] = useState(false);
  const [retryError, setRetryError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (view?.state === "paid") {
      clearCart();
      setActiveOrder(null);
    }
  }, [view?.state]);

  async function newCode() {
    const details = detailsSchema.safeParse(loadDraft());
    if (!lines?.length || !details.success) return router.push("/checkout");
    setBusy(true);
    setRetryError("");
    const result = await submitOrder(lines, details.data);
    if ("orderId" in result) {
      setActiveOrder(result.orderId);
      setBusy(false);
      return router.push(`/checkout/${result.orderId}`);
    }
    setBusy(false);
    setRetryError(result.message);
  }

  if (view === null) return <PaymentSkeleton />;

  if (view.state === "missing") {
    return (
      <section className="section">
        <div className="container max-w-[520px] text-center">
          <h1 className="h2">We could not find this order.</h1>
          <Link href="/" className="btn btn-primary mt-8">Back home</Link>
        </div>
      </section>
    );
  }

  if (view.state === "expired") {
    return (
      <section className="section">
        <div className="container max-w-[520px] text-center">
          <p className="eyebrow">Payment</p>
          <h1 className="h2 mt-3">This code has expired.</h1>
          <p className="mt-4 text-muted">Your cart is saved.</p>
          <button type="button" onClick={newCode} disabled={busy} className="btn btn-primary mt-8">
            {busy ? "Preparing your code" : lines?.length ? "Create a new code" : "Back to checkout"}
          </button>
          {retryError && <p role="alert" className="small mt-4 text-error">{retryError}</p>}
        </div>
      </section>
    );
  }

  if (view.state === "paid") {
    const telegramUrl = `https://t.me/${botUsername}?start=${view.claimToken}`;
    return (
      <section className="section">
        <div className="container max-w-[520px] text-center">
          <CheckIcon className="mx-auto text-success" width={32} height={32} />
          <p className="eyebrow mt-4">Payment received</p>
          <h1 className="h2 mt-3">Order {view.orderNumber}</h1>
          <p className="mt-4 text-muted">Thank you. We are preparing your order. Total {formatUsd(view.totalUsd)}, {view.fulfilment}.</p>
          <div className="mt-8 flex flex-col items-center gap-4">
            <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">Get confirmation on Telegram</a>
            <Link href="/products" className="link">Continue browsing</Link>
          </div>
        </div>
        <Modal open={!dismissed} onClose={() => setDismissed(true)} label="Telegram confirmation" from="fade">
          <div className="p-6 text-center">
            <h2 className="h3">Your order is paid</h2>
            <p className="mt-3 text-muted">Get your confirmation on Telegram.</p>
            <a href={telegramUrl} target="_blank" rel="noopener noreferrer" onClick={() => setDismissed(true)} className="btn btn-primary mt-6 w-full">Open Telegram</a>
            <button type="button" onClick={() => setDismissed(true)} className="link mt-4 inline-block">No thanks</button>
          </div>
        </Modal>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container max-w-[520px] text-center">
        <p className="eyebrow">Pay with KHQR</p>
        <h1 className="h2 mt-3">{formatUsd(view.totalUsd)}</h1>
        <p className="small mt-1 text-muted">{formatRiel(view.totalUsd)}</p>
        <div className="mx-auto mt-8 w-full max-w-[320px] border border-border bg-bg p-3">
          <Qr value={view.qr} label={`KHQR code for ${formatUsd(view.totalUsd)}`} />
        </div>
        {view.deeplink && (
          <a href={view.deeplink} className="btn btn-primary mt-6 md:hidden">Open banking app</a>
        )}
        <Countdown expiresAt={view.expiresAt} onDone={refresh} />
        <p aria-live="polite" className="mt-4 text-muted">Waiting for payment</p>
        <p className="small mt-6 text-muted">Scan with any Bakong banking app. You can leave this page to pay and come back.</p>
      </div>
    </section>
  );
}
```

The QR is a dark-on-cream SVG in palette colors (spec assumption 8). Dark mode keeps it dark on cream so it scans.

- [ ] **Step 4: Typecheck, run, and look at it**

Run: `npm run typecheck && npm run check && npm run dev`. With the real Supabase and the mock services not yet wired, create an order through the form only after Task 10 provides mocks, or set `KHQR_TOKEN` to a real store token and use a tiny amount. Screenshot `/checkout/<id>` at 390px and 1280px: the QR must be large, high contrast, never cropped, and the page must not scroll horizontally.

- [ ] **Step 5: Commit**

```bash
git add src package.json package-lock.json docs
git commit -m "feat: resumable payment screen with KHQR, countdown, expiry and Telegram popup"
```

---

### Task 10: Mock services and end-to-end payment flows

**Files:**
- Modify: `tests/mock-server.mjs`, `tests/e2e-server.mjs`, `playwright.config.ts`
- Create: `tests/e2e/helpers.ts`, `tests/e2e/checkout.spec.ts`

**Interfaces:**
- Produces: mock routes `POST /v1/generate_qr`, `POST /v1/generate_deeplink_by_qr`, `POST /v1/check_transaction_by_md5` (bearer `test-khqr-token`), `POST /bot<token>/sendMessage`, control routes `POST /__mock/reset`, `POST /__mock/pay` (body `{ amount? }`, pays the last QR and returns `{ md5 }`), `GET /__mock/messages`, `POST /__mock/stock` (body `{ id, available }`). Sanity query with `$ids` filters the catalog.

- [ ] **Step 1: Extend the mock server**

Replace the request handler in `tests/mock-server.mjs` with the version below (keep the `load` helper and `state`, add arrays):

```js
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const load = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"));
const fresh = () => ({ catalog: load("catalog"), settings: load("settings"), khqr: [], telegram: [] });

export const state = fresh();

const readJson = (req) =>
  new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => resolve(raw ? JSON.parse(raw) : {}));
  });

export function startMock(port = 4010) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const send = (code, body) => {
      res.writeHead(code, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };

    if (url.pathname.includes("/data/query/")) {
      const query = url.searchParams.get("query") ?? "";
      if (query.includes("siteSettings")) return send(200, { result: state.settings });
      const ids = url.searchParams.get("$ids");
      const result = ids ? state.catalog.filter((p) => JSON.parse(ids).includes(p.id)) : state.catalog;
      return send(200, { result });
    }

    if (url.pathname.startsWith("/v1/")) {
      if (req.headers.authorization !== "Bearer test-khqr-token") return send(401, { responseCode: 1, errorCode: 6 });
      const body = await readJson(req);
      if (url.pathname === "/v1/generate_qr") {
        const qr = `00020101021229MOCKQR${state.khqr.length}A${body.amount}`;
        const md5 = createHash("md5").update(qr).digest("hex");
        state.khqr.push({ md5, amount: body.amount, paid: false });
        return send(200, { responseCode: 0, data: { qr, md5, tran_id: `T${state.khqr.length}`, checkout_url: "https://checkout.mock/x" } });
      }
      if (url.pathname === "/v1/generate_deeplink_by_qr") {
        return send(200, { responseCode: 0, data: { shortLink: "https://link.khqr.dev/mock" } });
      }
      if (url.pathname === "/v1/check_transaction_by_md5") {
        const entry = state.khqr.find((e) => e.md5 === body.md5);
        if (!entry?.paid) return send(404, { responseCode: 1, errorCode: 1, responseMessage: "Transaction could not be found." });
        return send(200, { responseCode: 0, data: { amount: entry.paidAmount ?? entry.amount, currency: "USD", tran_id: "T" } });
      }
    }

    if (/^\/bot[^/]+\/sendMessage$/.test(url.pathname)) {
      state.telegram.push(await readJson(req));
      return send(200, { ok: true, result: {} });
    }

    if (url.pathname === "/__mock/reset") return Object.assign(state, fresh()), send(200, {});
    if (url.pathname === "/__mock/messages") return send(200, state.telegram);
    if (url.pathname === "/__mock/pay") {
      const body = await readJson(req);
      const entry = state.khqr.at(-1);
      entry.paid = true;
      if (body.amount) entry.paidAmount = body.amount;
      return send(200, { md5: entry.md5 });
    }
    if (url.pathname === "/__mock/stock") {
      const { id, available } = await readJson(req);
      state.catalog.find((p) => p.id === id).available = available;
      return send(200, {});
    }
    send(404, { error: "not found" });
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}
```

In `tests/e2e-server.mjs` add `process.loadEnvFile(".env.test")` inside a try block before building `env`, and extend `env` with:

```js
  KHQR_API_BASE: "http://127.0.0.1:4010",
  KHQR_TOKEN: "test-khqr-token",
  TELEGRAM_API_BASE: "http://127.0.0.1:4010",
  TELEGRAM_BOT_TOKEN: "123:test",
  TELEGRAM_BOT_USERNAME: "saka_test_bot",
  TELEGRAM_ADMIN_CHAT_ID: "-1001",
  TELEGRAM_WEBHOOK_SECRET: "test-tg-secret",
  CRON_SECRET: "test-cron-secret",
```

In `playwright.config.ts` add at the top `try { process.loadEnvFile(".env.test"); } catch {}`, set `fullyParallel: false`, `workers: 1`, and `expect: { timeout: 15_000 }`.

- [ ] **Step 2: Write the helpers**

`tests/e2e/helpers.ts`:

```ts
import { expect, type Page } from "@playwright/test";

const MOCK = "http://127.0.0.1:4010";
const sb = () => ({
  url: process.env.SUPABASE_URL ?? "",
  headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`, "content-type": "application/json" },
});

const post = (path: string, body: unknown = {}) => fetch(`${MOCK}${path}`, { method: "POST", body: JSON.stringify(body) });

export const mock = {
  reset: () => post("/__mock/reset"),
  pay: async (amount?: number) => (await (await post("/__mock/pay", { amount })).json()) as { md5: string },
  stock: (id: string, available: boolean) => post("/__mock/stock", { id, available }),
  messages: async () => (await (await fetch(`${MOCK}/__mock/messages`)).json()) as { chat_id: number | string; text: string }[],
};

export async function resetAll() {
  await mock.reset();
  const { url, headers } = sb();
  await fetch(`${url}/rest/v1/orders?id=not.is.null`, { method: "DELETE", headers });
}

export async function expireOrders() {
  const { url, headers } = sb();
  await fetch(`${url}/rest/v1/orders?id=not.is.null`, { method: "PATCH", headers, body: JSON.stringify({ expires_at: new Date(Date.now() - 60_000).toISOString() }) });
}

export async function addFirstProduct(page: Page) {
  await page.goto("/products");
  await page.locator("article").first().getByRole("button").first().click();
  await page.getByRole("button", { name: "Add to cart" }).first().click();
}

export async function fillDetails(page: Page, fulfilment: "pickup" | "delivery", mapUrl = "https://maps.app.goo.gl/abc123") {
  await page.getByLabel("Name").fill("Sokha Chan");
  await page.getByLabel("Telegram number").fill("+855 12 345 678");
  if (fulfilment === "delivery") {
    await page.getByText("delivery", { exact: true }).click();
    await page.getByLabel("Google Maps link").fill(mapUrl);
  }
}

export async function reachPayment(page: Page, fulfilment: "pickup" | "delivery") {
  await addFirstProduct(page);
  await page.goto("/checkout");
  await fillDetails(page, fulfilment);
  await page.getByRole("button", { name: "Pay with KHQR" }).click();
  await expect(page.getByRole("img", { name: /KHQR code/ })).toBeVisible();
}

/** Pays at the mock bank, then pokes the webhook like khqr.dev would. */
export async function payAndTrigger(page: Page, amount?: number) {
  const { md5 } = await mock.pay(amount);
  await page.request.post("/api/khqr/webhook", { data: { md5 } });
}
```

- [ ] **Step 3: Write the specs**

`tests/e2e/checkout.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { addFirstProduct, expireOrders, fillDetails, mock, payAndTrigger, reachPayment, resetAll } from "./helpers";

test.skip(({ isMobile }) => isMobile, "Payment flows run once, on desktop");
test.beforeEach(resetAll);

test("pickup: pay, see the order number, admin gets one message, customer confirms on Telegram", async ({ page, request }) => {
  await reachPayment(page, "pickup");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("$12.00");
  await payAndTrigger(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Order SK-\d+/);

  const admin = (await mock.messages()).filter((m) => m.chat_id === "-1001");
  expect(admin).toHaveLength(1);
  expect(admin[0].text).toContain("Fulfilment: Pickup");
  expect(admin[0].text).toContain("Jasmine Rain, 10ml x1  $12.00");
  expect(admin[0].text).not.toContain("Map:");

  await expect(page.getByRole("dialog", { name: "Telegram confirmation" })).toBeVisible();
  const href = await page.getByRole("link", { name: "Open Telegram" }).getAttribute("href");
  expect(href).toMatch(/^https:\/\/t\.me\/saka_test_bot\?start=[\w-]{24}$/);
  await page.getByRole("button", { name: "No thanks" }).click();

  await page.goto("/checkout");
  await expect(page.getByText("Your cart is empty.")).toBeVisible();

  const token = href!.split("start=")[1];
  await request.post("/api/telegram", {
    headers: { "x-telegram-bot-api-secret-token": "test-tg-secret" },
    data: { message: { text: `/start ${token}`, chat: { id: 4242 } } },
  });
  const reply = (await mock.messages()).find((m) => m.chat_id === 4242);
  expect(reply?.text).toMatch(/Thank you, Sokha\. Order SK-\d+ is confirmed\. Total \$12\.00, pickup\./);
});

test("delivery: needs a Google Maps link, adds $2.00 and sends the map to admin", async ({ page }) => {
  await addFirstProduct(page);
  await page.goto("/checkout");
  await fillDetails(page, "delivery", "https://example.com/not-maps");
  await page.getByRole("button", { name: "Pay with KHQR" }).click();
  await expect(page.getByText("Paste a Google Maps link.")).toBeVisible();
  await expect(page.getByText("$14.00").first()).toBeVisible();

  await page.getByLabel("Google Maps link").fill("https://maps.app.goo.gl/abc123");
  await page.getByRole("button", { name: "Pay with KHQR" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("$14.00");
  await payAndTrigger(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Order SK-/);
  const [admin] = (await mock.messages()).filter((m) => m.chat_id === "-1001");
  expect(admin.text).toContain("Map: https://maps.app.goo.gl/abc123");
  expect(admin.text).toContain("Delivery  $2.00");
  expect(admin.text).toContain("(56,000 KHR)");
});

test("resume: leaving and returning, or reloading, restores the payment screen and then the paid state", async ({ page }) => {
  await reachPayment(page, "pickup");
  const paymentUrl = page.url();

  await page.goto("/products");
  await page.goto("/checkout");
  await page.getByRole("link", { name: /Continue your payment/ }).click();
  await expect(page).toHaveURL(paymentUrl);
  await expect(page.getByRole("img", { name: /KHQR code/ })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("img", { name: /KHQR code/ })).toBeVisible();

  await payAndTrigger(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Order SK-/);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Order SK-/);
  await expect(page.getByRole("dialog", { name: "Telegram confirmation" })).toBeVisible();
});

test("polling alone settles an order when the webhook never arrives", async ({ page }) => {
  await reachPayment(page, "pickup");
  await mock.pay();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Order SK-/, { timeout: 20_000 });
});

test("a payment of the wrong amount does not settle the order", async ({ page }) => {
  await reachPayment(page, "pickup");
  await payAndTrigger(page, 1);
  await page.waitForTimeout(7000);
  await expect(page.getByRole("img", { name: /KHQR code/ })).toBeVisible();
  expect((await mock.messages()).filter((m) => m.chat_id === "-1001")).toHaveLength(0);
});

test("an expired code offers a fresh one and keeps the cart", async ({ page }) => {
  await reachPayment(page, "pickup");
  const first = page.url();
  await expireOrders();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This code has expired.");
  await page.getByRole("button", { name: "Create a new code" }).click();
  await expect(page.getByRole("img", { name: /KHQR code/ })).toBeVisible();
  expect(page.url()).not.toBe(first);
});

test("checkout re-checks live stock and names the item", async ({ page }) => {
  await addFirstProduct(page);
  await mock.stock("p-jasmine", false);
  await page.goto("/checkout");
  await fillDetails(page, "pickup");
  await page.getByRole("button", { name: "Pay with KHQR" }).click();
  await expect(page.getByRole("alert")).toContainText("Jasmine Rain is out of stock");
});

test("the status route hides personal data and unknown orders are not found", async ({ page, request }) => {
  await reachPayment(page, "pickup");
  const id = page.url().split("/").pop();
  const body = await (await request.get(`/api/orders/${id}`)).text();
  expect(body).not.toMatch(/Sokha|345 678|Jasmine/);
  expect((await request.get("/api/orders/00000000-0000-4000-8000-000000000000")).status()).toBe(404);
  await page.goto("/checkout/00000000-0000-4000-8000-000000000000");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("We could not find this order.");
});

test("the Telegram route and the cron route reject missing secrets", async ({ request }) => {
  expect((await request.post("/api/telegram", { data: {} })).status()).toBe(401);
  expect((await request.get("/api/cron/daily")).status()).toBe(401);
  const ok = await request.get("/api/cron/daily", { headers: { authorization: "Bearer test-cron-secret" } });
  expect(ok.status()).toBe(200);
});
```

- [ ] **Step 4: Run and fix**

Run: `npm run test:e2e` (the database from Task 1 must be running; for local Supabase run `npx supabase start` first and copy its URL and service role key into `.env.test`).
Expected: all pass on desktop, payment specs skipped on mobile. Failures are real bugs: fix the code. Likely suspects: the 5 second check throttle making a poll miss a payment (the specs allow 20 seconds), `encode` return shape, the mobile `Open banking app` button, delivery radio label text matching.

- [ ] **Step 5: Commit**

```bash
git add tests playwright.config.ts
git commit -m "test: mock khqr.dev and Telegram, end-to-end checkout, resume, expiry and stock flows"
```

---

### Task 11: README, deployment steps and Pass 2 verification

**Files:**
- Create: `README.md`
- Modify: spec file (record the plan's deviations)

- [ ] **Step 1: Write `README.md`**

Write real, complete setup instructions (no placeholders, no em dashes, no exclamation marks) covering:

1. Run locally: `npm install`, `cp .env.example .env.local`, fill values, `npm run dev`. Tests: `npm test`, `npm run test:e2e` (needs `.env.test`).
2. Sanity: create the project, `SANITY_PROJECT_ID`, `npx sanity deploy`, seed with `node --env-file=.env.local scripts/seed-sanity.mjs` (needs `SANITY_WRITE_TOKEN`), add the webhook to `https://<site>/api/revalidate?secret=<SANITY_REVALIDATE_SECRET>`. Staff edit stock by switching Available on a perfume and updating "Stock last checked" in Store settings.
3. Supabase: create a Hobby project, apply `supabase/migrations`, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on Vercel. Local: `npx supabase start`.
4. Telegram: create the bot with BotFather (`/newbot`), set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME`. Create the admin group, add the bot, send a message, read the group id (a negative number) from `https://api.telegram.org/bot<token>/getUpdates`, set `TELEGRAM_ADMIN_CHAT_ID`. Choose `TELEGRAM_WEBHOOK_SECRET` (letters, digits, underscore, hyphen). Register after deploy: `curl "https://api.telegram.org/bot<token>/setWebhook" -d "url=https://<site>/api/telegram" -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"`.
5. khqr.dev: create a store in the developer portal, copy the `rbk_token` to `KHQR_TOKEN`, check the store currency is USD (the app compares USD amounts), set the webhook URL to `https://<site>/api/khqr/webhook`, and note the signature scheme if the portal documents it (then enable strict checking in `src/app/api/khqr/webhook/route.ts`). Verify the real site domain in the portal.
6. Vercel: import the GitHub repo, add every variable from `.env.example`, set `CRON_SECRET` to a long random string, deploy. The cron in `vercel.json` runs daily at 03:00 UTC.
7. Prelaunch manual test: one real KHQR payment of the smallest amount, confirm the admin group message, then press the Telegram button on a phone and confirm the reply.
8. Operations: Supabase Hobby pauses after a week of no activity, the daily cron keeps it awake. Paid customer fields are cleared after 90 days, unpaid orders deleted after 24 hours.

- [ ] **Step 2: Confirm the spec matches the decisions in this plan**

These edits were already applied to `docs/superpowers/specs/2026-10-18-saka-parfum-design.md` when the plans were written. Verify with `git grep -n "setof orders\|no scanned signal\|after the QR has expired" docs/superpowers/specs` (three hits expected). If an implementation choice changed while building, update the spec in the same commit.

- [ ] **Step 3: Run every gate**

```bash
npm run typecheck && npm test && npm run check && npm run build && npm run test:e2e
```

Expected: PASS. Report real output.

- [ ] **Step 4: Security review before real money**

Check and record: no secret in the repo (`git grep -nE "service_role|rbk_|[0-9]{8,}:AA"`), `settle_order` not callable by anon (Supabase advisors clean), the webhook cannot trigger khqr.dev calls for unknown md5 (confirmed by `settleOrder` returning before `checkPaid`), the status JSON has no personal data (e2e test), admin text escaped (unit test), rate limit works (create 6 orders from one IP in a loop against the dev server and see 429 on the sixth).

- [ ] **Step 5: Commit, push, request review**

```bash
git add -A
git commit -m "docs: setup guide, spec updates and pass 2 verification"
git push
```

Invoke `superpowers:requesting-code-review`. Wait for approval before Pass 3 (`2026-10-18-saka-parfum-03-finder-seo-quality.md`).
