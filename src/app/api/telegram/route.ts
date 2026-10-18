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
