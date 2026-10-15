import type { Metadata, Viewport } from "next";
import { Epilogue, Mr_Dafoe } from "next/font/google";
import "./globals.css";

const epilogue = Epilogue({ variable: "--font-epilogue", subsets: ["latin"], display: "swap" });
const script = Mr_Dafoe({ variable: "--font-script-face", subsets: ["latin"], weight: "400", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://mrbrands.vercel.app"),
  title: { default: "Mr.Brands — Casa del flow en Maracay", template: "%s · Mr.Brands" },
  description:
    "Tienda multimarca de ropa urbana en el CC Estación Central, Maracay. Pide en línea: delivery en Maracay, envío a toda Venezuela o retiro en tienda.",
  openGraph: { locale: "es_VE", siteName: "Mr.Brands", images: ["/img/p/brandworld-roja.webp"] },
};

export const viewport: Viewport = {
  themeColor: "#9c1823",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${epilogue.variable} ${script.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
