import type { DayHours, Order, Settings } from "./types";

export function usd(value: number) {
  const whole = Number.isInteger(value);
  return `$${value.toLocaleString("es-VE", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

export function bs(value: number) {
  return `Bs ${value.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function toBs(priceUsd: number, rate: number) {
  return Math.round(priceUsd * rate * 100) / 100;
}

export function cashePlan(total: number, cashea: Settings["cashea"]) {
  const initial = Math.round(total * (cashea.initialPct / 100) * 100) / 100;
  const rest = Math.round((total - initial) * 100) / 100;
  const each = Math.round((rest / cashea.installments) * 100) / 100;
  return { initial, each, installments: cashea.installments, everyDays: cashea.everyDays };
}

export function waLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

export function prettyPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("58") && d.length === 12) return `+58 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  return phone;
}

export function orderWhatsappText(order: Order) {
  const lines = order.items.map((i) => `• ${i.qty} × ${i.name} (talla ${i.size}) — ${usd(i.unitPrice * i.qty)}`);
  const f = order.fulfillment;
  const where =
    f.method === "retiro"
      ? "Retiro en tienda"
      : f.method === "delivery"
        ? `Delivery · ${f.zoneName ?? ""} · ${f.address ?? ""}`
        : `Envío nacional · ${f.courier} · ${f.city}, ${f.state}`;
  return [
    `¡Hola Mr.Brands! Hice el pedido ${order.code}`,
    ...lines,
    `Total: ${usd(order.total)} (${bs(order.totalBs)})`,
    where,
    `Pago: ${order.payment.methodName}${order.payment.reference ? ` · Ref. ${order.payment.reference}` : ""}`,
    `A nombre de ${order.customer.name}`,
  ].join("\n");
}

/** Wall-clock time in Maracay (America/Caracas, UTC−4 all year). */
export function caracasNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Caracas",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export function to12h(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export type OpenState =
  | { open: true; closesAt: string; minutesLeft: number }
  | { open: false; opensLabel: string; opensAt: string };

export function openState(hours: DayHours[], date = new Date()): OpenState {
  const { day, minutes } = caracasNow(date);
  const today = hours.find((h) => h.day === day);
  if (today && !today.closed && minutes >= toMinutes(today.open) && minutes < toMinutes(today.close)) {
    return { open: true, closesAt: to12h(today.close), minutesLeft: toMinutes(today.close) - minutes };
  }
  for (let offset = 0; offset < 8; offset++) {
    const d = (day + offset) % 7;
    const h = hours.find((x) => x.day === d);
    if (!h || h.closed) continue;
    if (offset === 0 && minutes >= toMinutes(h.open)) continue;
    const label = offset === 0 ? "hoy" : offset === 1 ? "mañana" : `el ${h.label.toLowerCase()}`;
    return { open: false, opensLabel: label, opensAt: to12h(h.open) };
  }
  return { open: false, opensLabel: "pronto", opensAt: "" };
}
