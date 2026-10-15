import type { Order, OrderStatus, PaymentStatus, Product, Settings } from "../types";

export type NewOrder = Omit<Order, "id" | "code" | "createdAt" | "status" | "paymentStatus" | "history">;

export type OrderPatch = {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  note?: string;
};

export class OutOfStockError extends Error {
  constructor(public readonly item: { name: string; size: string; available: number }) {
    super(`Sin stock suficiente de ${item.name} talla ${item.size}`);
  }
}

export interface Store {
  readonly kind: "memory" | "postgres";
  listProducts(): Promise<Product[]>;
  getProduct(idOrSlug: string): Promise<Product | null>;
  saveProduct(product: Product): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<Settings>;
  /** Reserva el stock y crea el pedido en una sola operación. Lanza OutOfStockError si algo se agotó. */
  createOrder(order: NewOrder): Promise<Order>;
  listOrders(): Promise<Order[]>;
  getOrder(idOrCode: string): Promise<Order | null>;
  /** Cambia estado o pago. Cancelar devuelve el stock; reactivar un pedido cancelado lo vuelve a reservar. */
  updateOrder(id: string, patch: OrderPatch): Promise<Order>;
  deleteDemoOrders(): Promise<number>;
  /** Uploaded product photos, kept as compressed WebP and served from /api/imagen/[id]. */
  saveImage(image: StoredImage): Promise<void>;
  getImage(id: string): Promise<StoredImage | null>;
}

export type StoredImage = { id: string; mime: string; base64: string };
