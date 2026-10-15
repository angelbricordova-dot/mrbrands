import { randomUUID } from "node:crypto";
import { Pool, neonConfig, type PoolClient } from "@neondatabase/serverless";
import { demoOrders } from "../demo-orders";
import { defaultSettings, seedProducts } from "../seed";
import type { Order, Product, Settings } from "../types";
import { applyStock, orderCode, patchOrder } from "./shared";
import type { NewOrder, OrderPatch, Store } from "./types";

if (typeof WebSocket !== "undefined") neonConfig.webSocketConstructor = WebSocket;

const globalForPg = globalThis as unknown as { __mrbrandsPool?: Pool; __mrbrandsReady?: Promise<void> };

function pool() {
  globalForPg.__mrbrandsPool ??= new Pool({
    connectionString: process.env.DATABASE_URL ?? process.env.POSTGRES_URL,
    max: 5,
    idleTimeoutMillis: 10_000,
  });
  return globalForPg.__mrbrandsPool;
}

async function tx<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/** Creates the tables and seeds the catalogue the first time the app talks to an empty database. */
function ready() {
  globalForPg.__mrbrandsReady ??= tx(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(424242)");
    await c.query(`
      CREATE TABLE IF NOT EXISTS mb_products (
        id text PRIMARY KEY, slug text UNIQUE NOT NULL, sort int NOT NULL DEFAULT 0, data jsonb NOT NULL);
      CREATE TABLE IF NOT EXISTS mb_orders (
        id text PRIMARY KEY, code text UNIQUE NOT NULL, created_at timestamptz NOT NULL,
        demo boolean NOT NULL DEFAULT false, data jsonb NOT NULL);
      CREATE INDEX IF NOT EXISTS mb_orders_created ON mb_orders (created_at DESC);
      CREATE TABLE IF NOT EXISTS mb_settings (id int PRIMARY KEY, data jsonb NOT NULL);
      CREATE SEQUENCE IF NOT EXISTS mb_order_seq;
    `);
    const settingsRow = await c.query("SELECT 1 FROM mb_settings WHERE id = 1");
    if (settingsRow.rowCount === 0) {
      const settings = defaultSettings();
      await c.query("INSERT INTO mb_settings (id, data) VALUES (1, $1)", [settings]);
      const products = seedProducts();
      for (const p of products) {
        await c.query("INSERT INTO mb_products (id, slug, sort, data) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING", [
          p.id, p.slug, p.sort, p,
        ]);
      }
      if (process.env.DEMO_ORDERS !== "false") {
        const orders = demoOrders(products, settings);
        for (const o of orders) {
          await c.query("INSERT INTO mb_orders (id, code, created_at, demo, data) VALUES ($1, $2, $3, true, $4)", [
            o.id, o.code, o.createdAt, o,
          ]);
        }
        await c.query("SELECT setval('mb_order_seq', $1)", [orders.length]);
      }
    }
  }).catch((error) => {
    globalForPg.__mrbrandsReady = undefined;
    throw error;
  });
  return globalForPg.__mrbrandsReady;
}

async function query<T = { data: unknown }>(text: string, params: unknown[] = []) {
  await ready();
  const result = await pool().query(text, params);
  return result.rows as T[];
}

export const postgresStore: Store = {
  kind: "postgres",
  async listProducts() {
    const rows = await query<{ data: Product }>("SELECT data FROM mb_products ORDER BY sort, id");
    return rows.map((r) => r.data);
  },
  async getProduct(idOrSlug) {
    const rows = await query<{ data: Product }>("SELECT data FROM mb_products WHERE id = $1 OR slug = $1 LIMIT 1", [idOrSlug]);
    return rows[0]?.data ?? null;
  },
  async saveProduct(product) {
    await query(
      `INSERT INTO mb_products (id, slug, sort, data) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, sort = EXCLUDED.sort, data = EXCLUDED.data`,
      [product.id, product.slug, product.sort, product],
    );
    return product;
  },
  async deleteProduct(id) {
    await query("DELETE FROM mb_products WHERE id = $1", [id]);
  },
  async getSettings() {
    const rows = await query<{ data: Settings }>("SELECT data FROM mb_settings WHERE id = 1");
    // Merge with defaults so settings added in later versions always exist.
    return { ...defaultSettings(), ...(rows[0]?.data ?? {}) };
  },
  async saveSettings(settings) {
    await query("INSERT INTO mb_settings (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data", [
      settings,
    ]);
    return settings;
  },
  async createOrder(input: NewOrder) {
    await ready();
    return tx(async (c) => {
      const ids = [...new Set(input.items.map((i) => i.productId))];
      const { rows } = await c.query("SELECT data FROM mb_products WHERE id = ANY($1) FOR UPDATE", [ids]);
      const products = new Map((rows as { data: Product }[]).map((r) => [r.data.id, r.data]));
      applyStock(products, input.items, -1);
      for (const p of products.values()) {
        await c.query("UPDATE mb_products SET data = $2 WHERE id = $1", [p.id, p]);
      }
      const seq = Number((await c.query("SELECT nextval('mb_order_seq') AS n")).rows[0].n);
      const now = new Date().toISOString();
      const order: Order = {
        ...input,
        id: randomUUID(),
        code: orderCode(seq),
        createdAt: now,
        status: "nuevo",
        paymentStatus: "pendiente",
        history: [{ at: now, status: "nuevo" }],
      };
      await c.query("INSERT INTO mb_orders (id, code, created_at, data) VALUES ($1, $2, $3, $4)", [
        order.id, order.code, order.createdAt, order,
      ]);
      return order;
    });
  },
  async listOrders() {
    const rows = await query<{ data: Order }>("SELECT data FROM mb_orders ORDER BY created_at DESC LIMIT 2000");
    return rows.map((r) => r.data);
  },
  async getOrder(idOrCode) {
    const rows = await query<{ data: Order }>("SELECT data FROM mb_orders WHERE id = $1 OR code = $1 LIMIT 1", [idOrCode]);
    return rows[0]?.data ?? null;
  },
  async updateOrder(id: string, patch: OrderPatch) {
    await ready();
    return tx(async (c) => {
      const found = await c.query("SELECT data FROM mb_orders WHERE id = $1 FOR UPDATE", [id]);
      if (found.rowCount === 0) throw new Error("Pedido no encontrado");
      const { next, stock } = patchOrder((found.rows[0] as { data: Order }).data, patch);
      if (stock !== 0 && !next.demo) {
        const ids = [...new Set(next.items.map((i) => i.productId))];
        const { rows } = await c.query("SELECT data FROM mb_products WHERE id = ANY($1) FOR UPDATE", [ids]);
        const products = new Map((rows as { data: Product }[]).map((r) => [r.data.id, r.data]));
        applyStock(products, next.items, stock);
        for (const p of products.values()) {
          await c.query("UPDATE mb_products SET data = $2 WHERE id = $1", [p.id, p]);
        }
      }
      await c.query("UPDATE mb_orders SET data = $2 WHERE id = $1", [id, next]);
      return next;
    });
  },
  async deleteDemoOrders() {
    const rows = await query<{ id: string }>("DELETE FROM mb_orders WHERE demo RETURNING id");
    return rows.length;
  },
};
