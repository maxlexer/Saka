import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { addFirstProduct, expireOrders, fillDetails, FIRST, mock, payAndTrigger, reachPayment, resetAll, setAvailable } from "./helpers";

test.skip(({ isMobile }) => isMobile, "Payment flows run once, on desktop");
test.skip(!process.env.SUPABASE_URL, "Needs a Supabase database in .env.test, see README");
test.beforeEach(resetAll);

test("pickup: pay, see the order number, admin gets one message, customer can join the group", async ({ page, request }) => {
  await reachPayment(page, "pickup");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pay $12.00");
  await payAndTrigger(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Order SK-\d+/);

  const admin = (await mock.messages()).filter((m) => m.chat_id === "-1001");
  expect(admin).toHaveLength(1);
  expect(admin[0].text).toContain("Fulfilment: Pickup");
  expect(admin[0].text).toContain(`${FIRST.name}, 10ml x1  $12.00`);
  expect(admin[0].text).not.toContain("Map:");

  await expect(page.getByRole("heading", { name: "Pick up in the shop" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Join the group" })).toHaveAttribute("href", /^https:\/\/t\.me\//);

  await page.goto("/checkout");
  await expect(page.getByText("Your cart is empty.")).toBeVisible();
});

test("/revenue answers in the admin group only, with orders, bottles and revenue", async ({ page, request }) => {
  await reachPayment(page, "pickup");
  await payAndTrigger(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Order SK-\d+/);

  const ask = (chatId: number, text = "/revenue") =>
    request.post("/api/telegram", { headers: { "x-telegram-bot-api-secret-token": "test-tg-secret" }, data: { message: { text, chat: { id: chatId } } } });
  await ask(-1001);
  await ask(4242);
  const replies = (await mock.messages()).filter((m) => typeof m.chat_id === "number");
  expect(replies).toHaveLength(1);
  expect(replies[0].chat_id).toBe(-1001);
  expect(replies[0].text).toContain("Orders: 1");
  expect(replies[0].text).toContain("Bottles: 1");
  expect(replies[0].text).toContain("Revenue: $12.00");
});

test("delivery: needs a Google Maps link, adds $2.00 and sends the map to admin", async ({ page }) => {
  await addFirstProduct(page);
  await page.goto("/checkout");
  await fillDetails(page, "delivery", "https://example.com/not-maps");
  await page.getByRole("button", { name: /^Pay \$[\d.]+ with KHQR$/ }).click();
  await expect(page.getByText("Paste a Google Maps link.")).toBeVisible();
  await expect(page.getByText("$14.00").first()).toBeVisible();

  await page.getByLabel("Google Maps link").fill("https://maps.app.goo.gl/abc123");
  await page.getByRole("button", { name: /^Pay \$[\d.]+ with KHQR$/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pay $14.00");
  await payAndTrigger(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Order SK-/);
  await expect(page.getByText("We deliver in Phnom Penh within one day.", { exact: false })).toBeVisible();
  const [admin] = (await mock.messages()).filter((m) => m.chat_id === "-1001");
  expect(admin.text).toContain("Map: https://maps.app.goo.gl/abc123");
  expect(admin.text).toContain("Delivery  $2.00");
  expect(admin.text).toContain("Total  $14.00");
  expect(admin.text).not.toContain("KHR");
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
  await expect(page.getByRole("heading", { name: "Join our Telegram group" })).toBeVisible();
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
  await setAvailable(FIRST.slug, false);
  await page.goto("/checkout");
  await fillDetails(page, "pickup");
  await page.getByRole("button", { name: /^Pay \$[\d.]+ with KHQR$/ }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(`${FIRST.name} is out of stock`);
});

test("the status route hides personal data and unknown orders are not found", async ({ page, request }) => {
  await reachPayment(page, "pickup");
  const id = page.url().split("/").pop();
  const body = await (await request.get(`/api/orders/${id}`)).text();
  expect(body).not.toMatch(/Sokha|345 678/);
  expect((await request.get("/api/orders/00000000-0000-4000-8000-000000000000")).status()).toBe(404);
  await page.goto("/checkout/00000000-0000-4000-8000-000000000000");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("We could not find this order.");
  await expect(page.getByText("Reference 00000000-0000-4000-8000-000000000000")).toBeVisible();
  await expect(page.getByRole("link", { name: "Message us on Telegram" })).toHaveAttribute("href", /^https:\/\/t\.me\/\+855/);
});

test("the Telegram route and the cron route reject missing secrets", async ({ request }) => {
  expect((await request.post("/api/telegram", { data: {} })).status()).toBe(401);
  expect((await request.get("/api/cron/daily")).status()).toBe(401);
  const ok = await request.get("/api/cron/daily", { headers: { authorization: "Bearer test-cron-secret" } });
  expect(ok.status()).toBe(200);
});

const seriousIssues = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze()).violations.filter((v) => v.impact === "serious" || v.impact === "critical");

test("axe finds no serious issues on the payment screen or the paid confirmation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await reachPayment(page, "pickup");
  expect(await seriousIssues(page)).toEqual([]);
  await payAndTrigger(page);
  await expect(page.getByRole("heading", { name: "Join our Telegram group" })).toBeVisible();
  expect(await seriousIssues(page)).toEqual([]);
});
