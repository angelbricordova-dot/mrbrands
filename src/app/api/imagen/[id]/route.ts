import { cacheLife } from "next/cache";
import { store } from "@/lib/store";

// Uploaded images never change: a new upload always gets a new id.
async function loadImage(id: string) {
  "use cache";
  cacheLife("max");
  return store().getImage(id);
}

export async function GET(_request: Request, ctx: RouteContext<"/api/imagen/[id]">) {
  const { id } = await ctx.params;
  if (!/^[a-z0-9_-]{8,64}$/i.test(id)) return new Response("Not found", { status: 404 });
  const image = await loadImage(id);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(image.base64, "base64"), {
    headers: { "Content-Type": image.mime, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
