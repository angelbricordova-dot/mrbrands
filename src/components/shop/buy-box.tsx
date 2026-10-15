"use client";

import { useState } from "react";
import { bs, cashePlan, toBs, usd } from "@/lib/format";
import type { Product, Settings } from "@/lib/types";
import { useCart } from "./cart";

export function BuyBox({ product, rate, cashea }: { product: Product; rate: number; cashea: Settings["cashea"] }) {
  const { add, lines, setOpen } = useCart();
  const single = product.variants.length === 1;
  const firstInStock = product.variants.find((v) => v.stock > 0)?.size;
  const [size, setSize] = useState<string | undefined>(single ? firstInStock : undefined);
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState("");
  const [needSize, setNeedSize] = useState(false);

  const variant = product.variants.find((v) => v.size === size);
  const inBag = lines.find((l) => l.productId === product.id && l.size === size)?.qty ?? 0;
  const max = Math.max(0, (variant?.stock ?? 0) - inBag);
  const soldOut = product.variants.every((v) => v.stock === 0);
  const plan = cashePlan(product.price * qty, cashea);

  const onAdd = () => {
    if (!variant) {
      setNeedSize(true);
      return;
    }
    if (max <= 0) return;
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      size: variant.size,
      qty: Math.min(qty, max),
      price: product.price,
      image: product.images[0] ?? "",
      max: variant.stock,
    });
    setMessage(`${product.name} talla ${variant.size} va en tu bolsa.`);
    setQty(1);
    setOpen(true);
  };

  return (
    <>
      <div className="pdp__price">
        <span className="pdp__usd">{usd(product.price)}</span>
        {rate > 0 && <span className="pdp__bs">{bs(toBs(product.price, rate))} a tasa BCV</span>}
      </div>
      {cashea.enabled && (
        <p className="pdp__cashea">
          Con <strong>Cashea</strong>: {usd(plan.initial)} hoy y {plan.installments} cuotas de {usd(plan.each)} cada {plan.everyDays} días.
        </p>
      )}

      <div className="sizes">
        <div className="sizes__head" id="size-label">
          <span>{single ? "Talla única" : "Elige tu talla"}</span>
          {variant && variant.stock > 0 && variant.stock <= 3 && (
            <span style={{ color: "var(--red)" }}>{variant.stock === 1 ? "Queda 1" : `Quedan ${variant.stock}`}</span>
          )}
        </div>
        {!single && (
          <div className="sizes__grid" role="radiogroup" aria-labelledby="size-label">
            {product.variants.map((v) => (
              <button
                key={v.size}
                type="button"
                role="radio"
                className="size"
                aria-checked={size === v.size}
                disabled={v.stock === 0}
                onClick={() => {
                  setSize(v.size);
                  setNeedSize(false);
                  setQty(1);
                }}
              >
                {v.size}
                {v.stock > 0 && v.stock <= 3 && <small>{v.stock === 1 ? "queda 1" : `quedan ${v.stock}`}</small>}
              </button>
            ))}
          </div>
        )}
        {needSize && <p className="error-text">Elige una talla para agregarla a tu bolsa.</p>}
      </div>

      <div className="pdp__add">
        <div className="qty" role="group" aria-label="Cantidad">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Quitar uno">
            −
          </button>
          <span aria-live="polite">{qty}</span>
          <button type="button" onClick={() => setQty((q) => Math.min(Math.max(1, max), q + 1))} disabled={!variant || qty >= max} aria-label="Agregar uno">
            +
          </button>
        </div>
        <button type="button" className="button" onClick={onAdd} disabled={soldOut || (variant && max <= 0)}>
          {soldOut ? "Agotado" : variant && max <= 0 ? "Ya tienes todas en la bolsa" : "Agregar a la bolsa"}
          {!soldOut && !(variant && max <= 0) && <span className="arrow">→</span>}
        </button>
      </div>
      <p className="pdp__added" role="status">
        {message}
      </p>
    </>
  );
}
