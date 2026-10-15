import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type CSSProperties } from "react";
import { IconArrowLeft, IconChat } from "@/components/admin/icons";
import { CancelOrder, NoteForm, PaymentToggle, StepButton } from "@/components/admin/order-buttons";
import { getAdminOrders, getAdminSettings, nextStep, waNumber } from "@/lib/admin-data";
import { bs, to12h, usd, waLink } from "@/lib/format";
import { FULFILLMENT_LABEL, STATUS_LABEL, type Order, type OrderStatus, type Settings } from "@/lib/types";

export const metadata: Metadata = { title: "Pedido" };

function steps(o: Order): OrderStatus[] {
  return o.fulfillment.method === "retiro"
    ? ["nuevo", "confirmado", "preparando", "listo_retiro", "entregado"]
    : ["nuevo", "confirmado", "preparando", "en_camino", "entregado"];
}

/** What the owner would type on WhatsApp at each stage, ready to send. */
function customerMessage(o: Order, s: Settings, ticketUrl: string) {
  const first = o.customer.name.split(" ")[0];
  const sat = s.hours.find((h) => h.day === 6);
  const lines: Record<OrderStatus, string> = {
    nuevo: `¡Hola ${first}! Recibimos tu pedido ${o.code} en Mr.Brands por ${usd(o.total)}. Para confirmarlo envíanos el comprobante de ${o.payment.methodName}.`,
    confirmado: `¡Hola ${first}! Confirmamos el pago de tu pedido ${o.code}. Ya lo estamos preparando.`,
    preparando: `¡Hola ${first}! Estamos preparando tu pedido ${o.code}. Te avisamos apenas salga.`,
    en_camino:
      o.fulfillment.method === "nacional"
        ? `¡Hola ${first}! Tu pedido ${o.code} ya salió por ${o.fulfillment.courier} hacia ${o.fulfillment.city}. Te pasamos la guía por aquí.`
        : `¡Hola ${first}! Tu pedido ${o.code} va en camino a ${o.fulfillment.zoneName ?? "tu dirección"}.`,
    listo_retiro: `¡Hola ${first}! Tu pedido ${o.code} está listo para retirar en ${s.address}.${sat ? ` Sábados hasta las ${to12h(sat.close)}.` : ""}`,
    entregado: `¡Gracias por tu compra, ${first}! Esperamos verte pronto en la casa del flow.`,
    cancelado: `Hola ${first}, tu pedido ${o.code} fue cancelado. Si fue un error, respóndenos y lo resolvemos.`,
  };
  return `${lines[o.status]}\n\nSigue tu pedido aquí: ${ticketUrl}`;
}

async function OrderDetail({ params }: { params: PageProps<"/admin/pedidos/[id]">["params"] }) {
  const [{ id }, orders, settings, h] = await Promise.all([params, getAdminOrders(), getAdminSettings(), headers()]);
  const order = orders.find((o) => o.id === id);
  if (!order) notFound();

  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const ticketUrl = `${proto}://${host}/pedido/${order.id}`;
  const flow = steps(order);
  const now = flow.indexOf(order.status);
  const step = nextStep(order);
  const f = order.fulfillment;
  const date = (iso: string) =>
    new Intl.DateTimeFormat("es-VE", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Caracas" }).format(new Date(iso));

  return (
    <>
      <Link href="/admin/pedidos" className="a-btn a-btn--ghost a-btn--sm" style={{ marginBottom: "0.75rem", marginLeft: "-0.75rem" }}>
        <IconArrowLeft /> Pedidos
      </Link>
      <header className="a-top">
        <div>
          <div className="o-head">
            <h1>{order.code}</h1>
            <span className={`pill pill--${order.status}`}>{STATUS_LABEL[order.status]}</span>
            {order.demo && <span className="tag-demo">pedido de demostración</span>}
          </div>
          <p>
            {date(order.createdAt)} · {order.customer.name} · {usd(order.total)}
          </p>
        </div>
        <div className="a-top__actions">
          <a className="a-btn" href={waLink(waNumber(order.customer.phone), customerMessage(order, settings, ticketUrl))} target="_blank" rel="noreferrer">
            <IconChat /> Escribir al cliente
          </a>
          <a className="a-btn a-btn--ghost" href={`/pedido/${order.id}`} target="_blank" rel="noreferrer">
            Ver su boleto ↗
          </a>
        </div>
      </header>

      <div className="a-grid">
        <div className="span-7" style={{ display: "grid", gap: "var(--a-gap)" }}>
          <section className="a-panel" aria-labelledby="estado">
            <div className="a-panel__head">
              <h2 id="estado">Estado</h2>
              <span className={`pill pill--pay-${order.paymentStatus}`}>
                Pago {order.paymentStatus === "verificado" ? "verificado" : order.paymentStatus === "reembolsado" ? "reembolsado" : "por verificar"}
              </span>
            </div>
            {order.status !== "cancelado" && (
              <ol className="stepper" style={{ "--n": flow.length } as CSSProperties}>
                {flow.map((s, i) => (
                  <li key={s} className={i < now ? "is-done" : i === now ? "is-now" : ""} aria-current={i === now ? "step" : undefined}>
                    {STATUS_LABEL[s]}
                  </li>
                ))}
              </ol>
            )}
            <div className="next-step">
              {step && <StepButton orderId={order.id} label={step.label} patch={step.patch} size="lg" />}
              {order.status !== "nuevo" && order.status !== "cancelado" && <PaymentToggle orderId={order.id} status={order.paymentStatus} />}
              <CancelOrder orderId={order.id} cancelled={order.status === "cancelado"} />
            </div>
            {order.status === "nuevo" && (
              <p className="a-hint" style={{ marginTop: "0.75rem" }}>
                Revisa que el pago de {order.payment.methodName}
                {order.payment.reference ? ` (ref. ${order.payment.reference})` : ""} haya llegado antes de confirmarlo.
              </p>
            )}
          </section>

          <section className="a-panel" aria-labelledby="prendas">
            <div className="a-panel__head">
              <h2 id="prendas">Prendas</h2>
              <span className="a-hint">{order.items.reduce((n, i) => n + i.qty, 0)} unidades</span>
            </div>
            <div className="o-items">
              {order.items.map((i) => (
                <div className="o-item" key={`${i.productId}-${i.size}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="thumb" style={{ width: "3rem" }} src={i.image} alt="" width={96} height={120} />
                  <span>
                    {i.qty} × {i.name}
                    <span className="sub">
                      {i.brand} · Talla {i.size} · {usd(i.unitPrice)} c/u
                    </span>
                  </span>
                  <span className="nums">{usd(i.unitPrice * i.qty)}</span>
                </div>
              ))}
            </div>
            <div className="o-totals">
              <div>
                <span>Subtotal</span>
                <span className="nums">{usd(order.subtotal)}</span>
              </div>
              <div>
                <span>{f.method === "retiro" ? "Retiro" : "Envío"}</span>
                <span className="nums">{order.deliveryFee > 0 ? usd(order.deliveryFee) : f.method === "nacional" ? "Cobro a destino" : "Gratis"}</span>
              </div>
              <div className="grand">
                <span>Total</span>
                <span className="nums">{usd(order.total)}</span>
              </div>
              {order.bcvRate > 0 && (
                <div className="soft">
                  <span>A tasa {order.bcvRate.toLocaleString("es-VE", { minimumFractionDigits: 2 })} del día del pedido</span>
                  <span className="nums">{bs(order.totalBs)}</span>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="span-5" style={{ display: "grid", gap: "var(--a-gap)" }}>
          <section className="a-panel" aria-labelledby="entrega">
            <div className="a-panel__head">
              <h2 id="entrega">{FULFILLMENT_LABEL[f.method]}</h2>
            </div>
            <dl className="kv">
              <dt>Cliente</dt>
              <dd>{order.customer.name}</dd>
              <dt>WhatsApp</dt>
              <dd>
                <a href={`https://wa.me/${waNumber(order.customer.phone)}`} target="_blank" rel="noreferrer">
                  {order.customer.phone}
                </a>
              </dd>
              {order.customer.idNumber && (
                <>
                  <dt>Cédula</dt>
                  <dd>{order.customer.idNumber}</dd>
                </>
              )}
              {f.method === "delivery" && (
                <>
                  <dt>Zona</dt>
                  <dd>{f.zoneName}</dd>
                  <dt>Dirección</dt>
                  <dd>{f.address}</dd>
                  {f.reference && (
                    <>
                      <dt>Referencia</dt>
                      <dd>{f.reference}</dd>
                    </>
                  )}
                </>
              )}
              {f.method === "nacional" && (
                <>
                  <dt>Empresa</dt>
                  <dd>{f.courier}</dd>
                  <dt>Destino</dt>
                  <dd>
                    {f.city}, {f.state}
                  </dd>
                  <dt>Agencia</dt>
                  <dd>{f.agency}</dd>
                </>
              )}
              {f.method === "retiro" && (
                <>
                  <dt>Dónde</dt>
                  <dd>{settings.address}</dd>
                </>
              )}
              <dt>Pago</dt>
              <dd>
                {order.payment.methodName}
                {order.payment.reference ? ` · ref. ${order.payment.reference}` : ""}
              </dd>
              {order.notes && (
                <>
                  <dt>Nota del cliente</dt>
                  <dd>{order.notes}</dd>
                </>
              )}
            </dl>
          </section>

          <section className="a-panel" aria-labelledby="historial">
            <div className="a-panel__head">
              <h2 id="historial">Historial</h2>
            </div>
            <ol className="timeline" style={{ marginBottom: "1.25rem" }}>
              {[...order.history].reverse().map((h, i) => (
                <li key={i}>
                  <time dateTime={h.at}>{date(h.at)}</time>
                  <span>
                    {h.note ? (
                      <>
                        <strong style={{ fontWeight: 500 }}>{h.note}</strong> · {STATUS_LABEL[h.status]}
                      </>
                    ) : (
                      STATUS_LABEL[h.status]
                    )}
                  </span>
                </li>
              ))}
            </ol>
            <NoteForm orderId={order.id} />
          </section>
        </div>
      </div>
    </>
  );
}

export default function OrderPage(props: PageProps<"/admin/pedidos/[id]">) {
  return (
    <Suspense fallback={<div className="sk" style={{ minHeight: "60svh" }} aria-busy="true" />}>
      <OrderDetail params={props.params} />
    </Suspense>
  );
}
