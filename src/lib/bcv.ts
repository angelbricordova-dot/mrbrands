import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Settings } from "./types";

export const BCV_TAG = "bcv";

/**
 * Official BCV rate from the public DolarApi mirror (ve.dolarapi.com), cached for an hour.
 * Returns null when the service can't be reached; callers keep the rate saved in Ajustes.
 */
export async function getOfficialRate(): Promise<{ rate: number; date: string } | null> {
  "use cache";
  cacheTag(BCV_TAG);
  cacheLife({ stale: 1800, revalidate: 3600, expire: 86400 });
  try {
    const res = await fetch("https://ve.dolarapi.com/v1/dolares/oficial", { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { promedio?: number; venta?: number; fechaActualizacion?: string };
    const rate = Number(data.promedio ?? data.venta);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    return { rate: Math.round(rate * 100) / 100, date: data.fechaActualizacion ?? "" };
  } catch {
    return null;
  }
}

/** Applies the live rate when the owner left "tasa automática" on. */
export async function withLiveRate(settings: Settings): Promise<Settings> {
  if (!settings.bcvAuto) return settings;
  const live = await getOfficialRate();
  return live ? { ...settings, bcvRate: live.rate, bcvUpdatedAt: live.date || settings.bcvUpdatedAt } : settings;
}
