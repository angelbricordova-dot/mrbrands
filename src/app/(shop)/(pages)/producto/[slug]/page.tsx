import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BuyBox } from "@/components/shop/buy-box";
import { getCatalog, getCatalogProduct, getShopSettings } from "@/lib/catalog";
import { to12h, usd } from "@/lib/format";
import { CATEGORIES } from "@/lib/types";

export async function generateStaticParams() {
  const catalog = await getCatalog();
  return catalog.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/producto/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCatalogProduct(slug);
  if (!product) return { title: "Producto" };
  return {
    title: `${product.name} · ${usd(product.price)}`,
    description: product.description,
    openGraph: { images: product.images.slice(0, 1) },
  };
}

async function Product({ params }: { params: PageProps<"/producto/[slug]">["params"] }) {
  const { slug } = await params;
  const [product, settings, catalog] = await Promise.all([getCatalogProduct(slug), getShopSettings(), getCatalog()]);
  if (!product) notFound();

  const category = CATEGORIES.find((c) => c.id === product.category);
  const related = catalog
    .filter((p) => p.id !== product.id && (p.category === product.category || p.brand === product.brand))
    .slice(0, 4);
  const minFee = Math.min(...settings.deliveryZones.map((z) => z.fee));
  const saturday = settings.hours.find((h) => h.day === 6);

  return (
    <>
      <article className="pdp">
        <div className="pdp__gallery">
          {product.images.map((src, i) => (
            <figure key={src}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={i === 0 ? product.name : `${product.name}, otra vista`} width={960} height={1200} loading={i === 0 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : "auto"} />
            </figure>
          ))}
        </div>
        <div className="pdp__info">
          <nav className="pdp__crumbs" aria-label="Ruta">
            <Link href="/tienda" className="link">
              Tienda
            </Link>
            <span aria-hidden>/</span>
            <Link href={`/tienda?c=${product.category}`} className="link">
              {category?.label}
            </Link>
          </nav>
          <p className="pdp__brand">{product.brand}</p>
          <h1 className="pdp__name">{product.name}</h1>
          <BuyBox product={product} rate={settings.bcvRate} cashea={settings.cashea} />
          <p className="pdp__desc">{product.description}</p>
          <dl className="pdp__facts">
            <div>
              <dt>En Maracay</dt>
              <dd>Delivery desde {usd(minFee)} según tu zona.</dd>
            </div>
            <div>
              <dt>Resto del país</dt>
              <dd>Por {settings.couriers.join(", ")}. Cobro a destino.</dd>
            </div>
            <div>
              <dt>En la tienda</dt>
              <dd>
                Retiro gratis en {settings.address}
                {saturday && !saturday.closed ? `, también sábados hasta las ${to12h(saturday.close)}` : ""}.
              </dd>
            </div>
          </dl>
        </div>
      </article>
      {related.length > 0 && (
        <section className="related" aria-labelledby="related-title">
          <h2 id="related-title">Va con esto</h2>
          <div className="related__row">
            {related.map((p) => (
              <Link key={p.id} href={`/producto/${p.slug}`} className="tile" data-reveal>
                <div className="tile__media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.images[0]} alt={p.name} width={720} height={900} loading="lazy" />
                </div>
                <div className="tile__meta">
                  <span className="tile__name">{p.name}</span>
                  <span className="tile__price">{usd(p.price)}</span>
                  <span className="tile__brand">{p.brand}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default function ProductPage(props: PageProps<"/producto/[slug]">) {
  return (
    <Suspense fallback={<div className="pdp" style={{ minHeight: "80svh" }} aria-busy="true" />}>
      <Product params={props.params} />
    </Suspense>
  );
}
