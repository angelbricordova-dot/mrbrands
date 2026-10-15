"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { bs, toBs, usd } from "@/lib/format";

export type BoardRow = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  kind: string;
  price: number;
  left: number;
  image: string;
};

/**
 * The departures board of Estación Central: every product, its price and what is left.
 * The currency switch flips each price like a split-flap board, at today's BCV rate.
 */
export function DepartureBoard({ groups, rate, rateDate }: { groups: { kind: string; rows: BoardRow[] }[]; rate: number; rateDate: string }) {
  const [currency, setCurrency] = useState<"usd" | "bs">("usd");
  const [flipKey, setFlipKey] = useState(0);
  const all = groups.flatMap((g) => g.rows);
  const [preview, setPreview] = useState(all[0]?.id);

  const choose = (next: "usd" | "bs") => {
    if (next === currency) return;
    setCurrency(next);
    setFlipKey((k) => k + 1);
  };

  let index = 0;
  return (
    <div className="board__body grid">
      <div className="board__preview" aria-hidden>
        {all.map((r) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={r.id} src={r.image} alt="" width={480} height={600} loading="lazy" className={r.id === preview ? "is-on" : ""} />
        ))}
        <span className="board__preview-label">{all.find((r) => r.id === preview)?.brand}</span>
      </div>
      <div className="board__table">
        <div className="board__toolbar">
          <span className="board__rate">
            {rate > 0 ? `Tasa BCV ${rate.toLocaleString("es-VE", { minimumFractionDigits: 2 })}${rateDate ? ` · ${rateDate}` : ""}` : "Precios en dólares a tasa BCV"}
          </span>
          {rate > 0 && (
            <div className="currency" role="group" aria-label="Moneda">
              <button type="button" aria-pressed={currency === "usd"} onClick={() => choose("usd")}>
                Dólares
              </button>
              <button type="button" aria-pressed={currency === "bs"} onClick={() => choose("bs")}>
                Bolívares
              </button>
            </div>
          )}
        </div>
        {groups.map((g) => (
          <div className="board__group" key={g.kind}>
            {g.rows.map((r) => {
              const i = index++;
              return (
                <Link
                  key={r.id}
                  href={`/producto/${r.slug}`}
                  className="board__row"
                  data-reveal="row"
                  style={{ "--i": i } as CSSProperties}
                  onMouseEnter={() => setPreview(r.id)}
                  onFocus={() => setPreview(r.id)}
                >
                  <span className="board__kind">{r.kind}</span>
                  <span className="board__item">
                    {r.name}
                    {r.left === 0 ? (
                      <span className="board__left is-out">agotado</span>
                    ) : r.left <= 3 ? (
                      <span className="board__left">{r.left === 1 ? "queda 1" : `quedan ${r.left}`}</span>
                    ) : null}
                  </span>
                  <span className="board__price">
                    <span key={flipKey} className={`flip ${flipKey ? "is-flipping" : ""}`} style={{ "--i": i } as CSSProperties}>
                      {currency === "usd" ? usd(r.price) : bs(toBs(r.price, rate))}
                    </span>
                    <span className="arrow" aria-hidden>
                      →
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
