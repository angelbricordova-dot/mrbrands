import "server-only";
import { cache } from "react";
import { requireAdmin } from "./auth";
import { store } from "./store";
import type { Order, OrderStatus, PaymentStatus } from "./types";

/** Every admin read goes through here, so the session is checked next to the data. */
export const getAdminOrders = cache(async () => {
  await requireAdmin();
  return store().listOrders();
});

export const getAdminProducts = cache(async () => {
  await requireAdmin();
  return store().listProducts();
});

export const getAdminSettings = cache(async () => {
  await requireAdmin();
  return store().getSettings();
});

export const storeKind = () => store().kind;

/** Calendar day in Maracay, as YYYY-MM-DD. */
export function dayKey(date: Date | string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas", year: "numeric", month: "2-digit", day: "2-digit" }).format(
    typeof date === "string" ? new Date(date) : date,
  );
}

export type Queue = "cobrar" | "preparar" | "entregar";

export function queueOf(o: Order): Queue | null {
  if (o.status === "cancelado" || o.status === "entregado") return null;
  if (o.status === "nuevo") return "cobrar";
  if (o.status === "confirmado" || o.status === "preparando") return "preparar";
  return "entregar";
}

export type NextStep = { label: string; patch: { status?: OrderStatus; paymentStatus?: PaymentStatus } };

/** The one obvious next move for an order, used by the queue and the order page. */
export function nextStep(o: Order): NextStep | null {
  switch (o.status) {
    case "nuevo":
      return { label: "Pago recibido", patch: { status: "confirmado", paymentStatus: "verificado" } };
    case "confirmado":
      return { label: "Empezar a preparar", patch: { status: "preparando" } };
    case "preparando":
      return o.fulfillment.method === "retiro"
        ? { label: "Listo para retirar", patch: { status: "listo_retiro" } }
        : { label: o.fulfillment.method === "nacional" ? "Despachado" : "Salió el delivery", patch: { status: "en_camino" } };
    case "en_camino":
    case "listo_retiro":
      return { label: "Entregado", patch: { status: "entregado" } };
    default:
      return null;
  }
}

export function counts(orders: Order[]) {
  const c = { cobrar: 0, preparar: 0, entregar: 0 };
  for (const o of orders) {
    const q = queueOf(o);
    if (q) c[q] += 1;
  }
  return c;
}

/** Venezuelan mobile numbers (0414…) to the international form WhatsApp wants (58414…). */
export function waNumber(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("58")) return d;
  if (d.startsWith("0")) return `58${d.slice(1)}`;
  return d;
}
