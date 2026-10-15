"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconShirt, IconSliders, IconTicket } from "./icons";

const ITEMS = [
  { href: "/admin", label: "Resumen", short: "Resumen", icon: IconHome, exact: true },
  { href: "/admin/pedidos", label: "Pedidos", short: "Pedidos", icon: IconTicket },
  { href: "/admin/productos", label: "Productos", short: "Productos", icon: IconShirt },
  { href: "/admin/ajustes", label: "Ajustes", short: "Ajustes", icon: IconSliders },
];

export function AdminNav({ variant, pending = 0 }: { variant: "side" | "tabs"; pending?: number }) {
  return <NavLinks variant={variant} pending={pending} pathname={usePathname()} />;
}

/** The links alone, with no URL hook: also used as the loading fallback. */
export function NavLinks({ variant, pending = 0, pathname = "" }: { variant: "side" | "tabs"; pending?: number; pathname?: string }) {
  const items = ITEMS.map((item) => {
    const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
    const Icon = item.icon;
    return (
      <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} prefetch>
        <Icon />
        <span>{variant === "side" ? item.label : item.short}</span>
        {item.href === "/admin/pedidos" && pending > 0 && (
          <span className="a-count" aria-label={`${pending} por cobrar`}>
            {pending}
          </span>
        )}
      </Link>
    );
  });
  return variant === "side" ? (
    <nav className="a-nav" aria-label="Panel">
      {items}
    </nav>
  ) : (
    <nav className="a-tabs" aria-label="Panel">
      {items}
    </nav>
  );
}
