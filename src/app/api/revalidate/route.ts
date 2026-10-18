import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (!process.env.SANITY_REVALIDATE_SECRET || secret !== process.env.SANITY_REVALIDATE_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  revalidatePath("/", "layout");
  return Response.json({ revalidated: true });
}
