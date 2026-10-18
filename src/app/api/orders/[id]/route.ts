import { getOrderView } from "@/lib/orders";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = UUID.test(id) ? await getOrderView(id) : null;
  if (!view) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json(view, { headers: { "Cache-Control": "no-store" } });
}
