"use client";

import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  size: string;
  qty: number;
  price: number;
  image: string;
  /** Units left in this size when it was added; the checkout re-checks against the live catalogue. */
  max: number;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  ready: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  add: (line: CartLine) => void;
  setQty: (productId: string, size: string, qty: number) => void;
  remove: (productId: string, size: string) => void;
  clear: () => void;
  bump: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const KEY = "mrbrands-bolsa-v1";

function read(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as CartLine[]) : [];
    return Array.isArray(parsed) ? parsed.filter((l) => l && l.productId && l.qty > 0) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    // Restoring the saved bag after hydration keeps server and client markup identical.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLines(read());
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setLines(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: CartLine[]) => {
    setLines(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* private mode: the bag still works for this visit */
    }
  }, []);

  const add = useCallback(
    (line: CartLine) => {
      const current = read();
      const i = current.findIndex((l) => l.productId === line.productId && l.size === line.size);
      if (i >= 0) {
        current[i] = { ...current[i], ...line, qty: Math.min(current[i].qty + line.qty, line.max) };
      } else {
        current.push({ ...line, qty: Math.min(line.qty, line.max) });
      }
      persist(current);
      setBump((b) => b + 1);
    },
    [persist],
  );

  const setQty = useCallback(
    (productId: string, size: string, qty: number) => {
      persist(
        read().map((l) => (l.productId === productId && l.size === size ? { ...l, qty: Math.max(1, Math.min(qty, l.max)) } : l)),
      );
    },
    [persist],
  );

  const remove = useCallback(
    (productId: string, size: string) => persist(read().filter((l) => !(l.productId === productId && l.size === size))),
    [persist],
  );

  const clear = useCallback(() => persist([]), [persist]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: lines.reduce((n, l) => n + l.qty * l.price, 0),
      ready,
      open,
      setOpen,
      add,
      setQty,
      remove,
      clear,
      bump,
    }),
    [lines, ready, open, add, setQty, remove, clear, bump],
  );

  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart() {
  const ctx = use(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
