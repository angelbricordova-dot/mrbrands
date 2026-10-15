"use client";

import { useState, useTransition } from "react";
import { deleteDemoOrders, refreshBcvRate, saveSettings } from "@/app/admin/actions";
import type { Settings } from "@/lib/types";
import { IconPlus, IconRefresh, IconTrash } from "./icons";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="set-section">
      <header>
        <h2>{title}</h2>
        {hint && <p>{hint}</p>}
      </header>
      <div className="set-body">{children}</div>
    </section>
  );
}

const num = (v: string) => (v.trim() === "" ? Number.NaN : Number(v.replace(",", ".")));

export function SettingsForm({ initial, liveRate, hasDemo }: { initial: Settings; liveRate: number | null; hasDemo: boolean }) {
  const [s, setS] = useState(initial);
  const [rateText, setRateText] = useState(initial.bcvRate ? String(initial.bcvRate) : "");
  const [couriersText, setCouriersText] = useState(initial.couriers.join(", "));
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [bcvPending, startBcv] = useTransition();
  const [demoPending, startDemo] = useTransition();
  const [demoGone, setDemoGone] = useState(false);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setS((cur) => ({ ...cur, [key]: value }));
  const err = (k: string) => fields[k];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setFields({});
    start(async () => {
      const r = await saveSettings({
        whatsapp: s.whatsapp,
        instagram: s.instagram,
        tiktok: s.tiktok,
        address: s.address,
        mapsUrl: s.mapsUrl,
        bcvAuto: s.bcvAuto,
        bcvRate: Number.isFinite(num(rateText)) ? num(rateText) : 0,
        deliveryZones: s.deliveryZones,
        couriers: couriersText.split(",").map((c) => c.trim()).filter(Boolean),
        nationalNote: s.nationalNote,
        nationalFee: s.nationalFee,
        paymentMethods: s.paymentMethods,
        cashea: s.cashea,
        hours: s.hours,
      });
      setMessage(r.ok ? { ok: true, text: r.message ?? "Guardado." } : { ok: false, text: r.error });
      if (!r.ok) setFields(r.fields ?? {});
    });
  };

  return (
    <form onSubmit={submit} noValidate>
      <Section title="Tasa BCV" hint="Los precios se cargan en dólares y la tienda muestra el equivalente en bolívares con esta tasa.">
        <div className="rate-box">
          <div>
            <span className="a-hint">{s.bcvAuto ? "Tasa oficial de hoy" : "Tasa que estás usando"}</span>
            <div className="big">
              {s.bcvAuto && liveRate
                ? liveRate.toLocaleString("es-VE", { minimumFractionDigits: 2 })
                : Number.isFinite(num(rateText)) && num(rateText) > 0
                  ? num(rateText).toLocaleString("es-VE", { minimumFractionDigits: 2 })
                  : "Sin tasa"}
            </div>
            {s.bcvAuto && !liveRate && <span className="a-hint">No se pudo leer la tasa oficial ahora; se usa la de abajo.</span>}
          </div>
          <button
            type="button"
            className="a-btn"
            disabled={bcvPending}
            onClick={() =>
              startBcv(async () => {
                const r = await refreshBcvRate();
                if (r.ok && r.rate) setRateText(String(r.rate));
                setMessage(r.ok ? { ok: true, text: r.message ?? "" } : { ok: false, text: r.error });
              })
            }
          >
            <IconRefresh /> {bcvPending ? "Consultando…" : "Traer tasa oficial"}
          </button>
        </div>
        <label className="a-switch">
          <input type="checkbox" checked={s.bcvAuto} onChange={(e) => set("bcvAuto", e.target.checked)} />
          Actualizar la tasa sola cada hora
        </label>
        <label className="a-field" style={{ maxWidth: "16rem" }}>
          <span>{s.bcvAuto ? "Tasa de respaldo" : "Tasa manual"} (Bs por dólar)</span>
          <input className="a-input a-input--money" inputMode="decimal" value={rateText} onChange={(e) => setRateText(e.target.value)} placeholder="Ej. 210,50" />
        </label>
      </Section>

      <Section title="Delivery en Maracay" hint="Cada zona con su precio. El cliente elige la suya al hacer el pedido.">
        <div className="rows">
          {s.deliveryZones.map((z, i) => (
            <div className="row-edit" key={z.id}>
              <input
                className="a-input"
                value={z.name}
                aria-label="Zona"
                onChange={(e) => set("deliveryZones", s.deliveryZones.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))}
              />
              <input
                className="a-input a-input--money"
                inputMode="decimal"
                aria-label={`Precio de ${z.name}`}
                value={Number.isFinite(z.fee) ? String(z.fee) : ""}
                onChange={(e) => set("deliveryZones", s.deliveryZones.map((x, k) => (k === i ? { ...x, fee: num(e.target.value) } : x)))}
              />
              <button type="button" className="a-btn a-btn--ghost a-btn--sm" aria-label={`Quitar ${z.name}`} disabled={s.deliveryZones.length === 1} onClick={() => set("deliveryZones", s.deliveryZones.filter((_, k) => k !== i))}>
                <IconTrash />
              </button>
            </div>
          ))}
        </div>
        <div>
          <button type="button" className="a-btn a-btn--sm" onClick={() => set("deliveryZones", [...s.deliveryZones, { id: `z_${Date.now().toString(36)}`, name: "", fee: 3 }])}>
            <IconPlus /> Agregar zona
          </button>
        </div>
        {err("deliveryZones") && <p className="a-err">{err("deliveryZones")}</p>}
      </Section>

      <Section title="Envíos nacionales" hint="Para clientes fuera de Maracay.">
        <div className="a-fields">
          <label className="a-field full">
            <span>Empresas de envío</span>
            <input className="a-input" value={couriersText} onChange={(e) => setCouriersText(e.target.value)} placeholder="MRW, Zoom, Tealca" />
            <small>Sepáralas con comas.</small>
          </label>
          <label className="a-field">
            <span>Cargo fijo en dólares</span>
            <input className="a-input a-input--money" inputMode="decimal" value={Number.isFinite(s.nationalFee) ? String(s.nationalFee) : ""} onChange={(e) => set("nationalFee", num(e.target.value))} />
            <small>Deja 0 si el envío se paga en destino.</small>
          </label>
          <label className="a-field full">
            <span>Nota para el cliente</span>
            <input className="a-input" value={s.nationalNote} onChange={(e) => set("nationalNote", e.target.value)} maxLength={200} />
          </label>
        </div>
      </Section>

      <Section title="Métodos de pago" hint="Lo que escribas en los datos lo ve el cliente al pagar.">
        <div className="rows">
          {s.paymentMethods.map((m, i) => (
            <div className="pay-row" key={m.id}>
              <div className="pay-row__top">
                <strong style={{ fontWeight: 500 }}>{m.name}</strong>
                <label className="a-switch">
                  <input
                    type="checkbox"
                    checked={m.enabled}
                    onChange={(e) => set("paymentMethods", s.paymentMethods.map((x, k) => (k === i ? { ...x, enabled: e.target.checked } : x)))}
                  />
                  {m.enabled ? "Activo" : "Apagado"}
                </label>
              </div>
              <label className="a-field">
                <span className="sr-only">Datos de {m.name}</span>
                <textarea
                  className="a-input"
                  style={{ minHeight: "3.5rem" }}
                  value={m.details}
                  onChange={(e) => set("paymentMethods", s.paymentMethods.map((x, k) => (k === i ? { ...x, details: e.target.value } : x)))}
                  maxLength={240}
                />
              </label>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Cashea" hint="Cómo se calcula el plan de cuotas que ve el cliente en cada producto.">
        <label className="a-switch">
          <input type="checkbox" checked={s.cashea.enabled} onChange={(e) => set("cashea", { ...s.cashea, enabled: e.target.checked })} />
          Mostrar cuotas de Cashea en la tienda
        </label>
        <div className="a-fields" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          <label className="a-field">
            <span>Inicial (%)</span>
            <input className="a-input a-input--money" inputMode="numeric" value={String(s.cashea.initialPct)} onChange={(e) => set("cashea", { ...s.cashea, initialPct: num(e.target.value) })} />
          </label>
          <label className="a-field">
            <span>Cuotas</span>
            <input className="a-input a-input--money" inputMode="numeric" value={String(s.cashea.installments)} onChange={(e) => set("cashea", { ...s.cashea, installments: num(e.target.value) })} />
          </label>
          <label className="a-field">
            <span>Cada (días)</span>
            <input className="a-input a-input--money" inputMode="numeric" value={String(s.cashea.everyDays)} onChange={(e) => set("cashea", { ...s.cashea, everyDays: num(e.target.value) })} />
          </label>
        </div>
      </Section>

      <Section title="Horario" hint="La tienda muestra en vivo si está abierta, en hora de Maracay.">
        <div className="hours-grid">
          {s.hours.map((h, i) => (
            <div key={h.day} style={{ display: "contents" }}>
              <span style={{ fontWeight: 500 }}>{h.label}</span>
              <input
                className="a-input"
                type="time"
                aria-label={`${h.label}, abre`}
                value={h.open}
                disabled={h.closed}
                onChange={(e) => set("hours", s.hours.map((x, k) => (k === i ? { ...x, open: e.target.value } : x)))}
              />
              <input
                className="a-input"
                type="time"
                aria-label={`${h.label}, cierra`}
                value={h.close}
                disabled={h.closed}
                onChange={(e) => set("hours", s.hours.map((x, k) => (k === i ? { ...x, close: e.target.value } : x)))}
              />
              <label className="a-switch" style={{ fontSize: "var(--t-sm)" }}>
                <input type="checkbox" checked={!h.closed} onChange={(e) => set("hours", s.hours.map((x, k) => (k === i ? { ...x, closed: !e.target.checked } : x)))} />
                <span className="sr-only">{h.label} abierto</span>
              </label>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Contacto" hint="Sale en la tienda, en el pie de página y en los mensajes de WhatsApp.">
        <div className="a-fields">
          <label className="a-field">
            <span>WhatsApp de la tienda</span>
            <input className="a-input" inputMode="tel" value={s.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} aria-invalid={err("whatsapp") ? true : undefined} />
            {err("whatsapp") ? <span className="a-err">{err("whatsapp")}</span> : <small>Con código de país: 584122934158</small>}
          </label>
          <label className="a-field">
            <span>Instagram</span>
            <input className="a-input" value={s.instagram} onChange={(e) => set("instagram", e.target.value)} />
          </label>
          <label className="a-field">
            <span>TikTok</span>
            <input className="a-input" value={s.tiktok} onChange={(e) => set("tiktok", e.target.value)} />
          </label>
          <label className="a-field">
            <span>Dirección</span>
            <input className="a-input" value={s.address} onChange={(e) => set("address", e.target.value)} aria-invalid={err("address") ? true : undefined} />
            {err("address") && <span className="a-err">{err("address")}</span>}
          </label>
          <label className="a-field full">
            <span>Enlace de Google Maps</span>
            <input className="a-input" value={s.mapsUrl} onChange={(e) => set("mapsUrl", e.target.value)} aria-invalid={err("mapsUrl") ? true : undefined} />
            {err("mapsUrl") && <span className="a-err">{err("mapsUrl")}</span>}
          </label>
        </div>
      </Section>

      {hasDemo && !demoGone && (
        <Section title="Pedidos de demostración" hint="Se crearon para enseñar el panel. Bórralos antes de abrir la tienda.">
          <div>
            <button
              type="button"
              className="a-btn a-btn--danger"
              disabled={demoPending}
              onClick={() =>
                startDemo(async () => {
                  const r = await deleteDemoOrders();
                  if (r.ok) setDemoGone(true);
                  setMessage(r.ok ? { ok: true, text: r.message ?? "" } : { ok: false, text: r.error });
                })
              }
            >
              <IconTrash /> {demoPending ? "Borrando…" : "Borrar pedidos de demostración"}
            </button>
          </div>
        </Section>
      )}

      <div className="savebar">
        <span className={`savebar__msg ${message ? (message.ok ? "is-ok" : "is-err") : ""}`} role="status">
          {message?.text}
        </span>
        <button type="submit" className="a-btn a-btn--primary a-btn--lg" disabled={pending} aria-busy={pending}>
          {pending ? "Guardando…" : "Guardar ajustes"}
        </button>
      </div>
    </form>
  );
}
