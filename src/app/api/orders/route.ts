import { clientIp } from "@/lib/ip";
import { createOrder, OrderError } from "@/lib/orders";
import { orderInputSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const input = orderInputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return Response.json({ error: "invalid", message: "Please check your details and try again." }, { status: 400 });
  }
  const ip = clientIp(request.headers);
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
