"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { bs, toBs, usd } from "@/lib/format";
import { useCart } from "./cart";

export function BagButton({ className = "" }: { className?: string }) {
  const { count, setOpen, bump, ready } = useCart();
  return (
    <button type="button" className={`bag-button ${className}`} onClick={() => setOpen(true)} aria-haspopup="dialog">
      Bolsa
      <span key={bump} className={`bag-button__count ${bump ? "is-bump" : ""}`} aria-label={`${count} artículos`}>
        {ready ? count : 0}
      </span>
    </button>
  );
}

export function BagDrawer({ rate }: { rate: number }) {
  const { lines, open, setOpen, setQty, remove, subtotal, count } = useCart();
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      returnFocus.current?.focus?.();
    };
  }, [open, setOpen]);

  return (
    <div className={`drawer ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <div className="drawer__veil" onClick={() => setOpen(false)} />
      <div className="drawer__panel" role="dialog" aria-modal="true" aria-labelledby="bag-title" inert={!open}>
        <div className="drawer__head">
          <h2 id="bag-title">Tu bolsa</h2>
          <button ref={closeRef} type="button" className="drawer__close" onClick={() => setOpen(false)}>
            Cerrar
          </button>
        </div>
        <div className="drawer__list">
          {lines.length === 0 ? (
            <div className="drawer__empty">
              <p>Todavía no hay nada aquí. La jungla de concreto no se gobierna sola.</p>
              <Link href="/tienda" className="button" onClick={() => setOpen(false)}>
                Ver la tienda <span className="arrow">→</span>
              </Link>
            </div>
          ) : (
            lines.map((l) => (
              <div className="line-item" key={`${l.productId}-${l.size}`}>
                <Link href={`/producto/${l.slug}`} className="line-item__img" onClick={() => setOpen(false)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.image} alt={l.name} width={176} height={220} loading="lazy" />
                </Link>
                <div>
                  <div className="line-item__top">
                    <span>{l.name}</span>
                    <span className="nums">{usd(l.price * l.qty)}</span>
                  </div>
                  <div className="line-item__sub">
                    {l.brand} · Talla {l.size}
                  </div>
                  <div className="line-item__actions">
                    <div className="qty" role="group" aria-label={`Cantidad de ${l.name}`}>
                      <button type="button" onClick={() => setQty(l.productId, l.size, l.qty - 1)} disabled={l.qty <= 1} aria-label="Quitar uno">
                        −
                      </button>
                      <span aria-live="polite">{l.qty}</span>
                      <button type="button" onClick={() => setQty(l.productId, l.size, l.qty + 1)} disabled={l.qty >= l.max} aria-label="Agregar uno">
                        +
                      </button>
                    </div>
                    <button type="button" className="remove" onClick={() => remove(l.productId, l.size)}>
                      Quitar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {lines.length > 0 && (
          <div className="drawer__foot">
            <div className="totals">
              <div className="grand">
                <span>Subtotal</span>
                <span className="nums">{usd(subtotal)}</span>
              </div>
              {rate > 0 && (
                <div className="soft">
                  <span>A tasa BCV</span>
                  <span className="nums">{bs(toBs(subtotal, rate))}</span>
                </div>
              )}
              <div className="soft">
                <span>
                  {count} {count === 1 ? "artículo" : "artículos"} · envío al elegir entrega
                </span>
              </div>
            </div>
            <Link href="/pedido" className="button button--wide" onClick={() => setOpen(false)}>
              Hacer el pedido <span className="arrow">→</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
