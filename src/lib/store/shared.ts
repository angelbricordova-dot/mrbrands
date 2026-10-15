import type { Order, OrderItem, Product } from "../types";
import { OutOfStockError, type OrderPatch } from "./types";

export function orderCode(seq: number) {
  return `MB-${String(1000 + seq)}`;
}

/**
 * Applies `sign * qty` to the stock of every item. Mutates the products passed in.
 * With sign -1 (reserve) it refuses to go below zero.
 */
export function applyStock(products: Map<string, Product>, items: OrderItem[], sign: 1 | -1) {
  const needed = new Map<string, number>();
  for (const item of items) {
    const key = `${item.productId}::${item.size}`;
    needed.set(key, (needed.get(key) ?? 0) + item.qty);
  }
  for (const [key, qty] of needed) {
    const [productId, size] = key.split("::");
    const product = products.get(productId);
    const variant = product?.variants.find((v) => v.size === size);
    if (!product || !variant) {
      if (sign === -1) throw new OutOfStockError({ name: product?.name ?? "Producto", size, available: 0 });
      continue;
    }
    if (sign === -1 && variant.stock < qty) {
      throw new OutOfStockError({ name: product.name, size, available: variant.stock });
    }
  }
  for (const [key, qty] of needed) {
    const [productId, size] = key.split("::");
    const variant = products.get(productId)?.variants.find((v) => v.size === size);
    if (variant) variant.stock += sign * qty;
  }
}

/** Returns the patched order and whether stock must be released (+1) or reserved again (-1). */
export function patchOrder(order: Order, patch: OrderPatch): { next: Order; stock: 0 | 1 | -1 } {
  const next: Order = { ...order, history: [...order.history] };
  let stock: 0 | 1 | -1 = 0;
  if (patch.status && patch.status !== order.status) {
    if (patch.status === "cancelado") stock = 1;
    else if (order.status === "cancelado") stock = -1;
    next.status = patch.status;
    next.history.push({ at: new Date().toISOString(), status: patch.status, note: patch.note });
  } else if (patch.note) {
    next.history.push({ at: new Date().toISOString(), status: order.status, note: patch.note });
  }
  if (patch.paymentStatus) next.paymentStatus = patch.paymentStatus;
  return { next, stock };
}
