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
  data: z.object({ amount: z.coerce.number(), currency: z.string(), status: z.string().nullish() }),
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
  if (!parsed.success) {
    console.error("khqr check returned 200 with an unexpected body", parsed.error.issues);
    return { paid: false };
  }
  const { amount, currency, status } = parsed.data.data;
  return status && status.toLowerCase() !== "paid" ? { paid: false } : { paid: true, amount, currency };
}
