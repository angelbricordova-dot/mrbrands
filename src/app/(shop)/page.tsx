import Link from "next/link";
import type { CSSProperties } from "react";
import { BagButton } from "@/components/shop/bag";
import { DepartureBoard, type BoardRow } from "@/components/shop/board";
import { Hero, type HeroShot } from "@/components/shop/hero";
import { OpenStatus, TodayMarker } from "@/components/shop/open-status";
import { Wordmark } from "@/components/shop/wordmark";
import { getCatalog, getShopSettings } from "@/lib/catalog";
import { prettyPhone, to12h, usd, waLink } from "@/lib/format";
import { CATEGORIES } from "@/lib/types";

const HERO: { slug: string; ground: string; alt: string }[] = [
  { slug: "camiseta-brand-world-roja", ground: "#d2c7c4", alt: "Chico con pasamontañas y la camiseta roja de Brand World, sentado contra una pared de concreto" },
  { slug: "mono-odyssea-negro", ground: "#d8d4cd", alt: "Mono Odyssea negro de pierna ancha con franela sin mangas, en la tienda" },
  { slug: "gorra-bars-roja", ground: "#d7cecb", alt: "Gorra roja Bars puesta, frente a una pared de concreto" },
  { slug: "camiseta-brand-world-blanca", ground: "#c9c7c3", alt: "Espalda de la camiseta blanca B.WORLD con el 7 gigante" },
];

const STORY = [
  { img: "serigrafia", name: "La serigrafía", role: "Donde empezó", text: "Nuestra historia como emprendedores arrancó entre máquinas de coser y pulpos de serigrafía, color por color." },
  { img: "corte", name: "El corte", role: "Patrón, tela y tijera", text: "Nada es de un día para otro. Cada prenda pasó por una mesa de corte antes de llegar a un gancho." },
  { img: "tienda-llena", name: "La tienda", role: "CC Estación Central", text: "Un local propio en Maracay con Carpediem, Brand World, Odyssea, about:blank y Bars, y gente que sabe de tallas." },
  { img: "calle-maracay", name: "La calle", role: "Maracay", text: "También salimos a regalar ropa oversize por las calles de la ciudad. Así se gobierna la jungla de concreto." },
];

function rateDate(iso: string) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("es-VE", { day: "numeric", month: "long", timeZone: "America/Caracas" }).format(new Date(iso));
}

export default async function Home() {
  const [catalog, settings] = await Promise.all([getCatalog(), getShopSettings()]);
  const bySlug = new Map(catalog.map((p) => [p.slug, p]));

  const shots: HeroShot[] = HERO.flatMap((h) => {
    const p = bySlug.get(h.slug);
    return p ? [{ src: p.images[0], alt: h.alt, ground: h.ground, name: p.name, price: usd(p.price), href: `/producto/${p.slug}` }] : [];
  });
  if (shots.length === 0 && catalog[0]) {
    const p = catalog[0];
    shots.push({ src: p.images[0], alt: p.name, ground: "#d8d4cd", name: p.name, price: usd(p.price), href: `/producto/${p.slug}` });
  }

  const groups = CATEGORIES.map((c) => ({
    kind: c.label,
    rows: catalog
      .filter((p) => p.category === c.id)
      .map(
        (p): BoardRow => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          brand: p.brand,
          kind: c.label,
          price: p.price,
          left: p.variants.reduce((n, v) => n + v.stock, 0),
          image: p.images[0],
        }),
      ),
  })).filter((g) => g.rows.length > 0);

  const minFee = Math.min(...settings.deliveryZones.map((z) => z.fee));
  const hours = [...settings.hours].sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7));

  return (
    <>
      <Hero
        shots={shots}
        corners={{
          tl: <Wordmark />,
          tr: (
            <>
              <OpenStatus hours={settings.hours} className="hide-sm" />
              <Link href="/tienda" className="link">
                Tienda
              </Link>
              <a href="#como-pedir" className="link hide-sm">
                Cómo pedir
              </a>
              <BagButton />
            </>
          ),
          bl: <p>Tienda multimarca de ropa urbana en el CC Estación Central, Maracay. Pide aquí y te llega hoy, o a toda Venezuela.</p>,
          br: (
            <Link href="/tienda" className="button">
              Ver la tienda <span className="arrow">→</span>
            </Link>
          ),
        }}
      />

      {/* Showcase — the brands of the house, as one folded band */}
      <section className="section" aria-labelledby="marcas" style={{ paddingTop: "var(--section)" }}>
        <div className="grid wrap">
          <h2 id="marcas" className="showcase__head lines">
            <span className="line">
              <span data-line>Las marcas de la casa</span>
            </span>
          </h2>
        </div>
        <div className="band" data-reveal="shutter">
          <Link href="/tienda?c=gorras" className="band__panel" style={{ "--grow": 5, "--k": 0 } as CSSProperties}>
            <video src="/media/gorras.mp4" poster="/media/gorras.webp" autoPlay muted loop playsInline preload="metadata" aria-label="Probándose las gorras five panel de Carpediem y las Bars" />
            <span className="band__corner" />
            <span className="band__title">Gorras con flow</span>
            <span className="band__foot" />
            <span className="band__label">Carpediem y Bars, a {usd(25)}</span>
          </Link>
          <Link href="/tienda?marca=Brand%20World" className="band__panel" style={{ "--grow": 2, "--k": 1 } as CSSProperties}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/p/brandworld-blanca.webp" alt="Espalda de la camiseta B.WORLD" width={960} height={1200} loading="lazy" />
            <span className="band__foot" />
            <span className="band__label">Brand World</span>
          </Link>
          <Link href="/tienda?marca=Odyssea" className="band__panel" style={{ "--grow": 3, "--k": 2 } as CSSProperties}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/p/odyssea-crema.webp" alt="Mono Odyssea crema" width={720} height={900} loading="lazy" />
            <span className="band__foot" />
            <span className="band__label">Odyssea</span>
          </Link>
          <Link href="/tienda?marca=about%3Ablank" className="band__panel" style={{ "--grow": 2, "--k": 3 } as CSSProperties}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/p/aboutblank-blanca.webp" alt="Franela about:blank" width={960} height={1200} loading="lazy" />
            <span className="band__foot" />
            <span className="band__label">about:blank</span>
          </Link>
        </div>
        <p className="wrap band__caption" data-reveal>
          Multimarca de verdad: toca una marca y ves todo lo que hay de ella hoy en la tienda.
        </p>
      </section>

      {/* The departures board */}
      <section className="section wrap" aria-labelledby="salidas" style={{ paddingTop: "var(--section)" }}>
        <div className="grid">
          <h2 id="salidas" className="board__head lines">
            <span className="line indent">
              <span data-line style={{ "--i": 0 } as CSSProperties}>
                Hoy sale de
              </span>
            </span>
            <span className="line">
              <span data-line style={{ "--i": 1 } as CSSProperties}>
                Estación Central
              </span>
            </span>
          </h2>
        </div>
        <DepartureBoard groups={groups} rate={settings.bcvRate} rateDate={rateDate(settings.bcvUpdatedAt)} />
      </section>

      {/* How to order — a staircase */}
      <section id="como-pedir" className="section wrap" aria-label="Cómo pedir" style={{ paddingBlock: "var(--section)" }}>
        <ol className="stairs">
          {[
            { line: "Primero, tu talla.", note: <>Lo que ves aquí está en la tienda hoy. Si de una talla quedan pocas, te lo decimos antes de pagar.</> },
            { line: "Luego pagas como quieras.", note: <>Pago móvil, Zelle, Binance, efectivo en dólares o <strong>Cashea en cuotas</strong>. Todo a tasa BCV.</> },
            { line: "En Maracay te lo llevamos.", note: <>Delivery desde <strong>{usd(minFee)}</strong> según tu zona, o lo retiras gratis en Estación Central.</> },
            { line: "Y si no, a toda Venezuela.", note: <>Despachamos por {settings.couriers.join(", ").replace(/, ([^,]*)$/, " o $1")}. {settings.nationalNote}</> },
          ].map((s, i) => (
            <li key={s.line} className="stairs__step" style={{ "--from": i + 1, "--k": i } as CSSProperties}>
              <h3 className="stairs__line lines">
                <span className="line">
                  <span data-line>{s.line}</span>
                </span>
              </h3>
              <p className="stairs__note" data-reveal style={{ "--i": 2 } as CSSProperties}>
                {s.note}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Story — the title holds on the red field while the workshop passes */}
      <section id="historia" className="story" aria-labelledby="historia-titulo">
        <div className="story__pin">
          <h2 id="historia-titulo" className="story__title">
            Paso a paso
          </h2>
          <p className="story__intro">Nada es de un día para otro. Así llegamos a Estación Central.</p>
        </div>
        <div className="story__items">
          {STORY.map((s) => (
            <figure key={s.img} className="story__item">
              <div className="story__photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/img/story/${s.img}.webp`} alt={s.name} width={720} height={900} loading="lazy" />
              </div>
              <figcaption>
                <p className="story__name">{s.name}</p>
                <p className="story__role">{s.role}</p>
                <p className="story__text">{s.text}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Contact — the WhatsApp number as display type */}
      <section className="contact" aria-label="Contacto">
        <p className="contact__lead">Escríbenos para apartar una prenda, preguntar tallas o cuadrar tu delivery.</p>
        <a className="contact__number" href={waLink(settings.whatsapp, "¡Hola Mr.Brands! Quiero hacer un pedido")} target="_blank" rel="noreferrer">
          {prettyPhone(settings.whatsapp)} <span className="arrow">↗</span>
        </a>
        <div className="contact__hours" aria-label="Horario">
          {hours.map((d) => (
            <div key={d.day} data-day={d.day}>
              <span>{d.label}</span>
              <span className="nums">{d.closed ? "Cerrado" : `${to12h(d.open)} – ${to12h(d.close)}`}</span>
            </div>
          ))}
          <TodayMarker hours={settings.hours} />
        </div>
        <div className="contact__foot" style={{ marginTop: "2rem" }}>
          <span>
            {settings.address} ·{" "}
            <a href={settings.mapsUrl} target="_blank" rel="noreferrer">
              Cómo llegar ↗
            </a>
          </span>
          <ul>
            <li>
              <a href={`https://www.instagram.com/${settings.instagram}`} target="_blank" rel="noreferrer">
                Instagram
              </a>
            </li>
            <li>
              <a href={`https://www.tiktok.com/@${settings.tiktok}`} target="_blank" rel="noreferrer">
                TikTok
              </a>
            </li>
            <li>
              <a href="https://linktr.ee/mrbrandsvee" target="_blank" rel="noreferrer">
                Linktree
              </a>
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}
