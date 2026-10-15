import { BagDrawer } from "@/components/shop/bag";
import { CartProvider } from "@/components/shop/cart";
import { SiteFooter } from "@/components/shop/footer";
import { RevealObserver } from "@/components/shop/reveal";
import { getShopSettings } from "@/lib/catalog";

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const settings = await getShopSettings();
  return (
    <CartProvider>
      <div className="site-main">{children}</div>
      <SiteFooter settings={settings} />
      <BagDrawer rate={settings.bcvRate} />
      <RevealObserver />
    </CartProvider>
  );
}
