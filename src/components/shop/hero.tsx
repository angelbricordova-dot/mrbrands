"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export type HeroShot = { src: string; alt: string; ground: string; name: string; price: string; href: string };

const TITLE = "BRANDS";

function Title({ inset = false }: { inset?: boolean }) {
  return (
    <p className={`hero__title ${inset ? "hero__title--inset" : ""}`} aria-hidden>
      {TITLE.split("").map((ch, i) => (
        <span key={i} data-letter style={{ "--i": i } as CSSProperties}>
          {ch}
        </span>
      ))}
    </p>
  );
}

/**
 * The station name board: BRANDS stays pinned while the outfits underneath change with the scroll.
 * Each outfit brings its own ground colour. Without script the first outfit simply stays.
 */
export function Hero({ shots, corners }: { shots: HeroShot[]; corners: { tl: ReactNode; tr: ReactNode; bl: ReactNode; br: ReactNode } }) {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const travel = el.offsetHeight - window.innerHeight;
      const p = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
      setProgress(p);
      setActive(Math.min(shots.length - 1, Math.floor(p * shots.length * 0.999)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [shots.length]);

  const shot = shots[active];
  return (
    <section
      ref={ref}
      className="hero"
      style={{ "--ground": shot.ground, "--steps": shots.length - 1 } as CSSProperties}
      aria-label="Mr.Brands"
    >
      <div className="hero__stage">
        <div className="hero__corner hero__corner--tl">{corners.tl}</div>
        <div className="hero__corner hero__corner--tr">{corners.tr}</div>
        <h1 className="sr-only">Mr.Brands, casa del flow en Maracay</h1>
        <Title />
        <div className="hero__frame">
          {shots.map((s, i) => (
            <div key={s.src} className={`hero__shot ${i === active ? "is-on" : i < active ? "is-past" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.src}
                alt={s.alt}
                width={720}
                height={1080}
                fetchPriority={i === 0 ? "high" : "low"}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
              />
            </div>
          ))}
          <div className="hero__scrim" />
          <div className="hero__scrim hero__scrim--foot" />
          <Title inset />
          <Link href={shot.href} className="hero__caption">
            <span className="hero__caption-name">
              {shot.name} · {shot.price} →
            </span>
          </Link>
          <div className="hero__progress" aria-hidden>
            <span style={{ "--p": progress } as CSSProperties} />
          </div>
        </div>
        <div className="hero__corner hero__corner--bl">{corners.bl}</div>
        <div className="hero__corner hero__corner--br">{corners.br}</div>
      </div>
    </section>
  );
}
