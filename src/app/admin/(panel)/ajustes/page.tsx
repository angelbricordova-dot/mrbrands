import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsForm } from "@/components/admin/settings-form";
import { getAdminOrders, getAdminSettings, storeKind } from "@/lib/admin-data";
import { getOfficialRate } from "@/lib/bcv";

export const metadata: Metadata = { title: "Ajustes" };

async function Settings() {
  const [settings, orders, live] = await Promise.all([getAdminSettings(), getAdminOrders(), getOfficialRate()]);
  return (
    <>
      <header className="a-top">
        <div>
          <h1>Ajustes</h1>
          <p>
            Todo lo que cambies aquí se ve en la tienda al guardar.{" "}
            {storeKind() === "postgres" ? "Los datos se guardan en la base de datos." : "Ahora mismo los datos viven en memoria (modo demostración)."}
          </p>
        </div>
      </header>
      <SettingsForm initial={settings} liveRate={live?.rate ?? null} hasDemo={orders.some((o) => o.demo)} />
    </>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="sk" style={{ minHeight: "60svh" }} aria-busy="true" />}>
      <Settings />
    </Suspense>
  );
}
