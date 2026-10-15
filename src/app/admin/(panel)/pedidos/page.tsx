import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { dayKey, getAdminOrders, queueOf, type Queue } from "@/lib/admin-data";
import { usd } from "@/lib/format";
import { FULFILLMENT_LABEL, STATUS_LABEL, type Order } from "@/lib/types";

export const metadata: Metadata = { title: "Pedidos" };

const FILTERS: { id: "todos" | Queue | "entregados" | "cancelados"; label: string; match: (o: Order) => boolean }[] = [
  { id: "todos", label: "Todos", match: () => true },
  { id: "cobrar", label: "Por cobrar", match: (o) => queueOf(o) === "cobrar" },
  { id: "preparar", label: "Por preparar", match: (o) => queueOf(o) === "preparar" },
  { id: "entregar", label: "Por entregar", match: (o) => queueOf(o) === "entregar" },
  { id: "entregados", label: "Entregados", match: (o) => o.status === "entregado" },
  { id: "cancelados", label: "Cancelados", match: (o) => o.status === "cancelado" },
];

function when(iso: string) {
  const d = new Date(iso);
  const date = dayKey(d) === dayKey(new Date()) ? "Hoy" : new Intl.DateTimeFormat("es-VE", { day: "numeric", month: "short", timeZone: "America/Caracas" }).format(d);
  return `${date}, ${new Intl.DateTimeFormat("es-VE", { hour: "numeric", minute: "2-digit", timeZone: "America/Caracas" }).format(d)}`;
}

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

async function OrdersList({ searchParams }: { searchParams: PageProps<"/admin/pedidos">["searchParams"] }) {
  const [orders, sp] = await Promise.all([getAdminOrders(), searchParams]);
  const estado = typeof sp.estado === "string" ? sp.estado : "todos";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const filter = FILTERS.find((f) => f.id === estado) ?? FILTERS[0];
  const needle = normalize(q);
  const digits = q.replace(/\D/g, "");
  const shown = orders.filter(
    (o) =>
      filter.match(o) &&
      (!q ||
        normalize(o.code).includes(needle) ||
        normalize(o.customer.name).includes(needle) ||
        (digits.length >= 3 && o.customer.phone.replace(/\D/g, "").includes(digits))),
  );
  const href = (id: string) => {
    const p = new URLSearchParams();
    if (id !== "todos") p.set("estado", id);
    if (q) p.set("q", q);
    const s = p.toString();
    return `/admin/pedidos${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <header className="a-top">
        <div>
          <h1>Pedidos</h1>
          <p>{orders.length} en total. Toca uno para ver los datos de entrega y avanzarlo.</p>
        </div>
      </header>
      <nav className="a-seg" aria-label="Filtrar por estado" style={{ marginBottom: "1rem" }}>
        {FILTERS.map((f) => (
          <Link key={f.id} href={href(f.id)} aria-current={f.id === filter.id ? "page" : undefined} scroll={false}>
            {f.label} <span className="n">{orders.filter(f.match).length}</span>
          </Link>
        ))}
      </nav>
      <form className="a-search" role="search" action="/admin/pedidos">
        {filter.id !== "todos" && <input type="hidden" name="estado" value={filter.id} />}
        <input className="a-input" type="search" name="q" defaultValue={q} placeholder="Buscar por código, nombre o teléfono" aria-label="Buscar pedidos" />
        <button className="a-btn" type="submit">
          Buscar
        </button>
        {q && (
          <Link className="a-btn a-btn--ghost" href={href(filter.id).replace(/[?&]q=[^&]*/, "")}>
            Limpiar
          </Link>
        )}
      </form>

      {shown.length === 0 ? (
        <div className="a-panel a-empty">
          <strong>{q ? `Nada coincide con “${q}”.` : "No hay pedidos aquí."}</strong>
          <p>
            {q
              ? "Prueba con el código (MB-1024), parte del nombre o los últimos dígitos del teléfono."
              : "Cuando un cliente haga un pedido en la tienda aparece aquí al instante, con su pago y dirección."}
          </p>
        </div>
      ) : (
        <>
          <div className="a-panel a-panel--flush o-table">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Entrega</th>
                  <th>Pago</th>
                  <th className="r">Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link className="rowlink" href={`/admin/pedidos/${o.id}`}>
                        {o.code}
                      </Link>
                      <span className="sub">{when(o.createdAt)}</span>
                    </td>
                    <td>
                      {o.customer.name} {o.demo && <span className="tag-demo">demo</span>}
                      <span className="sub">{o.customer.phone}</span>
                    </td>
                    <td>
                      {FULFILLMENT_LABEL[o.fulfillment.method]}
                      <span className="sub">
                        {o.fulfillment.method === "delivery" ? o.fulfillment.zoneName : o.fulfillment.method === "nacional" ? `${o.fulfillment.courier} · ${o.fulfillment.city}` : "CC Estación Central"}
                      </span>
                    </td>
                    <td>
                      {o.payment.methodName}
                      <span className={`pill pill--pay-${o.paymentStatus}`}>{o.paymentStatus === "verificado" ? "Verificado" : o.paymentStatus === "reembolsado" ? "Reembolsado" : "Por verificar"}</span>
                    </td>
                    <td className="r">{usd(o.total)}</td>
                    <td>
                      <span className={`pill pill--${o.status}`}>{STATUS_LABEL[o.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="o-cards">
            {shown.map((o) => (
              <Link key={o.id} href={`/admin/pedidos/${o.id}`} className="o-card">
                <strong>
                  {o.code} · {o.customer.name}
                </strong>
                <span className="nums" style={{ fontWeight: 500 }}>
                  {usd(o.total)}
                </span>
                <span className="meta">
                  <span className={`pill pill--${o.status}`}>{STATUS_LABEL[o.status]}</span>
                  {FULFILLMENT_LABEL[o.fulfillment.method]} · {o.payment.methodName} · {when(o.createdAt)}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export default function OrdersPage(props: PageProps<"/admin/pedidos">) {
  return (
    <Suspense fallback={<div className="sk" style={{ minHeight: "60svh" }} aria-busy="true" />}>
      <OrdersList searchParams={props.searchParams} />
    </Suspense>
  );
}
