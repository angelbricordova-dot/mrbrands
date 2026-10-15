import type { Product, Settings } from "./types";

const CLOTHING = ["S", "M", "L", "XL"];
const WAIST = ["28", "30", "32", "34", "36"];

function sized(sizes: string[], stock: number[]) {
  return sizes.map((size, i) => ({ size, stock: stock[i % stock.length] }));
}

type SeedProduct = Omit<Product, "id" | "createdAt" | "sort" | "active">;

const seed: SeedProduct[] = [
  {
    slug: "camiseta-brand-world-roja",
    name: "Camiseta Brand World Roja",
    brand: "Brand World",
    category: "franelas",
    price: 30,
    description:
      "Camiseta tipo jersey de fútbol con estampado topográfico, el 7 al pecho y las tres estrellas. Tela fresca, corte oversize.",
    images: ["/img/p/brandworld-roja.webp"],
    variants: sized(CLOTHING, [4, 6, 5, 2]),
    featured: true,
  },
  {
    slug: "camiseta-brand-world-blanca",
    name: "Camiseta Brand World Blanca",
    brand: "Brand World",
    category: "franelas",
    price: 30,
    description:
      "Jersey blanco en malla con B.WORLD en rojo y el 7 gigante en la espalda. Para la cancha o para la calle.",
    images: ["/img/p/brandworld-blanca.webp"],
    variants: sized(CLOTHING, [3, 5, 4, 1]),
    featured: true,
  },
  {
    slug: "franela-about-blank-blanca",
    name: "Franela about:blank",
    brand: "about:blank",
    category: "franelas",
    price: 25,
    description: "Franela blanca de algodón pesado con escudo y logo en azul. Hombro caído, cuello firme.",
    images: ["/img/p/aboutblank-blanca.webp"],
    variants: sized(CLOTHING, [5, 7, 6, 3]),
    featured: true,
  },
  {
    slug: "jort-tinta",
    name: "Jort Tinta",
    brand: "Carpediem",
    category: "shorts",
    price: 35,
    description:
      "Jort de denim claro con estampado de tinta a mano, ruedo deshilachado y caída baggy hasta la rodilla.",
    images: ["/img/p/jort-tinta.webp"],
    variants: sized(WAIST, [2, 4, 5, 3, 1]),
    featured: true,
  },
  {
    slug: "mono-odyssea-crema",
    name: "Mono Odyssea Crema",
    brand: "Odyssea",
    category: "pantalones",
    price: 35,
    description: "Mono de felpa color crema, pierna ancha y bordado en el bolsillo trasero.",
    images: ["/img/p/odyssea-crema.webp", "/img/p/odyssea-crema-2.webp"],
    variants: sized(CLOTHING, [3, 6, 6, 2]),
    featured: true,
  },
  {
    slug: "mono-odyssea-negro",
    name: "Mono Odyssea Negro",
    brand: "Odyssea",
    category: "pantalones",
    price: 35,
    description: "El mismo mono Odyssea en negro: pierna ancha, cintura elástica y caída pesada.",
    images: ["/img/p/odyssea-negro.webp", "/img/p/odyssea-negro-2.webp"],
    variants: sized(CLOTHING, [2, 5, 4, 2]),
    featured: false,
  },
  ...(
    [
      ["gorra-five-panel-carpediem-beige", "Gorra Five Panel Carpediem Beige", "Carpediem", "gorra-infinito-beige", true],
      ["gorra-five-panel-carpediem-camo", "Gorra Five Panel Carpediem Camo", "Carpediem", "gorra-infinito-camo", true],
      ["gorra-five-panel-carpediem-vino", "Gorra Five Panel Carpediem Vino", "Carpediem", "gorra-infinito-marron", false],
      ["gorra-five-panel-firma-negra", "Gorra Five Panel Firma Negra", "Carpediem", "gorra-firma-negra", false],
      ["gorra-bars-roja", "Gorra Bars Roja", "Bars", "gorra-bars-roja", true],
      ["gorra-bars-arena", "Gorra Bars Arena", "Bars", "gorra-bars-arena", false],
      ["gorra-bars-chocolate", "Gorra Bars Chocolate", "Bars", "gorra-bars-chocolate", false],
      ["gorra-bars-rayas", "Gorra Bars Rayas", "Bars", "gorra-bars-rayas", false],
    ] as const
  ).map(
    ([slug, name, brand, img, featured]): SeedProduct => ({
      slug,
      name,
      brand,
      category: "gorras",
      price: 25,
      description:
        brand === "Bars"
          ? "Gorra de seis paneles con el logo Bars bordado al frente. Correa ajustable atrás."
          : "Five panel de visera plana con el logo bordado. Ajuste con correa, talla única.",
      images: [`/img/p/${img}.webp`],
      variants: [{ size: "Única", stock: 6 }],
      featured,
    }),
  ),
];

export function seedProducts(): Product[] {
  const now = new Date().toISOString();
  return seed.map((p, i) => ({
    ...p,
    id: `p_${String(i + 1).padStart(3, "0")}`,
    sort: i,
    active: true,
    createdAt: now,
  }));
}

export function defaultSettings(): Settings {
  return {
    storeName: "Mr.Brands",
    whatsapp: "584122934158",
    instagram: "mrbrandsve",
    tiktok: "mrbrandsve",
    address: "CC Estación Central, Maracay, Aragua",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Centro+Comercial+Estaci%C3%B3n+Central+Maracay",
    bcvRate: 0,
    bcvUpdatedAt: "",
    bcvAuto: true,
    deliveryZones: [
      { id: "centro", name: "Centro de Maracay", fee: 2 },
      { id: "norte", name: "Las Delicias · El Limón · Base Aragua", fee: 3 },
      { id: "este", name: "San Jacinto · La Coromoto · Los Samanes", fee: 3 },
      { id: "sur", name: "Caña de Azúcar · San Vicente · La Morita", fee: 4 },
      { id: "afueras", name: "Turmero · Palo Negro · Cagua", fee: 5 },
    ],
    couriers: ["MRW", "Zoom", "Tealca"],
    nationalNote: "El envío nacional se paga al recibir en la agencia (cobro a destino).",
    nationalFee: 0,
    paymentMethods: [
      {
        id: "pago_movil",
        name: "Pago móvil",
        enabled: true,
        details: "Banco de Venezuela (0102) · 0412-2934158 · C.I. V-00.000.000",
        needsReference: true,
      },
      {
        id: "zelle",
        name: "Zelle",
        enabled: true,
        details: "pagos@mrbrands.com · a nombre de Mr.Brands",
        needsReference: true,
      },
      {
        id: "binance",
        name: "Binance Pay (USDT)",
        enabled: true,
        details: "Binance Pay ID 000000000",
        needsReference: true,
      },
      {
        id: "efectivo",
        name: "Efectivo en dólares",
        enabled: true,
        details: "Pagas al retirar en tienda o al recibir el delivery en Maracay.",
        needsReference: false,
      },
      {
        id: "cashea",
        name: "Cashea",
        enabled: true,
        details: "Te escribimos por WhatsApp para procesar la compra con tu app Cashea.",
        needsReference: false,
      },
    ],
    cashea: { enabled: true, initialPct: 40, installments: 3, everyDays: 14 },
    hours: [
      { day: 1, label: "Lunes", open: "09:00", close: "18:00" },
      { day: 2, label: "Martes", open: "09:00", close: "18:00" },
      { day: 3, label: "Miércoles", open: "09:00", close: "18:00" },
      { day: 4, label: "Jueves", open: "09:00", close: "18:00" },
      { day: 5, label: "Viernes", open: "09:00", close: "18:00" },
      { day: 6, label: "Sábado", open: "09:00", close: "18:30" },
      { day: 0, label: "Domingo", open: "10:00", close: "15:00" },
    ],
  };
}
