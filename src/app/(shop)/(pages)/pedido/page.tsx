import type { Metadata } from "next";
import { Checkout, type LiveProduct } from "@/components/shop/checkout";
import { getCatalog, getShopSettings } from "@/lib/catalog";

export const metadata: Metadata = { title: "Hacer el pedido", robots: { index: false } };

export default async function CheckoutPage() {
  const [catalog, settings] = await Promise.all([getCatalog(), getShopSettings()]);
  const live: Record<string, LiveProduct> = Object.fromEntries(
    catalog.map((p) => [p.id, { id: p.id, name: p.name, price: p.price, stock: Object.fromEntries(p.variants.map((v) => [v.size, v.stock])) }]),
  );
  return <Checkout settings={settings} live={live} />;
}
