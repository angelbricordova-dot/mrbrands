import type { FulfillmentMethod, Order, OrderStatus, Product, Settings } from "./types";
import { orderCode } from "./store/shared";

const NAMES = [
  "Andrés Pérez", "Valeria Rojas", "Luis Mendoza", "Camila Torres", "Diego Herrera", "Sofía Ramírez",
  "Jesús Castillo", "Daniela Suárez", "Miguel Rivas", "Gabriela León", "José Gutiérrez", "Paola Medina",
  "Carlos Briceño", "Mariana Silva", "Kevin Ochoa", "Andrea Pacheco", "Ricardo Salas", "Fabiola Núñez",
];
const STATES: [string, string][] = [
  ["Carabobo", "Valencia"], ["Distrito Capital", "Caracas"], ["Lara", "Barquisimeto"], ["Zulia", "Maracaibo"],
  ["Anzoátegui", "Lechería"], ["Mérida", "Mérida"],
];

/** Small deterministic PRNG so the demo looks the same on every cold start. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function demoOrders(products: Product[], settings: Settings, now = new Date()): Order[] {
  const rand = rng(7);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
  const rate = settings.bcvRate || 200;
  const orders: Order[] = [];
  const count = 18;
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor((count - 1 - i) * 0.8);
    const created = new Date(now.getTime() - daysAgo * 86400000 - Math.floor(rand() * 9) * 3600000);
    const lines = 1 + Math.floor(rand() * 3);
    const items = Array.from({ length: lines }, () => {
      const p = pick(products);
      const v = pick(p.variants);
      return {
        productId: p.id, slug: p.slug, name: p.name, brand: p.brand, size: v.size,
        qty: rand() > 0.8 ? 2 : 1, unitPrice: p.price, image: p.images[0],
      };
    });
    const method: FulfillmentMethod = pick(["retiro", "delivery", "delivery", "nacional"] as const);
    const zone = pick(settings.deliveryZones);
    const [state, city] = pick(STATES);
    const subtotal = items.reduce((s, it) => s + it.unitPrice * it.qty, 0);
    const deliveryFee = method === "delivery" ? zone.fee : method === "nacional" ? settings.nationalFee : 0;
    const total = subtotal + deliveryFee;
    const age = daysAgo;
    const status: OrderStatus =
      age === 0 ? pick(["nuevo", "nuevo", "confirmado"] as const)
      : age <= 2 ? pick(["confirmado", "preparando", method === "retiro" ? "listo_retiro" : "en_camino"] as const)
      : rand() > 0.92 ? "cancelado" : "entregado";
    const payment = pick(settings.paymentMethods.filter((m) => m.enabled));
    orders.push({
      id: `demo_${i + 1}`,
      code: orderCode(i + 1),
      createdAt: created.toISOString(),
      status,
      paymentStatus: status === "nuevo" ? "pendiente" : status === "cancelado" ? "reembolsado" : "verificado",
      customer: { name: NAMES[i % NAMES.length], phone: `0414${String(1000000 + Math.floor(rand() * 8999999))}` },
      fulfillment:
        method === "delivery"
          ? { method, zoneId: zone.id, zoneName: zone.name, address: "Calle principal, casa 12" }
          : method === "nacional"
            ? { method, courier: pick(settings.couriers), state, city, agency: `Agencia ${city} centro` }
            : { method },
      payment: { methodId: payment.id, methodName: payment.name, reference: payment.needsReference ? String(100000 + i * 7919) : undefined },
      items,
      subtotal,
      deliveryFee,
      total,
      bcvRate: rate,
      totalBs: Math.round(total * rate * 100) / 100,
      history: [{ at: created.toISOString(), status: "nuevo" }, ...(status !== "nuevo" ? [{ at: created.toISOString(), status }] : [])],
      demo: true,
    });
  }
  return orders;
}
