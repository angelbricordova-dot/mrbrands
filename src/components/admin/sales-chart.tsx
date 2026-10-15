"use client";

import { useEffect, useRef, useState } from "react";

export type Day = { key: string; label: string; short: string; total: number; count: number; today: boolean };

const H = 220;
const PAD = { top: 22, right: 8, bottom: 26, left: 40 };

function niceMax(v: number) {
  if (v <= 0) return 50;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= v / 4)! * pow;
  return Math.ceil(v / step) * step;
}

const money = (v: number) => `$${v.toLocaleString("es-VE", { maximumFractionDigits: 0 })}`;

/** Daily sales, one series: brand-red columns with 4px rounded tops, square at the baseline. */
export function SalesChart({ days }: { days: Day[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  // Drawn at the real container width so labels stay 11px on a phone instead of shrinking with a viewBox.
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const max = niceMax(Math.max(...days.map((d) => d.total)));
  const ticks = [0, max / 2, max];
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const band = innerW / days.length;
  const barW = Math.min(24, band - 2);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const peak = days.reduce((best, d, i) => (d.total > days[best].total ? i : best), 0);
  const todayIndex = days.findIndex((d) => d.today);

  const bar = (d: Day, i: number) => {
    const x = PAD.left + band * i + (band - barW) / 2;
    const h = Math.max(0, (d.total / max) * innerH);
    const top = PAD.top + innerH - h;
    const r = Math.min(4, h);
    // Rounded data end, square baseline.
    const path =
      h <= 0
        ? `M${x},${PAD.top + innerH - 2}h${barW}v2h${-barW}z`
        : `M${x},${PAD.top + innerH}V${top + r}Q${x},${top} ${x + r},${top}H${x + barW - r}Q${x + barW},${top} ${x + barW},${top + r}V${PAD.top + innerH}z`;
    return { x, top, path };
  };

  const tip = hover !== null ? days[hover] : null;
  const tipBar = hover !== null ? bar(days[hover], hover) : null;

  return (
    <div className="chart" ref={box} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Ventas diarias de los últimos 14 días, en dólares">
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid-line" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="axis-text" x={PAD.left - 8} y={y(t) + 4} textAnchor="end">
              {money(t)}
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          const b = bar(d, i);
          const labelled = (i === peak && d.total > 0) || (i === todayIndex && d.total > 0);
          return (
            <g key={d.key}>
              <path className={`bar ${d.total <= 0 ? "is-zero" : ""} ${hover === i ? "is-active" : ""}`} d={b.path} />
              {labelled && hover === null && (
                <text className="value-label" x={b.x + barW / 2} y={b.top - 6} textAnchor="middle">
                  {money(d.total)}
                </text>
              )}
              {(i % 2 === days.length % 2 || d.today) && (
                <text className="axis-text" x={b.x + barW / 2} y={H - 8} textAnchor="middle" fontWeight={d.today ? 500 : 400}>
                  {d.today ? "Hoy" : d.short}
                </text>
              )}
              <rect
                className="hit"
                x={PAD.left + band * i}
                y={PAD.top}
                width={band}
                height={innerH}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${d.label}: ${money(d.total)}, ${d.count} ${d.count === 1 ? "pedido" : "pedidos"}`}
              />
            </g>
          );
        })}
      </svg>
      {tip && tipBar && (
        <div className="chart-tip" style={{ left: `${((tipBar.x + barW / 2) / W) * 100}%`, top: `${(Math.min(tipBar.top, PAD.top + innerH - 2) / H) * 100}%` }}>
          {tip.label}
          <strong>
            {money(tip.total)} · {tip.count} {tip.count === 1 ? "pedido" : "pedidos"}
          </strong>
        </div>
      )}
      <details className="chart-table">
        <summary>Ver como tabla</summary>
        <table className="a-table">
          <thead>
            <tr>
              <th>Día</th>
              <th className="r">Pedidos</th>
              <th className="r">Ventas</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.key}>
                <td>{d.label}</td>
                <td className="r">{d.count}</td>
                <td className="r">{money(d.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
