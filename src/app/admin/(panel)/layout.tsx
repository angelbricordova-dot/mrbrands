import Link from "next/link";
import { Suspense } from "react";
import { logout } from "@/app/admin/actions";
import { IconLogout, IconStore } from "@/components/admin/icons";
import { AdminNav, NavLinks } from "@/components/admin/nav";
import { Wordmark } from "@/components/shop/wordmark";
import { counts, getAdminOrders, storeKind } from "@/lib/admin-data";
import { DEFAULT_PASSWORD, adminPassword } from "@/lib/session";

async function NavWithCount({ variant }: { variant: "side" | "tabs" }) {
  const orders = await getAdminOrders();
  return <AdminNav variant={variant} pending={counts(orders).cobrar} />;
}

async function SetupNotice() {
  const orders = await getAdminOrders();
  const demo = orders.some((o) => o.demo);
  const memory = storeKind() === "memory";
  const defaultPassword = adminPassword() === DEFAULT_PASSWORD;
  if (!demo && !memory && !defaultPassword) return null;
  return (
    <div className="a-demo" role="note">
      <strong>Modo demostración.</strong>
      {memory && <span>Los datos viven en memoria y se reinician; conecta una base de datos Postgres en Vercel para guardarlos.</span>}
      {demo && <span>Hay pedidos de ejemplo para enseñar el panel; se borran en Ajustes.</span>}
      {defaultPassword && <span>Cambia la contraseña con la variable ADMIN_PASSWORD.</span>}
    </div>
  );
}

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="admin">
      <aside className="a-side">
        <div className="a-side__brand">
          <Wordmark href="/admin" />
          <span>Panel de la tienda</span>
        </div>
        <Suspense fallback={<NavLinks variant="side" />}>
          <NavWithCount variant="side" />
        </Suspense>
        <div className="a-side__foot">
          <Link href="/" target="_blank">
            Ver la tienda ↗
          </Link>
          <form action={logout}>
            <button type="submit">Salir</button>
          </form>
        </div>
      </aside>
      <main className="a-main">
        <div className="a-mobilebar">
          <Wordmark href="/admin" />
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <Link href="/" target="_blank" className="store" aria-label="Ver la tienda">
              <IconStore width={20} height={20} />
            </Link>
            <form action={logout}>
              <button type="submit" className="store" aria-label="Salir" style={{ color: "var(--a-side-muted)", minHeight: "2.5rem" }}>
                <IconLogout width={20} height={20} />
              </button>
            </form>
          </div>
        </div>
        <Suspense fallback={null}>
          <SetupNotice />
        </Suspense>
        {children}
      </main>
      <Suspense fallback={<NavLinks variant="tabs" />}>
        <NavWithCount variant="tabs" />
      </Suspense>
    </div>
  );
}
