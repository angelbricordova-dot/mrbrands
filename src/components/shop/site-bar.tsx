import Link from "next/link";
import type { Settings } from "@/lib/types";
import { BagButton } from "./bag";
import { OpenStatus } from "./open-status";
import { Wordmark } from "./wordmark";

export function SiteBar({ settings }: { settings: Settings }) {
  return (
    <header className="bar">
      <Wordmark className="bar__brand" />
      <nav className="bar__nav" aria-label="Principal">
        <OpenStatus hours={settings.hours} className="bar__status" />
        <Link href="/tienda" className="link">
          Tienda
        </Link>
        <Link href="/#como-pedir" className="link hide-sm">
          Cómo pedir
        </Link>
        <BagButton />
      </nav>
    </header>
  );
}
