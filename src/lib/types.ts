export type Category = "franelas" | "gorras" | "pantalones" | "shorts" | "hoodies" | "accesorios";

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "franelas", label: "Franelas" },
  { id: "gorras", label: "Gorras" },
  { id: "pantalones", label: "Monos y pantalones" },
  { id: "shorts", label: "Jorts y shorts" },
  { id: "hoodies", label: "Hoodies" },
  { id: "accesorios", label: "Accesorios" },
];

export type Variant = { size: string; stock: number };

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: Category;
  /** Precio en dólares a tasa BCV */
  price: number;
  description: string;
  images: string[];
  variants: Variant[];
  active: boolean;
  featured: boolean;
  sort: number;
  createdAt: string;
};

export type FulfillmentMethod = "retiro" | "delivery" | "nacional";

export const FULFILLMENT_LABEL: Record<FulfillmentMethod, string> = {
  retiro: "Retiro en tienda",
  delivery: "Delivery en Maracay",
  nacional: "Envío nacional",
};

export type OrderStatus =
  | "nuevo"
  | "confirmado"
  | "preparando"
  | "en_camino"
  | "listo_retiro"
  | "entregado"
  | "cancelado";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  nuevo: "Nuevo",
  confirmado: "Confirmado",
  preparando: "Preparando",
  en_camino: "En camino",
  listo_retiro: "Listo para retirar",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export type PaymentStatus = "pendiente" | "verificado" | "reembolsado";

export type OrderItem = {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  size: string;
  qty: number;
  unitPrice: number;
  image: string;
};

export type Order = {
  id: string;
  code: string;
  createdAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  customer: { name: string; phone: string; idNumber?: string; email?: string };
  fulfillment: {
    method: FulfillmentMethod;
    zoneId?: string;
    zoneName?: string;
    address?: string;
    reference?: string;
    courier?: string;
    state?: string;
    city?: string;
    agency?: string;
  };
  payment: { methodId: string; methodName: string; reference?: string };
  notes?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  bcvRate: number;
  totalBs: number;
  history: { at: string; status: OrderStatus; note?: string }[];
};

export type DeliveryZone = { id: string; name: string; fee: number };

export type PaymentMethod = {
  id: string;
  name: string;
  enabled: boolean;
  /** Instrucciones que ve el cliente al pagar (datos bancarios, correo de Zelle, etc.) */
  details: string;
  needsReference: boolean;
};

export type DayHours = { day: number; label: string; open: string; close: string; closed?: boolean };

export type Settings = {
  storeName: string;
  whatsapp: string;
  instagram: string;
  tiktok: string;
  address: string;
  mapsUrl: string;
  bcvRate: number;
  bcvUpdatedAt: string;
  deliveryZones: DeliveryZone[];
  couriers: string[];
  nationalNote: string;
  nationalFee: number;
  paymentMethods: PaymentMethod[];
  cashea: { enabled: boolean; initialPct: number; installments: number; everyDays: number };
  hours: DayHours[];
};
