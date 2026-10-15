"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { withLiveRate } from "@/lib/bcv";
import { CATALOG_TAG } from "@/lib/catalog";
import { toBs } from "@/lib/format";
import { OutOfStockError, store } from "@/lib/store";
import type { OrderItem } from "@/lib/types";

const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[^\d+]/g, ""))
  .refine((v) => v.replace(/\D/g, "").length >= 10, "Escribe un teléfono con código de área, por ejemplo 0414 123 4567");

const schema = z.object({
  items: z
    .array(z.object({ productId: z.string().min(1), size: z.string().min(1), qty: z.number().int().min(1).max(10) }))
    .min(1, "Tu bolsa está vacía")
    .max(30),
  customer: z.object({
    name: z.string().trim().min(3, "Escribe tu nombre y apellido").max(80),
    phone,
    idNumber: z.string().trim().max(15).optional(),
  }),
  fulfillment: z.discriminatedUnion("method", [
    z.object({ method: z.literal("retiro") }),
    z.object({
      method: z.literal("delivery"),
      zoneId: z.string().min(1, "Elige tu zona"),
      address: z.string().trim().min(6, "Escribe la dirección de entrega").max(200),
      reference: z.string().trim().max(160).optional(),
    }),
    z.object({
      method: z.literal("nacional"),
      courier: z.string().min(1, "Elige la empresa de envío"),
      state: z.string().trim().min(2, "Escribe el estado").max(40),
      city: z.string().trim().min(2, "Escribe la ciudad").max(60),
      agency: z.string().trim().min(3, "Escribe la agencia o dirección de la oficina").max(160),
      idNumber: z.string().trim().min(5, "La empresa de envío pide tu cédula").max(15),
    }),
  ]),
  payment: z.object({ methodId: z.string().min(1, "Elige cómo vas a pagar"), reference: z.string().trim().max(40).optional() }),
  notes: z.string().trim().max(300).optional(),
});

export type PlaceOrderInput = z.input<typeof schema>;
export type PlaceOrderResult =
  | { ok: true; id: string; code: string }
  | { ok: false; error: string; fields?: Record<string, string> };

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      fields[key] ??= issue.message;
    }
    return { ok: false, error: "Revisa los datos marcados.", fields };
  }
  const data = parsed.data;
  const db = store();
  const settings = await withLiveRate(await db.getSettings());

  const items: OrderItem[] = [];
  for (const line of data.items) {
    const product = await db.getProduct(line.productId);
    if (!product || !product.active || !product.variants.some((v) => v.size === line.size)) {
      return { ok: false, error: "Uno de los productos de tu bolsa ya no está disponible. Quítalo y vuelve a intentar." };
    }
    items.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      size: line.size,
      qty: line.qty,
      unitPrice: product.price,
      image: product.images[0] ?? "",
    });
  }

  const payment = settings.paymentMethods.find((m) => m.id === data.payment.methodId && m.enabled);
  if (!payment) return { ok: false, error: "Ese método de pago no está disponible.", fields: { "payment.methodId": "Elige otro método" } };
  if (payment.id === "efectivo" && data.fulfillment.method === "nacional") {
    return { ok: false, error: "El efectivo es solo para retiro en tienda o delivery en Maracay.", fields: { "payment.methodId": "Elige otro método para envíos nacionales" } };
  }

  let deliveryFee = 0;
  let fulfillment;
  const f = data.fulfillment;
  if (f.method === "delivery") {
    const zone = settings.deliveryZones.find((z) => z.id === f.zoneId);
    if (!zone) return { ok: false, error: "Elige una zona de delivery válida.", fields: { "fulfillment.zoneId": "Elige tu zona" } };
    deliveryFee = zone.fee;
    fulfillment = { method: f.method, zoneId: zone.id, zoneName: zone.name, address: f.address, reference: f.reference };
  } else if (f.method === "nacional") {
    deliveryFee = settings.nationalFee;
    fulfillment = { method: f.method, courier: f.courier, state: f.state, city: f.city, agency: f.agency };
  } else {
    fulfillment = { method: f.method };
  }

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const total = Math.round((subtotal + deliveryFee) * 100) / 100;
  const rate = settings.bcvRate;

  try {
    const order = await db.createOrder({
      customer: {
        name: data.customer.name,
        phone: data.customer.phone,
        idNumber: f.method === "nacional" ? f.idNumber : data.customer.idNumber || undefined,
      },
      fulfillment,
      payment: { methodId: payment.id, methodName: payment.name, reference: data.payment.reference || undefined },
      notes: data.notes || undefined,
      items,
      subtotal,
      deliveryFee,
      total,
      bcvRate: rate,
      totalBs: toBs(total, rate),
    });
    updateTag(CATALOG_TAG);
    return { ok: true, id: order.id, code: order.code };
  } catch (error) {
    if (error instanceof OutOfStockError) {
      const { name, size, available } = error.item;
      return {
        ok: false,
        error:
          available > 0
            ? `De ${name} talla ${size} solo quedan ${available}. Ajusta la cantidad y vuelve a intentar.`
            : `${name} talla ${size} se acaba de agotar. Quítalo de tu bolsa para seguir.`,
      };
    }
    console.error(error);
    return { ok: false, error: "No pudimos registrar el pedido. Intenta de nuevo o escríbenos por WhatsApp." };
  }
}
