"use client";

import { useEffect } from "react";

/**
 * Marks every [data-reveal] element (and `.lines` blocks) with data-in the first time it enters the viewport.
 * A data attribute, not a class, so React re-renders never wipe it.
 * Content is only hidden under html.js, so nothing stays invisible if this never runs.
 */
export function RevealObserver() {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll<HTMLElement>("[data-reveal], .lines").forEach((el) => (el.dataset.in = ""));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.in = "";
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );
    const scan = () =>
      document.querySelectorAll("[data-reveal]:not([data-in]), .lines:not([data-in]), .story__item:not([data-in])").forEach((el) => io.observe(el));
    const mo = new MutationObserver(scan);
    // Start once the browser is idle, so React has finished hydrating before any attribute is added.
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => {
      scan();
      mo.observe(document.body, { childList: true, subtree: true });
    }, { timeout: 600 });
    return () => {
      cancel(handle);
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return null;
}
