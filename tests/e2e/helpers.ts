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
