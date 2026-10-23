import { handleRevenue } from "@/lib/orders";

const REVENUE = /^\/revenue(?:@\w+)?(?:\s|$)/;

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const update = await request.json();
    const text: unknown = update?.message?.text;
    const chatId: unknown = update?.message?.chat?.id;
    // Only the admin group may ask. Anyone else who finds the bot gets no reply and no numbers.
    if (typeof text === "string" && REVENUE.test(text) && typeof chatId === "number" && String(chatId) === process.env.TELEGRAM_ADMIN_CHAT_ID) {
      await handleRevenue(chatId);
    }
  } catch (error) {
    console.error("Telegram update failed", error);
  }
  return Response.json({ ok: true });
}
