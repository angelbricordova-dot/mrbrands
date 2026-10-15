import { SiteBar } from "@/components/shop/site-bar";
import { getShopSettings } from "@/lib/catalog";

export default async function PagesLayout({ children }: LayoutProps<"/">) {
  const settings = await getShopSettings();
  return (
    <>
      <SiteBar settings={settings} />
      <main>{children}</main>
    </>
  );
}
