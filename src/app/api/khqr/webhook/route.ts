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
