import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { IconPlus } from "@/components/admin/icons";
import { ActiveSwitch } from "@/components/admin/product-form";
import { getAdminProducts } from "@/lib/admin-data";
import { usd } from "@/lib/format";
import { CATEGORIES } from "@/lib/types";

export const metadata: Metadata = { title: "Productos" };

async function ProductList({ searchParams }: { searchParams: PageProps<"/admin/productos">["searchParams"] }) {
  const [products, sp] = await Promise.all([getAdminProducts(), searchParams]);
  const c = typeof sp.c === "string" ? sp.c : "";
  const shown = c ? products.filter((p) => p.category === c) : products;
  const cats = CATEGORIES.filter((cat) => products.some((p) => p.category === cat.id));
  return (
    <>
      <header className="a-top">
        <div>
          <h1>Productos</h1>
          <p>
            {products.filter((p) => p.active).length} visibles en la tienda · {products.filter((p) => !p.active).length} ocultos.
          </p>
        </div>
        <div className="a-top__actions">
          <Link href="/admin/productos/nuevo" className="a-btn a-btn--primary">
            <IconPlus /> Nuevo producto
          </Link>
        </div>
      </header>
      <nav className="a-seg" aria-label="Filtrar por categoría" style={{ marginBottom: "1rem" }}>
        <Link href="/admin/productos" aria-current={!c ? "page" : undefined}>
          Todos <span className="n">{products.length}</span>
        </Link>
        {cats.map((cat) => (
          <Link key={cat.id} href={`/admin/productos?c=${cat.id}`} aria-current={c === cat.id ? "page" : undefined}>
            {cat.label} <span className="n">{products.filter((p) => p.category === cat.id).length}</span>
          </Link>
        ))}
      </nav>
      {shown.length === 0 ? (
        <div className="a-panel a-empty">
          <strong>Todavía no hay productos aquí.</strong>
          <p>Crea el primero con sus fotos, tallas y precio. Aparece en la tienda apenas lo guardes.</p>
          <Link href="/admin/productos/nuevo" className="a-btn a-btn--primary">
            <IconPlus /> Nuevo producto
          </Link>
        </div>
      ) : (
        <div className="a-panel a-panel--flush">
          <table className="a-table p-table">
            <thead>
              <tr>
                <th>
                  <span className="sr-only">Foto</span>
                </th>
                <th>Producto</th>
                <th className="hide-sm">Categoría</th>
                <th className="r">Precio</th>
                <th className="r">Stock</th>
                <th>Visible</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => {
                const stock = p.variants.reduce((n, v) => n + v.stock, 0);
                const out = p.variants.filter((v) => v.stock === 0).length;
                return (
                  <tr key={p.id}>
                    <td style={{ width: "3.5rem" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="thumb" src={p.images[0]} alt="" width={88} height={110} loading="lazy" />
                    </td>
                    <td>
                      <Link className="rowlink" href={`/admin/productos/${p.id}`}>
                        {p.name}
                      </Link>
                      <span className="sub">
                        {p.brand}
                        {p.featured ? " · destacado" : ""}
                      </span>
                    </td>
                    <td className="hide-sm">{CATEGORIES.find((x) => x.id === p.category)?.label}</td>
                    <td className="r">{usd(p.price)}</td>
                    <td className="r">
                      {stock}
                      {out > 0 && (
                        <span className="sub" style={{ color: "var(--red)" }}>
                          {out === p.variants.length ? "agotado" : `${out} talla${out > 1 ? "s" : ""} agotada${out > 1 ? "s" : ""}`}
                        </span>
                      )}
                    </td>
                    <td>
                      <ActiveSwitch id={p.id} active={p.active} name={p.name} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function ProductsPage(props: PageProps<"/admin/productos">) {
  return (
    <Suspense fallback={<div className="sk" style={{ minHeight: "60svh" }} aria-busy="true" />}>
      <ProductList searchParams={props.searchParams} />
    </Suspense>
  );
}
