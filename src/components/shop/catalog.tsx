"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { bs, toBs, usd } from "@/lib/format";
import type { Category } from "@/lib/types";

export type Tile = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: Category;
  price: number;
  images: string[];
  left: number;
  featured: boolean;
};

type Filter = { kind: "all" } | { kind: "category"; value: Category } | { kind: "brand"; value: string };

export function CatalogBrowser({
  tiles,
  categories,
  brands,
  rate,
}: {
  tiles: Tile[];
  categories: { id: Category; label: string; count: number }[];
  brands: { name: string; count: number }[];
  rate: number;
}) {
  const [filter, setFilter] = useState<Filter>({ kind: "all" });

  // Links from the home page arrive as ?c=gorras or ?marca=Odyssea. Read once after mount so the page stays static.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const c = q.get("c") as Category | null;
    const m = q.get("marca");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (c && categories.some((x) => x.id === c)) setFilter({ kind: "category", value: c });
    else if (m && brands.some((b) => b.name === m)) setFilter({ kind: "brand", value: m });
  }, [categories, brands]);

  const choose = (next: Filter) => {
    setFilter(next);
    const url = new URL(window.location.href);
    url.searchParams.delete("c");
    url.searchParams.delete("marca");
    if (next.kind === "category") url.searchParams.set("c", next.value);
    if (next.kind === "brand") url.searchParams.set("marca", next.value);
    window.history.replaceState(null, "", url);
  };

  const shown = useMemo(
    () =>
      tiles.filter((t) =>
        filter.kind === "all" ? true : filter.kind === "category" ? t.category === filter.value : t.brand === filter.value,
      ),
    [tiles, filter],
  );

  const pressed = (f: Filter) =>
    f.kind === filter.kind && (f.kind === "all" || (filter.kind !== "all" && "value" in f && f.value === filter.value));

  return (
    <>
      <div className="filters" role="toolbar" aria-label="Filtrar el catálogo">
        <button type="button" className="chip" aria-pressed={pressed({ kind: "all" })} onClick={() => choose({ kind: "all" })}>
          Todo <span className="chip__n">{tiles.length}</span>
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            className="chip"
            aria-pressed={pressed({ kind: "category", value: c.id })}
            onClick={() => choose({ kind: "category", value: c.id })}
          >
            {c.label} <span className="chip__n">{c.count}</span>
          </button>
        ))}
        {brands.map((b) => (
          <button
            key={b.name}
            type="button"
            className="chip"
            aria-pressed={pressed({ kind: "brand", value: b.name })}
            onClick={() => choose({ kind: "brand", value: b.name })}
          >
            {b.name} <span className="chip__n">{b.count}</span>
          </button>
        ))}
      </div>
      <div className="catalog" aria-live="polite">
        {shown.length === 0 && <p className="empty-state">No hay nada con ese filtro ahora mismo. Prueba con otro o escríbenos.</p>}
        {shown.map((t, i) => (
          <Link
            key={t.id}
            href={`/producto/${t.slug}`}
            className={`tile ${filter.kind === "all" && t.featured && i % 7 === 0 ? "tile--wide" : ""}`}
            data-reveal
            style={{ "--i": i % 4 } as CSSProperties}
          >
            <div className="tile__media">
              {t.left === 0 ? (
                <span className="tile__flag is-out">Agotado</span>
              ) : t.left <= 3 ? (
                <span className="tile__flag">{t.left === 1 ? "Queda 1" : `Quedan ${t.left}`}</span>
              ) : null}
              {t.images.slice(0, 2).map((src, k) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt={k === 0 ? t.name : ""} width={720} height={900} loading={i < 4 ? "eager" : "lazy"} />
              ))}
            </div>
            <div className="tile__meta">
              <span className="tile__name">{t.name}</span>
              <span className="tile__price">{usd(t.price)}</span>
              <span className="tile__brand">{t.brand}</span>
              {rate > 0 && <span className="tile__bs">{bs(toBs(t.price, rate))}</span>}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
