import { expect, type Page } from "@playwright/test";
import { CATALOG, OUT_OF_STOCK, seedCatalog } from "../seed";

const MOCK = "http://127.0.0.1:4010";
const SB_URL = process.env.SUPABASE_URL || MOCK;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "mock";
const sbHeaders = { apikey: SB_KEY, authorization: `Bearer ${SB_KEY}`, "content-type": "application/json" };

const byslug = (slug: string) => {
  const product = CATALOG.products.find((p) => p.slug === slug);
  if (!product) throw new Error(`unknown slug ${slug}`);
  return { slug, name: product.name };
};
export const FIRST = byslug(CATALOG.products[0].slug);
export const SOLD_OUT = byslug(OUT_OF_STOCK);

const post = (path: string, body: unknown = {}) => fetch(`${MOCK}${path}`, { method: "POST", body: JSON.stringify(body) });

export const mock = {
  reset: () => post("/__mock/reset"),
  pay: async (amount?: number) => (await (await post("/__mock/pay", { amount })).json()) as { md5: string },
  messages: async () => (await (await fetch(`${MOCK}/__mock/messages`)).json()) as { chat_id: number | string; text: string }[],
};

/** Changes live data only. Cached pages keep their old copy until an admin save or the revalidate window. */
export const setAvailable = (slug: string, available: boolean) =>
  fetch(`${SB_URL}/rest/v1/products?slug=eq.${slug}`, { method: "PATCH", headers: sbHeaders, body: JSON.stringify({ available }) });

export async function resetAll() {
  await mock.reset();
  await seedCatalog(SB_URL, SB_KEY);
  await fetch(`${SB_URL}/rest/v1/orders?id=not.is.null`, { method: "DELETE", headers: sbHeaders });
}

/** Paid orders straight into the database, with the columns the real schema requires filled in. */
export async function insertPaidOrders(orders: Record<string, unknown>[]) {
  const rows = orders.map((order, i) => ({ status: "paid", claim_token: `claim-${i}`, khqr_md5: `md5-${i}`, khqr_qr: "QR", expires_at: new Date().toISOString(), ...order }));
  const res = await fetch(`${SB_URL}/rest/v1/orders`, { method: "POST", headers: sbHeaders, body: JSON.stringify(rows) });
  if (!res.ok) throw new Error(`insert orders failed: ${res.status} ${await res.text()}`);
}

export async function expireOrders() {
  await fetch(`${SB_URL}/rest/v1/orders?id=not.is.null`, { method: "PATCH", headers: sbHeaders, body: JSON.stringify({ expires_at: new Date(Date.now() - 60_000).toISOString() }) });
}

export async function addFirstProduct(page: Page) {
  await page.goto(`/products?scent=${FIRST.slug}`);
  const dialog = page.getByRole("dialog", { name: FIRST.name });
  await dialog.getByRole("button", { name: /^Add to cart/ }).click();
  await expect(dialog.getByRole("status")).toHaveText("Added. View cart");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
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
  await page.getByRole("button", { name: /^Pay \$[\d.]+ with KHQR$/ }).click();
  await expect(page.getByRole("img", { name: /KHQR code/ })).toBeVisible();
}

/** Pays at the mock bank, then pokes the webhook like khqr.dev would. */
export async function payAndTrigger(page: Page, amount?: number) {
  const { md5 } = await mock.pay(amount);
  await page.request.post("/api/khqr/webhook", { data: { md5 } });
}

export async function signIn(page: Page, password = "test-admin-password") {
  await page.goto("/admin/login");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}
