"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { placeOrder, type PlaceOrderInput } from "@/app/(shop)/(pages)/pedido/actions";
import { bs, cashePlan, toBs, usd } from "@/lib/format";
import type { FulfillmentMethod, Settings } from "@/lib/types";
import { useCart } from "./cart";

export type LiveProduct = { id: string; price: number; name: string; stock: Record<string, number> };

function Field({
  id,
  label,
  error,
  children,
  full,
  hint,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
  full?: boolean;
  hint?: string;
}) {
  return (
    <div className={full ? "full" : undefined}>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && !error && <p className="fine" style={{ marginTop: "0.35rem" }}>{hint}</p>}
      {error && (
        <p className="error-text" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function Checkout({ settings, live }: { settings: Settings; live: Record<string, LiveProduct> }) {
  const router = useRouter();
  const { lines, ready, clear, setQty, remove } = useCart();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [method, setMethod] = useState<FulfillmentMethod>("delivery");
  const [zoneId, setZoneId] = useState("");
  const [address, setAddress] = useState("");
  const [reference, setReference] = useState("");
  const [courier, setCourier] = useState(settings.couriers[0] ?? "");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [agency, setAgency] = useState("");
  const payments = settings.paymentMethods.filter((m) => m.enabled);
  const [payId, setPayId] = useState(payments[0]?.id ?? "");
  const [payRef, setPayRef] = useState("");
  const [notes, setNotes] = useState("");

  // Prices and stock always come from the live catalogue, not from what the bag remembered.
  const items = useMemo(
    () =>
      lines.map((l) => {
        const p = live[l.productId];
        const available = p?.stock[l.size] ?? 0;
        return { ...l, price: p?.price ?? l.price, available, missing: !p };
      }),
    [lines, live],
  );
  const problems = items.filter((i) => i.missing || i.available < i.qty);
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  const zone = settings.deliveryZones.find((z) => z.id === zoneId);
  const fee = method === "delivery" ? (zone?.fee ?? 0) : method === "nacional" ? settings.nationalFee : 0;
  const total = Math.round((subtotal + fee) * 100) / 100;
  const rate = settings.bcvRate;
  const pay = payments.find((p) => p.id === payId);
  const plan = cashePlan(total, settings.cashea);

  const chooseMethod = (m: FulfillmentMethod) => {
    setMethod(m);
    if (m === "nacional" && payId === "efectivo") setPayId(payments.find((p) => p.id !== "efectivo")?.id ?? "");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFields({});
    const fulfillment: PlaceOrderInput["fulfillment"] =
      method === "retiro"
        ? { method }
        : method === "delivery"
          ? { method, zoneId, address, reference: reference || undefined }
          : { method, courier, state, city, agency, idNumber };
    startTransition(async () => {
      const result = await placeOrder({
        items: items.map((i) => ({ productId: i.productId, size: i.size, qty: i.qty })),
        customer: { name, phone, idNumber: idNumber || undefined },
        fulfillment,
        payment: { methodId: payId, reference: payRef || undefined },
        notes: notes || undefined,
      });
      if (result.ok) {
        clear();
        router.push(`/pedido/${result.id}`);
      } else {
        setError(result.error);
        setFields(result.fields ?? {});
        requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true'], .form-error")?.focus?.());
      }
    });
  };

  const err = (key: string) => fields[key];
  const invalid = (key: string) => (fields[key] ? { "aria-invalid": true as const, "aria-describedby": `${key}-error` } : {});

  if (!ready) return <div className="checkout" style={{ minHeight: "70svh" }} aria-busy="true" />;

  if (lines.length === 0) {
    return (
      <div className="checkout">
        <div className="checkout__main">
          <h1>Tu bolsa está vacía</h1>
          <p className="lead">Elige algo en la tienda y vuelve aquí para hacer el pedido.</p>
          <div>
            <Link href="/tienda" className="button">
              Ver la tienda <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      className="checkout"
      onSubmit={submit}
      noValidate
      onInput={(e) => {
        // A field's error goes away as soon as the customer edits it.
        const id = (e.target as HTMLElement).id;
        if (fields[id])
          setFields((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== id)));
      }}
    >
      <div className="checkout__main">
        <h1>Tu pedido</h1>

        <section className="step" aria-labelledby="s-datos">
          <h2 id="s-datos">¿A nombre de quién?</h2>
          <div className="fields">
            <Field id="customer.name" label="Nombre y apellido" error={err("customer.name")} full>
              <input id="customer.name" className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} {...invalid("customer.name")} />
            </Field>
            <Field id="customer.phone" label="WhatsApp" error={err("customer.phone")} hint="Por aquí te confirmamos el pedido.">
              <input id="customer.phone" className="field" type="tel" inputMode="tel" autoComplete="tel" placeholder="0414 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} {...invalid("customer.phone")} />
            </Field>
            {method !== "nacional" && (
              <Field id="customer.idNumber" label="Cédula (opcional)">
                <input id="customer.idNumber" className="field" inputMode="numeric" placeholder="V-12345678" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
              </Field>
            )}
          </div>
        </section>

        <section className="step" aria-labelledby="s-entrega">
          <h2 id="s-entrega">¿Cómo te llega?</h2>
          <div className="options" role="radiogroup" aria-labelledby="s-entrega">
            {(
              [
                ["delivery", "Delivery en Maracay", `Te lo llevamos a tu casa · desde ${usd(Math.min(...settings.deliveryZones.map((z) => z.fee)))}`, method === "delivery" && zone ? usd(zone.fee) : ""],
                ["retiro", "Retiro en tienda", settings.address, "Gratis"],
                ["nacional", "Envío nacional", `${settings.couriers.join(", ")} · cobro a destino`, settings.nationalFee > 0 ? usd(settings.nationalFee) : ""],
              ] as const
            ).map(([id, title, sub, price]) => (
              <label key={id} className="option">
                <input type="radio" name="method" value={id} checked={method === id} onChange={() => chooseMethod(id)} />
                <span>
                  <strong>{title}</strong>
                  <span className="sub">{sub}</span>
                </span>
                <span className="price">{price}</span>
              </label>
            ))}
          </div>

          <div className={`reveal-panel ${method === "delivery" ? "is-open" : ""}`} inert={method !== "delivery"}>
            <div>
              <div className="reveal-panel__inner fields">
                <Field id="fulfillment.zoneId" label="Zona" error={err("fulfillment.zoneId")} full>
                  <select id="fulfillment.zoneId" className="field" value={zoneId} onChange={(e) => setZoneId(e.target.value)} {...invalid("fulfillment.zoneId")}>
                    <option value="">Elige tu zona</option>
                    {settings.deliveryZones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} · {usd(z.fee)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="fulfillment.address" label="Dirección" error={err("fulfillment.address")} full>
                  <input id="fulfillment.address" className="field" autoComplete="street-address" placeholder="Urbanización, calle, casa o apartamento" value={address} onChange={(e) => setAddress(e.target.value)} {...invalid("fulfillment.address")} />
                </Field>
                <Field id="fulfillment.reference" label="Punto de referencia (opcional)" full>
                  <input id="fulfillment.reference" className="field" placeholder="Frente a la panadería, portón negro…" value={reference} onChange={(e) => setReference(e.target.value)} />
                </Field>
              </div>
            </div>
          </div>

          <div className={`reveal-panel ${method === "nacional" ? "is-open" : ""}`} inert={method !== "nacional"}>
            <div>
              <div className="reveal-panel__inner fields">
                <Field id="fulfillment.courier" label="Empresa de envío" error={err("fulfillment.courier")} full>
                  <select id="fulfillment.courier" className="field" value={courier} onChange={(e) => setCourier(e.target.value)}>
                    {settings.couriers.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field id="fulfillment.state" label="Estado" error={err("fulfillment.state")}>
                  <input id="fulfillment.state" className="field" autoComplete="address-level1" value={state} onChange={(e) => setState(e.target.value)} {...invalid("fulfillment.state")} />
                </Field>
                <Field id="fulfillment.city" label="Ciudad" error={err("fulfillment.city")}>
                  <input id="fulfillment.city" className="field" autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} {...invalid("fulfillment.city")} />
                </Field>
                <Field id="fulfillment.agency" label="Agencia u oficina" error={err("fulfillment.agency")} full>
                  <input id="fulfillment.agency" className="field" placeholder="Nombre o dirección de la agencia" value={agency} onChange={(e) => setAgency(e.target.value)} {...invalid("fulfillment.agency")} />
                </Field>
                <Field id="fulfillment.idNumber" label="Cédula de quien recibe" error={err("fulfillment.idNumber")} full>
                  <input id="fulfillment.idNumber" className="field" inputMode="numeric" placeholder="V-12345678" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} {...invalid("fulfillment.idNumber")} />
                </Field>
                <p className="fine full">{settings.nationalNote}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="step" aria-labelledby="s-pago">
          <h2 id="s-pago">¿Cómo pagas?</h2>
          <div className="options" role="radiogroup" aria-labelledby="s-pago">
            {payments.map((p) => {
              const disabled = p.id === "efectivo" && method === "nacional";
              return (
                <label key={p.id} className="option">
                  <input type="radio" name="pay" value={p.id} checked={payId === p.id} disabled={disabled} onChange={() => setPayId(p.id)} />
                  <span>
                    <strong>{p.name}</strong>
                    <span className="sub">
                      {disabled
                        ? "Solo para retiro o delivery en Maracay"
                        : p.id === "cashea" && settings.cashea.enabled
                          ? `${usd(plan.initial)} hoy y ${plan.installments} cuotas de ${usd(plan.each)}`
                          : p.id === "pago_movil" && rate > 0
                            ? `${bs(toBs(total, rate))} a tasa BCV`
                            : p.needsReference
                              ? "Pagas y nos pasas la referencia"
                              : "Pagas al recibir"}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {err("payment.methodId") && <p className="error-text">{err("payment.methodId")}</p>}
          {pay && (
            <div className="reveal-panel is-open">
              <div>
                <div className="reveal-panel__inner" style={{ display: "grid", gap: "1rem" }}>
                  <div className="pay-details">
                    <span className="fine">Datos para pagar con {pay.name}</span>
                    <p>{pay.details}</p>
                    {pay.id === "pago_movil" && rate > 0 && (
                      <span>
                        Monto: <strong className="nums">{bs(toBs(total, rate))}</strong>
                      </span>
                    )}
                    {pay.id !== "pago_movil" && pay.id !== "cashea" && (
                      <span>
                        Monto: <strong className="nums">{usd(total)}</strong>
                      </span>
                    )}
                  </div>
                  {pay.needsReference && (
                    <Field id="payment.reference" label="Número de referencia (si ya pagaste)" hint="Si todavía no pagas, déjalo vacío y nos lo envías por WhatsApp.">
                      <input id="payment.reference" className="field" inputMode="numeric" value={payRef} onChange={(e) => setPayRef(e.target.value)} />
                    </Field>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="step" aria-labelledby="s-notas">
          <h2 id="s-notas">¿Algo más?</h2>
          <Field id="notes" label="Notas para la tienda (opcional)" full>
            <textarea id="notes" className="field" placeholder="Es para regalo, llámame antes de llegar…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </section>
      </div>

      <aside className="checkout__aside" aria-label="Resumen">
        <div className="summary">
          <h2>Resumen</h2>
          <div className="summary__items">
            {items.map((i) => (
              <div className="summary__item" key={`${i.productId}-${i.size}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.image} alt="" width={112} height={140} />
                <span>
                  {i.qty} × {i.name}
                  <span className="sub">Talla {i.size}</span>
                  {(i.missing || i.available < i.qty) && (
                    <span className="error-text" style={{ display: "block", marginTop: 4 }}>
                      {i.missing || i.available === 0 ? (
                        <>
                          Se agotó.{" "}
                          <button type="button" className="link-plain" onClick={() => remove(i.productId, i.size)}>
                            Quitar
                          </button>
                        </>
                      ) : (
                        <>
                          Solo quedan {i.available}.{" "}
                          <button type="button" className="link-plain" onClick={() => setQty(i.productId, i.size, i.available)}>
                            Ajustar
                          </button>
                        </>
                      )}
                    </span>
                  )}
                </span>
                <span className="nums">{usd(i.price * i.qty)}</span>
              </div>
            ))}
          </div>
          <div className="totals">
            <div>
              <span>Subtotal</span>
              <span className="nums">{usd(subtotal)}</span>
            </div>
            <div>
              <span>{method === "retiro" ? "Retiro" : method === "delivery" ? "Delivery" : "Envío"}</span>
              <span className="nums">
                {method === "retiro" ? "Gratis" : method === "delivery" ? (zone ? usd(zone.fee) : "Elige tu zona") : settings.nationalFee > 0 ? usd(settings.nationalFee) : "Cobro a destino"}
              </span>
            </div>
            <div className="grand">
              <span>Total</span>
              <span className="nums">{usd(total)}</span>
            </div>
            {rate > 0 && (
              <div className="soft">
                <span>A tasa BCV ({rate.toLocaleString("es-VE", { minimumFractionDigits: 2 })})</span>
                <span className="nums">{bs(toBs(total, rate))}</span>
              </div>
            )}
          </div>
          {error && (
            <p className="form-error" role="alert" tabIndex={-1}>
              {error}
            </p>
          )}
          <button type="submit" className="button button--wide" disabled={pending || problems.length > 0}>
            {pending ? "Enviando tu pedido…" : `Confirmar pedido · ${usd(total)}`}
          </button>
          <p className="fine">
            Al confirmar apartamos tus prendas. Te escribimos por WhatsApp para verificar el pago y coordinar la entrega.
          </p>
        </div>
      </aside>
    </form>
  );
}
