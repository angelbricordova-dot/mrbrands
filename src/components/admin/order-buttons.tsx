"use client";

import { useState, useTransition } from "react";
import { updateOrder } from "@/app/admin/actions";
import type { OrderStatus, PaymentStatus } from "@/lib/types";
import { IconCheck } from "./icons";

type Patch = { status?: OrderStatus; paymentStatus?: PaymentStatus; note?: string };

/** One tap to move an order forward. Shows its own pending and error state. */
export function StepButton({
  orderId,
  label,
  patch,
  variant = "primary",
  size = "md",
}: {
  orderId: string;
  label: string;
  patch: Patch;
  variant?: "primary" | "ink" | "plain";
  size?: "sm" | "md" | "lg";
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <span style={{ display: "inline-grid", gap: "0.3rem" }}>
      <button
        type="button"
        className={`a-btn ${variant === "primary" ? "a-btn--primary" : variant === "ink" ? "a-btn--ink" : ""} ${size === "sm" ? "a-btn--sm" : size === "lg" ? "a-btn--lg" : ""}`}
        disabled={pending}
        aria-busy={pending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setError("");
          start(async () => {
            const r = await updateOrder(orderId, patch);
            if (!r.ok) setError(r.error);
          });
        }}
      >
        {!pending && <IconCheck />}
        {pending ? "Guardando…" : label}
      </button>
      {error && (
        <span className="a-err" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}

export function CancelOrder({ orderId, cancelled }: { orderId: string; cancelled: boolean }) {
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const run = (patch: Patch) =>
    start(async () => {
      const r = await updateOrder(orderId, patch);
      if (!r.ok) setError(r.error);
      else setAsking(false);
    });

  if (cancelled) {
    return (
      <span style={{ display: "inline-grid", gap: "0.3rem" }}>
        <button type="button" className="a-btn a-btn--ghost" disabled={pending} onClick={() => run({ status: "nuevo", note: "Pedido reactivado" })}>
          {pending ? "Reactivando…" : "Reactivar pedido"}
        </button>
        {error && <span className="a-err">{error}</span>}
      </span>
    );
  }
  if (!asking) {
    return (
      <button type="button" className="a-btn a-btn--danger" onClick={() => setAsking(true)}>
        Cancelar pedido
      </button>
    );
  }
  return (
    <div className="confirm-row" role="group" aria-label="Confirmar cancelación">
      <p>¿Cancelar este pedido? Las prendas vuelven al stock de la tienda.</p>
      <button type="button" className="a-btn a-btn--primary a-btn--sm" disabled={pending} onClick={() => run({ status: "cancelado", paymentStatus: undefined })}>
        {pending ? "Cancelando…" : "Sí, cancelar"}
      </button>
      <button type="button" className="a-btn a-btn--sm" onClick={() => setAsking(false)} disabled={pending}>
        No
      </button>
      {error && <span className="a-err">{error}</span>}
    </div>
  );
}

export function PaymentToggle({ orderId, status }: { orderId: string; status: PaymentStatus }) {
  const [pending, start] = useTransition();
  const next: PaymentStatus = status === "verificado" ? "pendiente" : "verificado";
  return (
    <button
      type="button"
      className="a-btn a-btn--sm"
      disabled={pending}
      onClick={() => start(async () => void (await updateOrder(orderId, { paymentStatus: next })))}
    >
      {pending ? "Guardando…" : status === "verificado" ? "Marcar como no pagado" : "Marcar pago verificado"}
    </button>
  );
}

export function NoteForm({ orderId }: { orderId: string }) {
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      style={{ display: "grid", gap: "0.5rem" }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!note.trim()) return;
        start(async () => {
          const r = await updateOrder(orderId, { note });
          if (r.ok) setNote("");
        });
      }}
    >
      <label className="a-field">
        <span>Nota interna</span>
        <textarea className="a-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Pagó con dos transferencias, entregar después de las 3 pm…" maxLength={300} />
      </label>
      <div>
        <button type="submit" className="a-btn a-btn--sm" disabled={pending || !note.trim()}>
          {pending ? "Guardando…" : "Agregar nota"}
        </button>
      </div>
    </form>
  );
}
