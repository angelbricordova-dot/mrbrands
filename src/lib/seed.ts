import type { Product, Settings } from "./types";

const CLOTHING = ["S", "M", "L", "XL"];
const WAIST = ["28", "30", "32", "34", "36"];

function sized(sizes: string[], stock: number[]) {
  return sizes.map((size, i) => ({ size, stock: stock[i % stock.length] }));
}

type SeedProduct = Omit<Product, "id" | "createdAt" | "sort" | "active">;

const art = (name: string) => `/illus/p/${name}.svg`;

// Mock-up catalogue: every garment is an original vector illustration (scripts/illustrations).
const seed: SeedProduct[] = [
  {
    slug: "jersey-topo-rojo",
    name: "Jersey Topo Rojo",
    brand: "Brand World",
    category: "franelas",
    price: 30,
    description: "Jersey de cuello en V con estampado topográfico, MARACAY al pecho y el 07 en contorno. Tela fresca, corte oversize.",
    images: [art("jersey-topo-rojo")],
    variants: sized(CLOTHING, [4, 6, 5, 2]),
    featured: true,
  },
  {
    slug: "jersey-siete-blanco",
    name: "Jersey Siete Blanco",
    brand: "Brand World",
    category: "franelas",
    price: 30,
    description: "Jersey blanco con el 7 de tres líneas en la espalda, CASA DEL FLOW arriba y las tres estrellas rojas.",
    images: [art("jersey-siete-blanco")],
    variants: sized(CLOTHING, [3, 5, 4, 1]),
    featured: true,
  },
  {
    slug: "franela-jungla-de-concreto",
    name: "Franela Jungla de Concreto",
    brand: "Mr.Brands",
    category: "franelas",
    price: 28,
    description: "Franela negra de algodón pesado. Al frente, el Mr.B pequeño; en la espalda, la ciudad al atardecer y JUNGLA DE CONCRETO.",
    images: [art("franela-jungla-negra"), art("franela-jungla-negra-frente")],
    variants: sized(CLOTHING, [5, 7, 6, 3]),
    featured: true,
  },
  {
    slug: "franela-blank-page",
    name: "Franela Blank Page",
    brand: "about:blank",
    category: "franelas",
    price: 25,
    description: "Franela blanca de hombro caído con escudo y letras en azul rey. Cuello firme que no se deforma.",
    images: [art("franela-blank-azul")],
    variants: sized(CLOTHING, [5, 6, 6, 3]),
    featured: false,
  },
  {
    slug: "hoodie-carpe-diem",
    name: "Hoodie Carpe Diem",
    brand: "Carpediem",
    category: "hoodies",
    price: 45,
    description: "Hoodie color café con CARPE DIEM en crema, bolsillo canguro y puños de rib. Felpa por dentro.",
    images: [art("hoodie-carpe-marron")],
    variants: sized(CLOTHING, [2, 4, 4, 2]),
    featured: true,
  },
  {
    slug: "mono-odyssea-crema",
    name: "Mono Odyssea Crema",
    brand: "Odyssea",
    category: "pantalones",
    price: 35,
    description: "Mono de felpa color crema, pierna ancha y firma Odyssea bordada en la pierna.",
    images: [art("mono-odyssea-crema")],
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
    images: [art("mono-odyssea-negro")],
    variants: sized(CLOTHING, [2, 5, 4, 2]),
    featured: false,
  },
  {
    slug: "cargo-baggy-arena",
    name: "Cargo Baggy Arena",
    brand: "Mr.Brands",
    category: "pantalones",
    price: 40,
    description: "Pantalón cargo baggy color arena con bolsillos laterales de fuelle y cordón en la cintura.",
    images: [art("cargo-baggy-arena")],
    variants: sized(WAIST, [2, 4, 5, 3, 1]),
    featured: false,
  },
  {
    slug: "jort-tinta",
    name: "Jort Tinta",
    brand: "Carpediem",
    category: "shorts",
    price: 35,
    description: "Jort de denim claro con trazos de tinta a mano, ruedo deshilachado y caída baggy hasta la rodilla.",
    images: [art("jort-tinta")],
    variants: sized(WAIST, [2, 4, 5, 3, 1]),
    featured: true,
  },
  {
    slug: "jort-indigo",
    name: "Jort Índigo",
    brand: "Carpediem",
    category: "shorts",
    price: 32,
    description: "Jort índigo oscuro con costuras cobre, botón de metal y ruedo deshilachado.",
    images: [art("jort-indigo")],
    variants: sized(WAIST, [1, 3, 4, 3, 2]),
    featured: false,
  },
  ...(
    [
      ["gorra-five-panel-camo", "Gorra Five Panel Camo", "Carpediem", "gorra-camo", true, "Five panel camuflada con el infinito bordado en blanco. Visera plana, correa ajustable."],
      ["gorra-five-panel-arena", "Gorra Five Panel Arena", "Carpediem", "gorra-beige", false, "Five panel color arena con el infinito bordado en negro. Visera plana, correa ajustable."],
      ["gorra-five-panel-firma", "Gorra Five Panel Firma", "Carpediem", "gorra-firma-negra", true, "Five panel negra con la firma bordada en blanco. Visera plana, correa ajustable."],
      ["gorra-flow-roja", "Gorra Flow Roja", "Bars", "gorra-flow-roja", true, "Gorra de seis paneles y visera curva con Flow bordado en letra cursiva. Correa ajustable."],
    ] as const
  ).map(
    ([slug, name, brand, img, featured, description]): SeedProduct => ({
      slug,
      name,
      brand,
      category: "gorras",
      price: 25,
      description,
      images: [art(img)],
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
