import Link from "next/link";

export function Wordmark({ className = "", href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={`wordmark ${className}`} aria-label="Mr.Brands, inicio">
      <span className="wordmark__mr" aria-hidden>
        Mr.
      </span>
      <span aria-hidden>BRANDS</span>
    </Link>
  );
}
