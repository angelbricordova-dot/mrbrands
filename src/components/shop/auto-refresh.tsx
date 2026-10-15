"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-reads the server page every few seconds while the tab is visible, so a status change shows up by itself. */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
