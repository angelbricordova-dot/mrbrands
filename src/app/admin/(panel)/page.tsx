import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type CSSProperties } from "react";
import { IconPlus } from "@/components/admin/icons";
import { StepButton } from "@/components/admin/order-buttons";
import { SalesChart, type Day } from "@/components/admin/sales-chart";
import { dayKey, getAdminOrders, getAdminProducts, getAdminSettings, nextStep, queueOf, type Queue } from "@/lib/admin-data";
import { withLiveRate } from "@/lib/bcv";
import { bs, toBs, usd } from "@/lib/format";
import { FULFILLMENT_LABEL, type Order } from "@/lib/types";

export const metadata: Metadata = { title: "Resumen" };

const QUEUES: { id: Queue; title: string; empty: string }[] = [
  { id: "cobrar", title: "Por cobrar", empty: "Nadie esperando confirmación de pago." },
  { id: "preparar", title: "Por preparar", empty: "No hay pedidos por armar ahora." },
  { id: "entregar", title: "Por entregar", empty: "Nada en la calle ni esperando en tienda." },
];

function shortWhen(iso: string) {
  const d = new Date(iso);
  const today = dayKey(new Date());
  const time = new Intl.DateTimeFormat("es-VE", { hour: "numeric", minute: "2-digit", timeZone: "America/Caracas" }).format(d);
  if (dayKey(d) === today) return time;
  return `${new Intl.DateTimeFormat("es-VE", { day: "numeric", month: "short", timeZone: "America/Caracas" }).format(d)}, ${time}`;
}

function QueueColumn({ id, title, empty, orders }: { id: Queue; title: string; empty: string; orders: Order[] }) {
  const list = orders.filter((o) => queueOf(o) === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return (
    <section className="queue__col" aria-labelledby={`q-${id}`}>
      <div className="queue__head">
        <h2 id={`q-${id}`}>{title}</h2>
        <span className={`n ${list.length === 0 ? "is-zero" : ""}`}>{list.length}</span>
      </div>
      <div className="queue__list">
        {list.length === 0 && <p className="queue__empty">{empty}</p>}
        {list.slice(0, 6).map((o) => {
          const step = nextStep(o);
          return (
            <div key={o.id} className="queue__item">
              <Link href={`/admin/pedidos/${o.id}`} style={{ textDecoration: "none", minWidth: 0 }}>
                <strong>
                  {o.code} · {o.customer.name}
                </strong>
                <span className="queue__meta" style={{ display: "block" }}>
                  {usd(o.total)} · {FULFILLMENT_LABEL[o.fulfillment.method]} · {o.payment.methodName} · {shortWhen(o.createdAt)}
                </span>
              </Link>
              {step && <StepButton orderId={o.id} label={step.label} patch={step.patch} size="sm" variant={id === "cobrar" ? "primary" : "plain"} />}
            </div>
          );
        })}
        {list.length > 6 && (
          <Link className="queue__more" href={`/admin/pedidos?estado=${id}`}>
            Ver los {list.length}
          </Link>
        )}
      </div>
    </section>
  );
}

async function Overview() {
  const [orders, products, saved] = await Promise.all([getAdminOrders(), getAdminProducts(), getAdminSettings()]);
  const settings = await withLiveRate(saved);
  const live = orders.filter((o) => o.status !== "cancelado");
  const now = new Date();
  const todayKey = dayKey(now);

  const byDay = new Map<string, { total: number; count: number }>();
  for (const o of live) {
    const k = dayKey(o.createdAt);
    const cur = byDay.get(k) ?? { total: 0, count: 0 };
    cur.total += o.total;
    cur.count += 1;
    byDay.set(k, cur);
  }
  const days: Day[] = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now.getTime() - (13 - i) * 86400000);
    const key = dayKey(d);
    const v = byDay.get(key) ?? { total: 0, count: 0 };
    return {
      key,
      label: new Intl.DateTimeFormat("es-VE", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Caracas" }).format(d),
      short: new Intl.DateTimeFormat("es-VE", { day: "numeric", timeZone: "America/Caracas" }).format(d),
      total: Math.round(v.total * 100) / 100,
      count: v.count,
      today: key === todayKey,
    };
  });

  const within = (n: number) => {
    const from = now.getTime() - n * 86400000;
    const list = n === 1 ? live.filter((o) => dayKey(o.createdAt) === todayKey) : live.filter((o) => new Date(o.createdAt).getTime() >= from);
    return { total: list.reduce((s, o) => s + o.total, 0), count: list.length };
  };
  const today = within(1);
  const week = within(7);
  const month = within(30);
  const avg = month.count ? month.total / month.count : 0;

  const units = new Map<string, { name: string; brand: string; units: number; productId: string }>();
  for (const o of live.filter((o) => new Date(o.createdAt).getTime() >= now.getTime() - 30 * 86400000)) {
    for (const i of o.items) {
      const cur = units.get(i.productId) ?? { name: i.name, brand: i.brand, units: 0, productId: i.productId };
      cur.units += i.qty;
      units.set(i.productId, cur);
    }
  }
  const top = [...units.values()].sort((a, b) => b.units - a.units).slice(0, 5);
  const topMax = top[0]?.units ?? 1;

  const low = products
    .filter((p) => p.active)
    .flatMap((p) => p.variants.filter((v) => v.stock <= 2).map((v) => ({ p, v })))
    .sort((a, b) => a.v.stock - b.v.stock)
    .slice(0, 8);

  const longDate = new Intl.DateTimeFormat("es-VE", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Caracas" }).format(now);
  const dateLine = longDate.charAt(0).toUpperCase() + longDate.slice(1);
  const rate = settings.bcvRate;

  return (
    <>
      <header className="a-top">
        <div>
          <h1>Hoy en la tienda</h1>
          <p>
            {dateLine}
            {rate > 0 ? ` · Tasa BCV ${rate.toLocaleString("es-VE", { minimumFractionDigits: 2 })}` : " · Sin tasa BCV: configúrala en Ajustes"}
          </p>
        </div>
        <div className="a-top__actions">
          <Link href="/admin/productos/nuevo" className="a-btn">
            <IconPlus /> Nuevo producto
          </Link>
          <Link href="/admin/pedidos" className="a-btn a-btn--ink">
            Todos los pedidos
          </Link>
        </div>
      </header>

      <div className="queue" style={{ marginBottom: "var(--a-gap)" }}>
        {QUEUES.map((q) => (
          <QueueColumn key={q.id} {...q} orders={orders} />
        ))}
      </div>

      <div className="a-grid">
        <section className="a-panel span-8" aria-labelledby="ventas">
          <div className="a-panel__head">
            <h2 id="ventas">Ventas</h2>
            <span className="a-hint">Pedidos no cancelados, en dólares</span>
          </div>
          <dl className="ledger">
            <div>
              <dt>Hoy</dt>
              <dd>
                {usd(today.total)}
                <small>
                  {today.count} {today.count === 1 ? "pedido" : "pedidos"}
                  {rate > 0 && today.total > 0 ? ` · ${bs(toBs(today.total, rate))}` : ""}
                </small>
              </dd>
            </div>
            <div>
              <dt>Últimos 7 días</dt>
              <dd>
                {usd(Math.round(week.total))}
                <small>{week.count} pedidos</small>
              </dd>
            </div>
            <div>
              <dt>Últimos 30 días</dt>
              <dd>
                {usd(Math.round(month.total))}
                <small>{month.count} pedidos</small>
              </dd>
            </div>
            <div>
              <dt>Pedido promedio</dt>
              <dd>
                {usd(Math.round(avg * 100) / 100)}
                <small>en 30 días</small>
              </dd>
            </div>
          </dl>
          <SalesChart days={days} />
        </section>

        <div className="span-4" style={{ display: "grid", gap: "var(--a-gap)" }}>
          <section className="a-panel" aria-labelledby="top">
            <div className="a-panel__head">
              <h2 id="top">Lo más vendido</h2>
              <span className="a-hint">30 días</span>
            </div>
            {top.length === 0 ? (
              <p className="a-hint">Cuando entren pedidos verás aquí qué se mueve más.</p>
            ) : (
              <ol className="rank">
                {top.map((t) => (
                  <li key={t.productId}>
                    <span className="units">{t.units} u.</span>
                    <Link className="name" href={`/admin/productos/${t.productId}`} style={{ textDecoration: "none" }}>
                      {t.name}
                      <span>{t.brand}</span>
                    </Link>
                    <span className="meter" aria-hidden>
                      <span style={{ width: `${(t.units / topMax) * 100}%` } as CSSProperties} />
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <section className="a-panel" aria-labelledby="stock">
            <div className="a-panel__head">
              <h2 id="stock">Stock bajo</h2>
              <Link href="/admin/productos">Productos</Link>
            </div>
            {low.length === 0 ? (
              <p className="a-hint">Todas las tallas tienen 3 o más unidades.</p>
            ) : (
              <ul className="lowstock">
                {low.map(({ p, v }) => (
                  <li key={`${p.id}-${v.size}`}>
                    <Link href={`/admin/productos/${p.id}`} style={{ textDecoration: "none" }}>
                      {p.name} <span className="a-hint">· {v.size}</span>
                    </Link>
                    <span className={`left ${v.stock === 0 ? "is-out" : ""}`}>{v.stock === 0 ? "Agotada" : `Quedan ${v.stock}`}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

export default function AdminHome() {
  return (
    <Suspense fallback={<div className="sk" style={{ minHeight: "70svh" }} aria-busy="true" />}>
      <Overview />
    </Suspense>
  );
}
