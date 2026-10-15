import { randomUUID } from "node:crypto";
import { demoOrders } from "../demo-orders";
import { defaultSettings, seedProducts } from "../seed";
import type { Order, Product, Settings } from "../types";
import { applyStock, orderCode, patchOrder } from "./shared";
import type { NewOrder, OrderPatch, Store } from "./types";

type State = { products: Map<string, Product>; orders: Order[]; settings: Settings; seq: number };

const globalForStore = globalThis as unknown as { __mrbrandsMemory?: State };

function state(): State {
  if (!globalForStore.__mrbrandsMemory) {
    const products = seedProducts();
    const settings = defaultSettings();
    const orders = process.env.DEMO_ORDERS === "false" ? [] : demoOrders(products, settings);
    globalForStore.__mrbrandsMemory = {
      products: new Map(products.map((p) => [p.id, p])),
      orders,
      settings,
      seq: orders.length,
    };
  }
  return globalForStore.__mrbrandsMemory;
}

const clone = <T,>(value: T): T => structuredClone(value);

/**
 * Keeps everything in the server's memory. Good for local development and a quick preview;
 * on Vercel each serverless instance has its own copy and it resets on every cold start.
 */
export const memoryStore: Store = {
  kind: "memory",
  async listProducts() {
    return clone([...state().products.values()].sort((a, b) => a.sort - b.sort));
  },
  async getProduct(idOrSlug) {
    const s = state();
    const p = s.products.get(idOrSlug) ?? [...s.products.values()].find((x) => x.slug === idOrSlug);
    return p ? clone(p) : null;
  },
  async saveProduct(product) {
    state().products.set(product.id, clone(product));
    return clone(product);
  },
  async deleteProduct(id) {
    state().products.delete(id);
  },
  async getSettings() {
    return clone(state().settings);
  },
  async saveSettings(settings) {
    state().settings = clone(settings);
    return clone(settings);
  },
  async createOrder(input: NewOrder) {
    const s = state();
    applyStock(s.products, input.items, -1);
    s.seq += 1;
    const now = new Date().toISOString();
    const order: Order = {
      ...clone(input),
      id: randomUUID(),
      code: orderCode(s.seq),
      createdAt: now,
      status: "nuevo",
      paymentStatus: "pendiente",
      history: [{ at: now, status: "nuevo" }],
    };
    s.orders.push(order);
    return clone(order);
  },
  async listOrders() {
    return clone([...state().orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },
  async getOrder(idOrCode) {
    const o = state().orders.find((x) => x.id === idOrCode || x.code === idOrCode);
    return o ? clone(o) : null;
  },
  async updateOrder(id: string, patch: OrderPatch) {
    const s = state();
    const index = s.orders.findIndex((x) => x.id === id);
    if (index < 0) throw new Error("Pedido no encontrado");
    const { next, stock } = patchOrder(s.orders[index], patch);
    if (stock !== 0 && !next.demo) applyStock(s.products, next.items, stock);
    s.orders[index] = next;
    return clone(next);
  },
  async deleteDemoOrders() {
    const s = state();
    const before = s.orders.length;
    s.orders = s.orders.filter((o) => !o.demo);
    return before - s.orders.length;
  },
};
