"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { BCV_TAG, getOfficialRate } from "@/lib/bcv";
import { CATALOG_TAG, SETTINGS_TAG } from "@/lib/catalog";
import { store } from "@/lib/store";
import { OutOfStockError } from "@/lib/store/types";
import { SESSION_COOKIE, SESSION_DAYS, createSessionToken, passwordMatches } from "@/lib/session";
import { CATEGORIES, type OrderStatus, type PaymentStatus, type Product, type Settings } from "@/lib/types";

export type ActionResult = { ok: true; message?: string; id?: string } | { ok: false; error: string; fields?: Record<string, string> };

function fieldErrors(error: z.ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) fields[issue.path.join(".")] ??= issue.message;
  return fields;
}

/* ---------------- session ---------------- */

export async function login(_prev: { error?: string } | undefined, form: FormData): Promise<{ error?: string }> {
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/admin");
  if (!(await passwordMatches(password))) {
    // A short pause makes guessing slower without bothering the owner.
    await new Promise((r) => setTimeout(r, 600));
    return { error: "Esa contraseña no es. Inténtalo otra vez." };
  }
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  redirect(next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

/* ---------------- orders ---------------- */

const STATUSES = ["nuevo", "confirmado", "preparando", "en_camino", "listo_retiro", "entregado", "cancelado"] as const satisfies readonly OrderStatus[];
const PAYMENTS = ["pendiente", "verificado", "reembolsado"] as const satisfies readonly PaymentStatus[];

const orderPatch = z.object({
  status: z.enum(STATUSES).optional(),
  paymentStatus: z.enum(PAYMENTS).optional(),
  note: z.string().trim().max(300).optional(),
});

export async function updateOrder(id: string, patch: z.input<typeof orderPatch>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = orderPatch.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Cambio no válido." };
  try {
    await store().updateOrder(id, parsed.data);
  } catch (error) {
    if (error instanceof OutOfStockError) {
      return { ok: false, error: `No se puede reactivar: ${error.item.name} talla ${error.item.size} ya no tiene stock suficiente.` };
    }
    return { ok: false, error: "No se pudo actualizar el pedido." };
  }
  // Cancelling or reactivating moves stock, which the shop shows.
  updateTag(CATALOG_TAG);
  refresh();
  return { ok: true };
}

/* ---------------- products ---------------- */

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(3, "Escribe el nombre").max(80),
  brand: z.string().trim().min(1, "Escribe la marca").max(40),
  category: z.enum(CATEGORIES.map((c) => c.id) as [Product["category"], ...Product["category"][]]),
  price: z.number({ error: "Escribe el precio" }).positive("El precio debe ser mayor que 0").max(10000),
  description: z.string().trim().max(600),
  images: z.array(z.string().min(1)).min(1, "Agrega al menos una foto").max(8),
  variants: z
    .array(z.object({ size: z.string().trim().min(1, "Talla vacía").max(12), stock: z.number().int().min(0).max(9999) }))
    .min(1, "Agrega al menos una talla"),
  active: z.boolean(),
  featured: z.boolean(),
});

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

export async function saveProduct(input: z.input<typeof productSchema>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los campos marcados.", fields: fieldErrors(parsed.error) };
  const data = parsed.data;
  const sizes = data.variants.map((v) => v.size.toLowerCase());
  if (new Set(sizes).size !== sizes.length) return { ok: false, error: "Hay tallas repetidas.", fields: { variants: "Cada talla va una sola vez" } };

  const db = store();
  const all = await db.listProducts();
  const existing = data.id ? all.find((p) => p.id === data.id) : undefined;
  if (data.id && !existing) return { ok: false, error: "Ese producto ya no existe." };

  let slug = existing?.slug ?? slugify(data.name);
  if (!existing) {
    const taken = new Set(all.map((p) => p.slug));
    for (let n = 2; taken.has(slug); n++) slug = `${slugify(data.name)}-${n}`;
  }
  const product: Product = {
    id: existing?.id ?? `p_${randomBytes(5).toString("hex")}`,
    slug,
    name: data.name,
    brand: data.brand,
    category: data.category,
    price: Math.round(data.price * 100) / 100,
    description: data.description,
    images: data.images,
    variants: data.variants,
    active: data.active,
    featured: data.featured,
    sort: existing?.sort ?? (all.length ? Math.max(...all.map((p) => p.sort)) + 1 : 0),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  await db.saveProduct(product);
  updateTag(CATALOG_TAG);
  refresh();
  return { ok: true, id: product.id, message: existing ? "Cambios guardados." : "Producto creado." };
}

export async function setProductActive(id: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  const product = await store().getProduct(id);
  if (!product) return { ok: false, error: "Ese producto ya no existe." };
  await store().saveProduct({ ...product, active });
  updateTag(CATALOG_TAG);
  refresh();
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireAdmin();
  await store().deleteProduct(id);
  updateTag(CATALOG_TAG);
  redirect("/admin/productos");
}

const MAX_IMAGE_BYTES = 1_500_000;

/** Receives a photo already resized and compressed in the browser. */
export async function uploadImage(dataUrl: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireAdmin();
  const match = /^data:(image\/(?:webp|jpeg|png));base64,([a-z0-9+/=]+)$/i.exec(dataUrl);
  if (!match) return { ok: false, error: "Ese archivo no es una imagen válida." };
  const [, mime, base64] = match;
  if ((base64.length * 3) / 4 > MAX_IMAGE_BYTES) return { ok: false, error: "La foto pesa demasiado. Prueba con otra." };
  const id = `u_${randomBytes(8).toString("hex")}`;
  await store().saveImage({ id, mime, base64 });
  return { ok: true, url: `/api/imagen/${id}` };
}

/* ---------------- settings ---------------- */

const hhmm = z.string().regex(/^\d{2}:\d{2}$/, "Usa el formato 09:00");

const settingsSchema = z.object({
  whatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length >= 11 && v.length <= 13, "Número con código de país, por ejemplo 584122934158"),
  instagram: z.string().trim().max(40).transform((v) => v.replace(/^@/, "")),
  tiktok: z.string().trim().max(40).transform((v) => v.replace(/^@/, "")),
  address: z.string().trim().min(5, "Escribe la dirección").max(160),
  mapsUrl: z.string().trim().url("Pega un enlace de Google Maps").max(400),
  bcvAuto: z.boolean(),
  bcvRate: z.number().min(0).max(1_000_000),
  deliveryZones: z
    .array(z.object({ id: z.string().min(1), name: z.string().trim().min(2, "Nombre de la zona").max(80), fee: z.number().min(0).max(100) }))
    .min(1, "Deja al menos una zona"),
  couriers: z.array(z.string().trim().min(2).max(30)).min(1, "Deja al menos una empresa de envío"),
  nationalNote: z.string().trim().max(200),
  nationalFee: z.number().min(0).max(100),
  paymentMethods: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().trim().min(2).max(40),
      enabled: z.boolean(),
      details: z.string().trim().max(240),
      needsReference: z.boolean(),
    }),
  ),
  cashea: z.object({
    enabled: z.boolean(),
    initialPct: z.number().min(0).max(100),
    installments: z.number().int().min(1).max(12),
    everyDays: z.number().int().min(1).max(60),
  }),
  hours: z.array(z.object({ day: z.number().int().min(0).max(6), label: z.string(), open: hhmm, close: hhmm, closed: z.boolean().optional() })).length(7),
});

export async function saveSettings(input: z.input<typeof settingsSchema>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los campos marcados.", fields: fieldErrors(parsed.error) };
  if (!parsed.data.paymentMethods.some((m) => m.enabled)) return { ok: false, error: "Deja activo al menos un método de pago." };
  const db = store();
  const current = await db.getSettings();
  const next: Settings = {
    ...current,
    ...parsed.data,
    bcvUpdatedAt: parsed.data.bcvRate !== current.bcvRate ? new Date().toISOString() : current.bcvUpdatedAt,
  };
  await db.saveSettings(next);
  updateTag(SETTINGS_TAG);
  refresh();
  return { ok: true, message: "Ajustes guardados. La tienda ya los muestra." };
}

/** Pulls the official rate now and stores it, so it also works as the manual fallback. */
export async function refreshBcvRate(): Promise<ActionResult & { rate?: number }> {
  await requireAdmin();
  updateTag(BCV_TAG);
  const live = await getOfficialRate();
  if (!live) return { ok: false, error: "No se pudo consultar la tasa oficial ahora. Escríbela a mano y guarda." };
  const db = store();
  const current = await db.getSettings();
  await db.saveSettings({ ...current, bcvRate: live.rate, bcvUpdatedAt: live.date || new Date().toISOString() });
  updateTag(SETTINGS_TAG);
  refresh();
  return { ok: true, rate: live.rate, message: `Tasa BCV actualizada: ${live.rate.toLocaleString("es-VE", { minimumFractionDigits: 2 })}` };
}

export async function deleteDemoOrders(): Promise<ActionResult> {
  await requireAdmin();
  const n = await store().deleteDemoOrders();
  refresh();
  return { ok: true, message: n ? `Se borraron ${n} pedidos de demostración.` : "No quedaban pedidos de demostración." };
}
