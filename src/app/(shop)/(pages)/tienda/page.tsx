import type { Metadata } from "next";
import { CatalogBrowser, type Tile } from "@/components/shop/catalog";
import { getCatalog, getShopSettings } from "@/lib/catalog";
import { CATEGORIES } from "@/lib/types";

export const metadata: Metadata = {
  title: "Tienda",
  description: "Todo lo que hay hoy en Mr.Brands: franelas, gorras, monos, jorts y más. Precios en dólares a tasa BCV.",
};

export default async function ShopPage() {
  const [catalog, settings] = await Promise.all([getCatalog(), getShopSettings()]);
  const tiles: Tile[] = catalog.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    category: p.category,
    price: p.price,
    images: p.images,
    left: p.variants.reduce((n, v) => n + v.stock, 0),
    featured: p.featured,
  }));
  const categories = CATEGORIES.map((c) => ({ ...c, count: tiles.filter((t) => t.category === c.id).length })).filter((c) => c.count > 0);
  const brandNames = [...new Set(tiles.map((t) => t.brand))].sort((a, b) => a.localeCompare(b, "es"));
  const brands = brandNames.map((name) => ({ name, count: tiles.filter((t) => t.brand === name).length }));

  return (
    <>
      <div className="shop-head wrap">
        <h1>La tienda</h1>
        <p>
          {tiles.length} prendas en el CC Estación Central hoy. Precios en dólares a tasa BCV; con Cashea las pagas en cuotas.
        </p>
      </div>
      <CatalogBrowser tiles={tiles} categories={categories} brands={brands} rate={settings.bcvRate} />
    </>
  );
}
