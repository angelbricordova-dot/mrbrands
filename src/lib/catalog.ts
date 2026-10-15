import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { withLiveRate } from "./bcv";
import { store } from "./store";
import type { Product, Settings } from "./types";

export const CATALOG_TAG = "catalog";
export const SETTINGS_TAG = "settings";

/** Active products for the shop. Cached; every mutation calls updateTag(CATALOG_TAG). */
export async function getCatalog(): Promise<Product[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");
  return (await store().listProducts()).filter((p) => p.active);
}

export async function getCatalogProduct(slug: string): Promise<Product | null> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");
  const product = await store().getProduct(slug);
  return product?.active ? product : null;
}

export async function getShopSettings(): Promise<Settings> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("hours");
  return withLiveRate(await store().getSettings());
}
