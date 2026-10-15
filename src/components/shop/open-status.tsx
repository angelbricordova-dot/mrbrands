"use client";

import { useEffect, useState } from "react";
import { openState, type OpenState } from "@/lib/format";
import type { DayHours } from "@/lib/types";

/** Live "open now" line in Maracay time. Renders after mount, so the prerendered shell never lies about the hour. */
export function OpenStatus({ hours, className = "" }: { hours: DayHours[]; className?: string }) {
  const [state, setState] = useState<OpenState | null>(null);
  useEffect(() => {
    const tick = () => setState(openState(hours));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [hours]);

  if (!state) return <span className={className}>CC Estación Central</span>;
  return (
    <span className={className}>
      <span className={`status-dot ${state.open ? "is-open" : ""}`} aria-hidden />
      {state.open
        ? state.minutesLeft <= 60
          ? `Abierto · cierra en ${state.minutesLeft} min`
          : `Abierto ahora · cierra a las ${state.closesAt}`
        : `Cerrado · abre ${state.opensLabel} a las ${state.opensAt}`}
    </span>
  );
}

export function TodayMarker({ hours }: { hours: DayHours[] }) {
  // Highlights today's row in the hours list once we know the visitor's Maracay date.
  useEffect(() => {
    const day = new Intl.DateTimeFormat("en-US", { timeZone: "America/Caracas", weekday: "short" }).format(new Date());
    const index = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(day);
    document.querySelectorAll<HTMLElement>("[data-day]").forEach((el) => {
      el.classList.toggle("is-today", Number(el.dataset.day) === index);
    });
  }, [hours]);
  return null;
}
