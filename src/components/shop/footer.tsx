import Link from "next/link";
import { prettyPhone, to12h, waLink } from "@/lib/format";
import type { Settings } from "@/lib/types";

export function SiteFooter({ settings }: { settings: Settings }) {
  const days = [...settings.hours].sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7));
  const weekday = days.filter((d) => d.day >= 1 && d.day <= 5);
  const sameWeek = weekday.every((d) => d.open === weekday[0].open && d.close === weekday[0].close && !d.closed);
  return (
    <footer className="footer">
      <div className="footer__cols">
        <div className="footer__col">
          <span>Dónde estamos</span>
          <span>{settings.address}</span>
          <a href={settings.mapsUrl} target="_blank" rel="noreferrer">
            Abrir en el mapa ↗
          </a>
        </div>
        <div className="footer__col">
          <span>Tienda</span>
          <Link href="/tienda">Todo el catálogo</Link>
          <Link href="/#como-pedir">Cómo pedir</Link>
          <Link href="/#historia">Nuestra historia</Link>
          <Link href="/admin">Entrar al panel</Link>
        </div>
        <div className="footer__col">
          <span>Redes</span>
          <a href={`https://www.instagram.com/${settings.instagram}`} target="_blank" rel="noreferrer">
            Instagram @{settings.instagram}
          </a>
          <a href={`https://www.tiktok.com/@${settings.tiktok}`} target="_blank" rel="noreferrer">
            TikTok @{settings.tiktok}
          </a>
          <a href={waLink(settings.whatsapp, "¡Hola Mr.Brands!")} target="_blank" rel="noreferrer">
            WhatsApp {prettyPhone(settings.whatsapp)}
          </a>
        </div>
        <div className="footer__col">
          <span>Horario</span>
          {sameWeek ? (
            <span>
              Lunes a viernes, {to12h(weekday[0].open)} a {to12h(weekday[0].close)}
            </span>
          ) : (
            weekday.map((d) => (
              <span key={d.day}>
                {d.label}: {d.closed ? "cerrado" : `${to12h(d.open)} a ${to12h(d.close)}`}
              </span>
            ))
          )}
          {days
            .filter((d) => d.day === 6 || d.day === 0)
            .map((d) => (
              <span key={d.day}>
                {d.label}, {d.closed ? "cerrado" : `${to12h(d.open)} a ${to12h(d.close)}`}
              </span>
            ))}
        </div>
      </div>
      <div />
      <div className="footer__mark" aria-hidden>
        <span className="footer__mr">Mr.</span>BRANDS
      </div>
      <div className="footer__legal">
        <span>Mr.Brands · Tienda multimarca · Maracay, Venezuela</span>
        <span>Precios en dólares a tasa BCV del día</span>
      </div>
    </footer>
  );
}
