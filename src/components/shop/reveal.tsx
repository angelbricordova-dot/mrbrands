"use client";

import { useEffect } from "react";

const SELECTOR = "[data-reveal]:not([data-in]), .lines:not([data-in]), .story__item:not([data-in])";

/**
 * Marks every [data-reveal] element (and `.lines` blocks) with data-in once its top has risen above
 * 88% of the viewport. Checking position on scroll, instead of waiting for an "entered" event, also
 * reveals whatever a jump (an anchor link, a fast fling) carried past the viewport.
 * A data attribute, not a class, so React re-renders never wipe it.
 * Content is only hidden under html.js, so nothing stays invisible if this never runs.
 */
export function RevealObserver() {
  useEffect(() => {
    let pending: HTMLElement[] = [];
    let frame = 0;

    const check = () => {
      frame = 0;
      const line = window.innerHeight * 0.88;
      pending = pending.filter((el) => {
        if (!el.isConnected) return false;
        if (el.getBoundingClientRect().top < line) {
          el.dataset.in = "";
          return false;
        }
        return true;
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    const scan = () => {
      const known = new Set(pending);
      document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => !known.has(el) && pending.push(el));
      schedule();
    };

    const mo = new MutationObserver(scan);
    // Start once the browser is idle, so React has finished hydrating before any attribute is added.
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(
      () => {
        scan();
        mo.observe(document.body, { childList: true, subtree: true });
      },
      { timeout: 600 },
    );
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancel(handle);
      cancelAnimationFrame(frame);
      mo.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);
  return null;
}
