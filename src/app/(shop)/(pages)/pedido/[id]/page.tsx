import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type CSSProperties } from "react";
import { AutoRefresh } from "@/components/shop/auto-refresh";
import { getShopSettings } from "@/lib/catalog";
import { bs, orderWhatsappText, usd, waLink } from "@/lib/format";
import { store } from "@/lib/store";
import { FULFILLMENT_LABEL, STATUS_LABEL, type Order, type OrderStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Tu boleto", robots: { index: false } };

function track(order: Order): OrderStatus[] {
  return order.fulfillment.method === "retiro"
    ? ["nuevo", "confirmado", "preparando", "listo_retiro", "entregado"]
    : ["nuevo", "confirmado", "preparando", "en_camino", "entregado"];
}

function destination(order: Order) {
  const f = order.fulfillment;
  if (f.method === "retiro") return { title: "Retiro en tienda", sub: "CC Estación Central" };
  if (f.method === "delivery") return { title: f.zoneName ?? "Maracay", sub: f.address ?? "" };
  return { title: `${f.city}, ${f.state}`, sub: `${f.courier} · ${f.agency}` };
}

async function Ticket({ params }: { params: PageProps<"/pedido/[id]">["params"] }) {
  const { id } = await params;
  const [order, settings] = await Promise.all([store().getOrder(id), getShopSettings()]);
  // Only the private id opens a ticket; the short code alone is not enough.
  if (!order || order.id !== id) notFound();

  const steps = track(order);
  const now = steps.indexOf(order.status);
  const to = destination(order);
  const pay = settings.paymentMethods.find((m) => m.id === order.payment.methodId);
  const date = new Intl.DateTimeFormat("es-VE", { dateStyle: "long", timeStyle: "short", timeZone: "America/Caracas" }).format(new Date(order.createdAt));

  return (
    <div className="ticket-page">
      <div className="ticket-page__intro">
        <h1>{order.status === "cancelado" ? "Pedido cancelado" : order.status === "entregado" ? "¡Entregado!" : "¡Listo, va en camino!"}</h1>
        <p className="lead">
          {order.status === "cancelado"
            ? "Este pedido se canceló. Si fue un error, escríbenos y lo resolvemos."
            : order.paymentStatus === "verificado"
              ? "Tu pago está verificado. Te avisamos por WhatsApp en cada paso."
              : "Apartamos tus prendas. Envíanos el comprobante por WhatsApp para confirmar el pago."}
        </p>
        <div className="actions">
          <a className="button" href={waLink(settings.whatsapp, orderWhatsappText(order))} target="_blank" rel="noreferrer">
            {order.paymentStatus === "verificado" ? "Escribir a la tienda" : "Enviar comprobante por WhatsApp"} <span className="arrow">↗</span>
          </a>
          <Link href="/tienda" className="button button--quiet">
            Seguir comprando
          </Link>
        </div>
        <p className="fine" style={{ marginTop: "1.25rem" }}>
          Guarda esta página: el estado de tu pedido se actualiza aquí solo.
        </p>
      </div>

      <article className="ticket" aria-label={`Boleto del pedido ${order.code}`}>
        <div className="ticket__top">
          <div>
            <span className="fine" style={{ color: "rgb(244 243 241 / 0.8)" }}>
              Boleto
            </span>
            <div className="ticket__code">{order.code}</div>
          </div>
          <span className="small" style={{ textAlign: "right" }}>
            {date}
          </span>
        </div>
        <div className="ticket__route">
          <div>
            <small>Sale de</small>
            <strong>Estación Central</strong>
          </div>
          <span className="train" aria-hidden>
            →
          </span>
          <div>
            <small>{FULFILLMENT_LABEL[order.fulfillment.method]}</small>
            <strong>{to.title}</strong>
            <small>{to.sub}</small>
          </div>
        </div>
        <div className="ticket__tear" aria-hidden>
          <div className="ticket__perf">
            {Array.from({ length: 28 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
        </div>
        <div className="ticket__body">
          {order.status === "cancelado" ? (
            <p className="ticket__cancelled">Cancelado</p>
          ) : (
            <ol className="track" style={{ "--n": steps.length } as CSSProperties} aria-label="Estado del pedido">
              {steps.map((s, i) => (
                <li key={s} className={`track__step ${i < now ? "is-done" : i === now ? "is-now" : ""}`} aria-current={i === now ? "step" : undefined}>
                  <span>{STATUS_LABEL[s]}</span>
                </li>
              ))}
            </ol>
          )}
          <div className="summary__items">
            {order.items.map((i) => (
              <div className="summary__item" key={`${i.productId}-${i.size}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.image} alt="" width={112} height={140} />
                <span>
                  {i.qty} × {i.name}
                  <span className="sub">
                    {i.brand} · Talla {i.size}
                  </span>
                </span>
                <span className="nums">{usd(i.unitPrice * i.qty)}</span>
              </div>
            ))}
          </div>
          <div className="totals">
            <div>
              <span>Subtotal</span>
              <span className="nums">{usd(order.subtotal)}</span>
            </div>
            <div>
              <span>{order.fulfillment.method === "retiro" ? "Retiro" : "Envío"}</span>
              <span className="nums">{order.deliveryFee > 0 ? usd(order.deliveryFee) : order.fulfillment.method === "nacional" ? "Cobro a destino" : "Gratis"}</span>
            </div>
            <div className="grand">
              <span>Total</span>
              <span className="nums">{usd(order.total)}</span>
            </div>
            {order.bcvRate > 0 && (
              <div className="soft">
                <span>A tasa BCV {order.bcvRate.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
                <span className="nums">{bs(order.totalBs)}</span>
              </div>
            )}
          </div>
          <div className="ticket__grid">
            <div>
              <small>Pasajero</small>
              <strong>{order.customer.name}</strong>
            </div>
            <div>
              <small>WhatsApp</small>
              <strong>{order.customer.phone}</strong>
            </div>
            <div>
              <small>Pago</small>
              <strong>
                {order.payment.methodName} · {order.paymentStatus === "verificado" ? "verificado" : order.paymentStatus === "reembolsado" ? "reembolsado" : "por confirmar"}
              </strong>
            </div>
            {order.payment.reference && (
              <div>
                <small>Referencia</small>
                <strong>{order.payment.reference}</strong>
              </div>
            )}
          </div>
          {order.paymentStatus === "pendiente" && order.status !== "cancelado" && pay && (
            <div className="pay-details">
              <span className="fine">Datos para pagar con {pay.name}</span>
              <p>{pay.details}</p>
            </div>
          )}
        </div>
      </article>
      <AutoRefresh seconds={30} />
    </div>
  );
}

export default function TicketPage(props: PageProps<"/pedido/[id]">) {
  return (
    <Suspense fallback={<div className="ticket-page" style={{ minHeight: "80svh" }} aria-busy="true" />}>
      <Ticket params={props.params} />
    </Suspense>
  );
}
